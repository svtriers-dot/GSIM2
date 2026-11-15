// Real HTTP middleware, only against a localhost app and disposable CI database.
import assert from 'node:assert/strict';
import { networkInterfaces } from 'node:os';

const profile = "gsim";
const policies = [
  {
    "name": "login",
    "path": "/api/trainer/auth/login",
    "limit": 5,
    "window": 900,
    "allowed": 400,
    "method": "POST",
    "error": "rate_limit_exceeded"
  },
  {
    "name": "register",
    "path": "/api/trainer/auth/register",
    "limit": 3,
    "window": 3600,
    "allowed": 400,
    "method": "POST",
    "error": "rate_limit_exceeded"
  },
  {
    "name": "code-check",
    "path": "/api/teams/check?code=invalid",
    "limit": 30,
    "window": 60,
    "allowed": 400,
    "method": "GET",
    "error": "rate_limit_exceeded"
  },
  {
    "name": "team-join",
    "path": "/api/teams/join",
    "limit": 10,
    "window": 60,
    "allowed": 400,
    "method": "POST",
    "error": "rate_limit_exceeded"
  },
  {
    "name": "admin-reset",
    "path": "/api/admin/trainers/00000000-0000-0000-0000-000000000000/reset-password",
    "limit": 20,
    "window": 3600,
    "allowed": 401,
    "method": "POST",
    "error": "rate_limit_exceeded"
  },
  {
    "name": "certificate-verify",
    "path": "/api/verify/invalid!",
    "limit": 60,
    "window": 60,
    "allowed": 400,
    "method": "GET",
    "error": "rate_limit_exceeded"
  }
];

export async function verifyRateLimits(base) {
  const database = new URL(process.env.DATABASE_URL || 'http://missing');
  assert.ok(['localhost', '127.0.0.1'].includes(database.hostname));
  assert.equal(database.pathname, profile === 'gsim' ? '/gsim_ci' : '/ai_registry');
  assert.equal(base, profile === 'gsim' ? 'http://127.0.0.1:5000' : 'http://127.0.0.1:5002');
  let httpRequests = 0;
  const results = [];
  async function request(policy, forwarded, origin = base) {
    httpRequests++;
    const response = await fetch(origin + policy.path, {
      method: policy.method || 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': forwarded },
      ...(policy.method === 'GET' ? {} : { body: '{}' }),
      signal: AbortSignal.timeout(5000),
    });
    const body = await response.text();
    return { status: response.status, headers: response.headers, body };
  }
  function blocked(response, policy) {
    assert.equal(response.status, 429, policy.name);
    const retry = Number(response.headers.get('retry-after'));
    assert.ok(retry > 0 && retry <= policy.window, policy.name + ' Retry-After');
    assert.equal(Number(response.headers.get('ratelimit-limit') || response.headers.get('x-ratelimit-limit')), policy.limit);
    assert.equal(Number(response.headers.get('ratelimit-remaining') || response.headers.get('x-ratelimit-remaining')), 0);
    if (policy.error) assert.equal(JSON.parse(response.body).error, policy.error);
    else assert.match(response.body, /Too many requests/);
  }
  for (let index = 0; index < policies.length; index++) {
    const policy = policies[index];
    const ip = '198.51.100.' + (20 + index);
    for (let n = 0; n < policy.limit; n++) assert.equal((await request(policy, ip)).status, policy.allowed, policy.name + ' request ' + (n + 1));
    blocked(await request(policy, ip), policy);
    assert.equal((await request(policy, '198.51.100.' + (40 + index))).status, policy.allowed, policy.name + ' separate client');
    results.push({ policy: policy.name, limit: policy.limit, windowSeconds: policy.window, rejectedAt: policy.limit + 1 });
  }
  const policy = policies[1];
  // A fake prefix must not override the rightmost untrusted peer appended by nginx.
  for (let n = 0; n < policy.limit; n++) assert.equal((await request(policy, '203.0.113.' + (n + 1) + ', 198.51.100.110')).status, policy.allowed);
  blocked(await request(policy, '203.0.113.250, 198.51.100.110'), policy);
  assert.equal((await request(policy, '203.0.113.250, 198.51.100.111')).status, policy.allowed);
  // IPv4, short mapped IPv6, and expanded mapped IPv6 must share a bucket.
  const mapped = ['198.51.100.120', '::ffff:c633:6478', '0:0:0:0:0:ffff:c633:6478'];
  for (let n = 0; n < policy.limit; n++) assert.equal((await request(policy, mapped[n % mapped.length])).status, policy.allowed);
  blocked(await request(policy, '::ffff:198.51.100.120'), policy);
  assert.equal((await request(policy, '198.51.100.121')).status, policy.allowed);
  // Textual aliases and address rotation within one /56 cannot renew the quota.
  const ipv6 = ['2001:db8:abcd:1201::1', '2001:db8:abcd:12ff::2', '2001:0db8:abcd:1201:0000:0000:0000:0001'];
  for (let n = 0; n < policy.limit; n++) assert.equal((await request(policy, ipv6[n % ipv6.length])).status, policy.allowed);
  blocked(await request(policy, '2001:db8:abcd:12aa::3'), policy);
  assert.equal((await request(policy, '2001:db8:abcd:1301::1')).status, policy.allowed);
  // No direct non-loopback listener may bypass HTTPS nginx.
  const local = Object.values(networkInterfaces()).flat().find(value => value && value.family === 'IPv4' && !value.internal && /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(value.address));
  assert.ok(local, 'A private local interface is required for the listener test');
  await assert.rejects(fetch('http://' + local.address + ':' + new URL(base).port + policy.path, { signal: AbortSignal.timeout(3000) }), error => error.cause?.code === 'ECONNREFUSED');
  const proof = { profile, httpRequests, policies: results, clientIsolation: true, spoofedPrefixIgnored: true, ipv4MappedAliasesShareQuota: true, ipv6Subnet56: true, nonLoopbackListenerClosed: true };
  console.log(JSON.stringify({ rateLimitIntegration: proof }));
  return proof;
}
