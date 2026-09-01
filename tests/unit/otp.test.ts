import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";

const DATABASE_URL = process.env.DATABASE_URL ?? "";

const db = new PrismaClient();

function freshPhone(): string {
  return `+322${crypto.randomInt(100000000, 999999999)}`;
}

function future(seconds = 600): Date {
  return new Date(Date.now() + seconds * 1000);
}

let otpModule: typeof import("@/lib/auth/otp");

before(async () => {
  if (!DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is required for DB-backed OTP tests (run with `tsx --env-file=.env.local --test tests/unit/*.test.ts`)"
    );
  }
  // Run the real (non-mock) OTP verification path against the database.
  process.env.OTP_MOCK = "false";
  process.env.OTP_EXPIRY_SECONDS = "300";
  await db.$connect();
  otpModule = await import("@/lib/auth/otp");
});

after(async () => {
  await db.$disconnect();
});

test("verifyOtp returns false when the code does not match", async () => {
  const phone = freshPhone();
  await db.oTP.create({
    data: { phone_number: phone, code: "135790", expires_at: future() },
  });

  const { verifyOtp } = otpModule;
  assert.equal(await verifyOtp(phone, "000000"), false);

  const row = await db.oTP.findFirst({ where: { phone_number: phone } });
  assert.equal(row?.attempts, 1);
});

test("verifyOtp accepts the correct code", async () => {
  const phone = freshPhone();
  await db.oTP.create({
    data: { phone_number: phone, code: "135790", expires_at: future() },
  });

  const { verifyOtp } = otpModule;
  assert.equal(await verifyOtp(phone, "135790"), true);
});

test("verifyOtp blocks after MAX_OTP_ATTEMPTS and marks the code used", async () => {
  const phone = freshPhone();
  await db.oTP.create({
    data: { phone_number: phone, code: "135790", attempts: 4, expires_at: future() },
  });

  const { verifyOtp } = otpModule;
  assert.equal(await verifyOtp(phone, "135790"), true, "5th attempt still allowed");
  assert.equal(await verifyOtp(phone, "135790"), false, "6th attempt blocked");
  assert.equal(await verifyOtp(phone, "135790"), false, "blocked regardless of correctness");

  const row = await db.oTP.findFirst({ where: { phone_number: phone } });
  assert.equal(row?.used, true);
});

test("invalidateOtp revokes a previously valid code", async () => {
  const phone = freshPhone();
  await db.oTP.create({
    data: { phone_number: phone, code: "135790", expires_at: future() },
  });

  const { verifyOtp, invalidateOtp } = otpModule;
  assert.equal(await verifyOtp(phone, "135790"), true);
  await invalidateOtp(phone);
  assert.equal(await verifyOtp(phone, "135790"), false);
});

test("verifyOtp rejects an expired code", async () => {
  const phone = freshPhone();
  await db.oTP.create({
    data: {
      phone_number: phone,
      code: "135790",
      expires_at: new Date(Date.now() - 1000),
    },
  });

  const { verifyOtp } = otpModule;
  assert.equal(await verifyOtp(phone, "135790"), false);
});

test("verifyOtp is false for a phone with no code pending", async () => {
  const { verifyOtp } = otpModule;
  assert.equal(await verifyOtp(freshPhone(), "135790"), false);
});