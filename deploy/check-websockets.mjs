import assert from 'node:assert/strict';
import WebSocket from 'ws';

// Exercise the real production server using only the synthetic CI session.
export async function checkWebSockets({ base, sessionId, trainerToken, deviceToken }) {
  assert.equal(base, 'http://127.0.0.1:5000');
  const sockets = new Set();
  let checks = 0;
  const check = condition => { assert.ok(condition); checks++; };
  async function ticket(kind) {
    const trainer = kind === 'trainer';
    const path = trainer ? '/api/trainer/sessions/' + sessionId + '/ws-ticket' : '/api/teams/ws-ticket';
    const response = await fetch(base + path, { method: 'POST', headers: trainer ? { Authorization: 'Bearer ' + trainerToken } : { 'X-Device-Token': deviceToken } });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(typeof body.ticket, 'string');
    return body.ticket;
  }
  function connect(path, origin = base) {
    const socket = new WebSocket(base.replace('http:', 'ws:') + path, { origin, handshakeTimeout: 5000 });
    sockets.add(socket);
    const messages = [];
    socket.on('message', bytes => messages.push(JSON.parse(bytes.toString())));
    socket.on('error', () => {}); // Expected denials are asserted below.
    const closed = new Promise(resolve => socket.once('close', (code, reason) => resolve({ code, reason: reason.toString() })));
    return { socket, messages, closed };
  }
  async function bounded(promise) {
    let timer;
    try { return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(Error('WebSocket check timed out')), 5000); })]); }
    finally { clearTimeout(timer); }
  }
  async function message(peer, type) {
    for (let n = 0; n < 100; n++) {
      const index = peer.messages.findIndex(value => value.type === type);
      if (index >= 0) return peer.messages.splice(index, 1)[0];
      if (peer.socket.readyState === WebSocket.CLOSED) throw Error('Closed before ' + type);
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    throw Error('Missing WebSocket event ' + type);
  }
  async function ping(peer) {
    peer.socket.send(JSON.stringify({ type: 'ping' }));
    check((await message(peer, 'pong')).type === 'pong');
    const pong = bounded(new Promise(resolve => peer.socket.once('pong', bytes => resolve(bytes.toString()))));
    peer.socket.ping('synthetic-control-ping');
    check(await pong === 'synthetic-control-ping');
  }
  async function close(peer) { peer.socket.close(); await bounded(peer.closed); }
  try {
    const firstTicket = await ticket('trainer');
    const trainer = connect('/ws/trainer?ticket=' + firstTicket);
    const initialState = (await message(trainer, 'session.state_update')).payload;
    check(initialState.sessionId === sessionId);
    await ping(trainer);
    await close(trainer);
    const replay = connect('/ws/trainer?ticket=' + firstTicket);
    check((await bounded(replay.closed)).code === 4401);
    const trainerAgain = connect('/ws/trainer?ticket=' + await ticket('trainer'));
    check((await message(trainerAgain, 'session.state_update')).payload.sessionId === sessionId);
    await ping(trainerAgain);
    const team = connect('/ws/team?ticket=' + await ticket('team'));
    check(!!(await message(team, 'game.state_sync')).payload.team.id);
    check((await message(team, 'game.timer_event')).payload.status === initialState.status);
    await ping(team);
    const teamAgain = connect('/ws/team?ticket=' + await ticket('team'));
    check(!!(await message(teamAgain, 'game.state_sync')).payload.team.id);
    check((await bounded(team.closed)).code === 4000);
    await ping(teamAgain);
    const missing = connect('/ws/team');
    check((await bounded(missing.closed)).code === 4400);
    const wrongKind = connect('/ws/trainer?ticket=' + await ticket('team'));
    check((await bounded(wrongKind.closed)).code === 4401);
    const forbidden = connect('/ws/trainer', 'https://untrusted.example.invalid');
    const denied = bounded(new Promise(resolve => forbidden.socket.once('unexpected-response', (_req, response) => {
      response.resume(); resolve(response.statusCode); forbidden.socket.terminate();
    })));
    check(await denied === 403);
    await close(teamAgain);
    await close(trainerAgain);
    console.log(JSON.stringify({ syntheticWebSocketChecks: checks, trainerAndTeam: true, reconnect: true, oneTimeTickets: true, originDenied: true, jsonAndControlPingPong: true }));
  } finally {
    for (const socket of sockets) if (socket.readyState !== WebSocket.CLOSED) socket.terminate();
  }
}
