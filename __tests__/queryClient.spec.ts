import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { MutationObserver, QueryObserver } from "@tanstack/react-query";
import { apiRequest, getQueryFn, queryClient } from "../client/src/lib/queryClient";

const realFetch = globalThis.fetch;
beforeEach(() => queryClient.clear());
afterEach(() => { globalThis.fetch = realFetch; queryClient.clear(); });

// No requests leave this process. These are contracts of the actual app client.
test("query keys load JSON with the existing credentials policy", async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "/api/synthetic-list");
    assert.equal(options?.credentials, "include");
    return Response.json({ items: [{ id: "synthetic-one" }] });
  };
  assert.deepEqual(await queryClient.fetchQuery({ queryKey: ["/api", "synthetic-list"] }), { items: [{ id: "synthetic-one" }] });
});

test("parallel consumers share a single in-flight query", async () => {
  let requests = 0, deliver!: (response: Response) => void;
  globalThis.fetch = async () => { requests++; return new Promise(resolve => { deliver = resolve; }); };
  const first = queryClient.fetchQuery({ queryKey: ["/api/synthetic-dedup"] });
  const second = queryClient.fetchQuery({ queryKey: ["/api/synthetic-dedup"] });
  assert.equal(requests, 1);
  deliver(Response.json({ version: 1 }));
  assert.deepEqual(await Promise.all([first, second]), [{ version: 1 }, { version: 1 }]);
});

test("cached data is reused until explicitly invalidated", async () => {
  let requests = 0;
  globalThis.fetch = async () => Response.json({ version: ++requests });
  const options = { queryKey: ["/api/synthetic-cache"] };
  assert.deepEqual(await queryClient.fetchQuery(options), { version: 1 });
  assert.deepEqual(await queryClient.fetchQuery(options), { version: 1 });
  assert.equal(requests, 1);
  await queryClient.invalidateQueries(options);
  assert.deepEqual(await queryClient.fetchQuery(options), { version: 2 });
  assert.equal(requests, 2);
});

test("a failed query propagates the error without automatic retries", async () => {
  let requests = 0;
  globalThis.fetch = async () => { requests++; return new Response("Synthetic unavailable", { status: 503 }); };
  await assert.rejects(queryClient.fetchQuery({ queryKey: ["/api/synthetic-error"] }), /503: Synthetic unavailable/);
  assert.equal(requests, 1);
});

test("401 throws by default and returns null only for explicit returnNull", async () => {
  globalThis.fetch = async () => new Response("Synthetic unauthorized", { status: 401 });
  await assert.rejects(queryClient.fetchQuery({ queryKey: ["/api/synthetic-private"] }), /401:/);
  assert.equal(await queryClient.fetchQuery({ queryKey: ["/api/synthetic-optional"], queryFn: getQueryFn({ on401: "returnNull" }) }), null);
});

test("an active query updates its observer after invalidation", async () => {
  let version = 0;
  globalThis.fetch = async () => Response.json({ version: ++version });
  const options = { queryKey: ["/api/synthetic-observed"] };
  const observer = new QueryObserver(queryClient, options);
  const statuses: string[] = [], unsubscribe = observer.subscribe(result => statuses.push(result.status));
  try {
    await queryClient.fetchQuery(options);
    assert.deepEqual(observer.getCurrentResult().data, { version: 1 });
    await queryClient.invalidateQueries(options);
    assert.deepEqual(observer.getCurrentResult().data, { version: 2 });
    assert.ok(statuses.includes("pending"));
    assert.equal(observer.getCurrentResult().status, "success");
  } finally { unsubscribe(); }
});

test("apiRequest preserves JSON and credentials, and rejects HTTP errors", async () => {
  const body = { playerName: "Synthetic O'Connor", finalCash: 12000 };
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "/api/synthetic-save"); assert.equal(options?.method, "POST");
    assert.equal(options?.credentials, "include");
    assert.equal(new Headers(options?.headers).get("Content-Type"), "application/json");
    assert.deepEqual(JSON.parse(String(options?.body)), body);
    return Response.json({ id: "synthetic-result" });
  };
  assert.deepEqual(await (await apiRequest("POST", "/api/synthetic-save", body)).json(), { id: "synthetic-result" });
  globalThis.fetch = async () => new Response("Synthetic denied", { status: 403 });
  await assert.rejects(apiRequest("POST", "/api/synthetic-save", body), /403: Synthetic denied/);
});

test("a successful save sends once and invalidates the related active query", async () => {
  let reads = 0, writes = 0;
  globalThis.fetch = async (_url, options) => {
    if (options?.method === "POST") { writes++; return Response.json({ id: "synthetic-saved" }); }
    return Response.json({ version: ++reads });
  };
  const options = { queryKey: ["/api/synthetic-results"] };
  const query = new QueryObserver(queryClient, options), stopQuery = query.subscribe(() => {});
  const mutation = new MutationObserver(queryClient, {
    mutationFn: async (value: { playerName: string }) => (await apiRequest("POST", "/api/synthetic-results", value)).json(),
    onSuccess: () => queryClient.invalidateQueries(options),
  });
  const stopMutation = mutation.subscribe(() => {});
  try {
    await queryClient.fetchQuery(options);
    const pending = mutation.mutate({ playerName: "Synthetic only" });
    assert.equal(mutation.getCurrentResult().status, "pending");
    assert.deepEqual(await pending, { id: "synthetic-saved" });
    assert.equal(writes, 1); assert.equal(reads, 2);
    assert.deepEqual(query.getCurrentResult().data, { version: 2 });
    assert.equal(mutation.getCurrentResult().status, "success");
  } finally { stopQuery(); stopMutation(); }
});

test("failed saves are not resent until a caller explicitly retries", async () => {
  let writes = 0;
  globalThis.fetch = async () => ++writes === 1 ? new Response("Synthetic save unavailable", { status: 503 }) : Response.json({ id: "synthetic-recovered" });
  const mutation = new MutationObserver(queryClient, {
    mutationFn: async (value: { playerName: string }) => (await apiRequest("POST", "/api/synthetic-save", value)).json(),
  });
  const unsubscribe = mutation.subscribe(() => {});
  try {
    await assert.rejects(mutation.mutate({ playerName: "Synthetic retry" }), /503:/);
    assert.equal(writes, 1); assert.equal(mutation.getCurrentResult().status, "error");
    assert.deepEqual(await mutation.mutate({ playerName: "Synthetic retry" }), { id: "synthetic-recovered" });
    assert.equal(writes, 2); assert.equal(mutation.getCurrentResult().status, "success");
  } finally { unsubscribe(); }
});
