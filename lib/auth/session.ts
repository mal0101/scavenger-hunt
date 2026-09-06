import {
  signAccessToken,
  signRefreshToken,
  getAccessExpiry,
  getRefreshExpiry,
} from "@/lib/auth/jwt";

export interface SessionUser {
  id: string;
  role: "PLAYER" | "MENTOR";
  username: string;
}

export async function issueSession(user: SessionUser): Promise<{
  accessToken: string;
  refreshToken: string;
  accessMaxAge: number;
  refreshMaxAge: number;
}> {
  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken(user.id, user.role, user.username),
    signRefreshToken(user.id, user.role, user.username),
  ]);

  return {
    accessToken,
    refreshToken,
    accessMaxAge: getAccessExpiry(),
    refreshMaxAge: getRefreshExpiry(),
  };
}