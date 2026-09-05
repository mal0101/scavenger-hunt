import { test } from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword } from "@/lib/auth/passwords";

test("hashPassword produces a bcrypt hash that verifyPassword accepts", async () => {
  const hash = await hashPassword("Secret_1");
  assert.ok(hash.startsWith("$2"), "should be a bcrypt hash");
  assert.equal(await verifyPassword("Secret_1", hash), true);
});

test("verifyPassword rejects a wrong password", async () => {
  const hash = await hashPassword("Secret_1");
  assert.equal(await verifyPassword("Secret_2", hash), false);
});

test("verifyPassword returns false for a malformed hash", async () => {
  assert.equal(await verifyPassword("whatever", "not-a-bcrypt-hash"), false);
  assert.equal(await verifyPassword("whatever", ""), false);
});