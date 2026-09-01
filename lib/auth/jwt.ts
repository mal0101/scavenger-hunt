import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import crypto from "crypto";

export interface TokenPayload extends JWTPayload {
  sub: string;
  role: "PLAYER" | "MENTOR";
  phone: string;
}

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}
if (!process.env.JWT_REFRESH_SECRET) {
  throw new Error("JWT_REFRESH_SECRET environment variable is required");
}

const ACCESS_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);
const REFRESH_SECRET = new TextEncoder().encode(process.env.JWT_REFRESH_SECRET);

const ACCESS_EXPIRY = process.env.JWT_EXPIRY ?? "900";
const REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY ?? "604800";

export async function signAccessToken(
  userId: string,
  role: "PLAYER" | "MENTOR",
  phone: string
): Promise<string> {
  return new SignJWT({ sub: userId, role, phone })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_EXPIRY}s`)
    .setIssuer("scavenger-hunt")
    .setAudience("scavenger-hunt-api")
    .sign(ACCESS_SECRET);
}

export async function signRefreshToken(
  userId: string,
  role: "PLAYER" | "MENTOR",
  phone: string
): Promise<string> {
  return new SignJWT({ sub: userId, role, phone })
    .setProtectedHeader({ alg: "HS256" })
    .setJti(crypto.randomUUID())
    .setIssuedAt()
    .setExpirationTime(`${REFRESH_EXPIRY}s`)
    .setIssuer("scavenger-hunt")
    .setAudience("scavenger-hunt-refresh")
    .sign(REFRESH_SECRET);
}

export async function verifyAccessToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, ACCESS_SECRET, {
    issuer: "scavenger-hunt",
    audience: "scavenger-hunt-api",
  });
  return payload as TokenPayload;
}

export async function verifyRefreshToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, REFRESH_SECRET, {
    issuer: "scavenger-hunt",
    audience: "scavenger-hunt-refresh",
  });
  return payload as TokenPayload;
}

export function getAccessExpiry(): number {
  return parseInt(ACCESS_EXPIRY, 10);
}

export function getRefreshExpiry(): number {
  return parseInt(REFRESH_EXPIRY, 10);
}
