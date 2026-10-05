import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
const require = createRequire(
  new URL("../mobile/package.json", import.meta.url),
);
const { PGlite } = await import(
  pathToFileURL(require.resolve("@electric-sql/pglite")).href
);
const db = new PGlite();
const alice = "11111111-1111-4111-8111-111111111111";
const bob = "22222222-2222-4222-8222-222222222222";
const product = "a9a84059-8927-4a66-aafe-58dc49589f01";
await db.exec(`
  create role anon; create role authenticated;
  create schema auth;
  create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
  create table auth.users(id uuid primary key);
  grant usage on schema auth to authenticated;
  create table public.products(id uuid primary key,stock_status boolean not null);
  insert into auth.users values('${alice}'),('${bob}');
  insert into public.products values('${product}',true);
  create publication supabase_realtime;
`);
await db.exec(
  await readFile(
    new URL("../supabase/mobile-cart.sql", import.meta.url),
    "utf8",
  ),
);
async function identity(id) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec("set role authenticated");
}
let operation = 0;
const id = () =>
  `33333333-3333-4333-8333-${String(++operation).padStart(12, "0")}`;
async function mutate(action, quantity = 0, operationId = id(), items = []) {
  const result = await db.query(
    "select public.mutate_cart($1,$2,$3,$4,$5) as items",
    [operationId, action, product, quantity, JSON.stringify(items)],
  );
  return result.rows[0].items;
}
await identity(alice);
const retryId = id();
assert.equal((await mutate("add", 2, retryId))[0].quantity, 2);
assert.equal(
  (await mutate("add", 2, retryId))[0].quantity,
  2,
  "Retry must not add again",
);
assert.equal((await mutate("add", 3))[0].quantity, 5);
await assert.rejects(() => mutate("set", 51), "Quantity above limit must fail");
assert.equal(
  (await db.query("select items from carts")).rows[0].items[0].quantity,
  5,
  "Failed mutation must preserve cart",
);
assert.equal((await mutate("set", 4))[0].quantity, 4);
const mergeId = id();
await mutate("merge", 0, mergeId, [{ productId: product, quantity: 2 }]);
assert.equal(
  (await mutate("merge", 0, mergeId, [{ productId: product, quantity: 2 }]))[0]
    .quantity,
  6,
  "Merge retry must not duplicate",
);
await assert.rejects(
  () => db.query("update carts set items='[]'"),
  "Direct client writes must fail",
);
await identity(bob);
assert.equal(
  (await db.query("select * from carts")).rows.length,
  0,
  "Another user cannot read Alice cart",
);
assert.equal((await mutate("add", 1))[0].quantity, 1);
await identity(alice);
assert.equal(
  (await db.query("select items from carts")).rows[0].items[0].quantity,
  6,
);
assert.equal((await mutate("remove")).length, 0);
await mutate("add", 1);
assert.equal((await mutate("clear")).length, 0);
await identity("");
await assert.rejects(
  () => mutate("add", 1),
  "Anonymous identity cannot mutate",
);
await db.close();
console.log(
  "PASS: add/set/remove/clear, idempotent retries and merge, transaction rollback, direct-write denial and customer isolation.",
);
