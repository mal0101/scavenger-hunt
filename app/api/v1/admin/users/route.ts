import { NextRequest } from "next/server";
import { db } from "@/lib/db/postgres";
import { apiSuccess, apiError, apiConflict, apiInternal } from "@/lib/types/api";
import { createUserSchema } from "@/lib/utils/validation";
import { hashPassword } from "@/lib/auth/passwords";
import { requireMentor } from "@/lib/auth/guard";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireMentor(request);
    if (auth instanceof Response) return auth;

    const users = await db.user.findMany({
      select: {
        id: true,
        username: true,
        nickname: true,
        role: true,
        created_at: true,
        player: {
          select: {
            id: true,
            game_id: true,
            team: { select: { id: true, name: true } },
            total_score: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
    });

    return apiSuccess({
      total: users.length,
      users: users.map((u) => ({
        id: u.id,
        username: u.username,
        nickname: u.nickname,
        role: u.role,
        created_at: u.created_at,
        player: u.player ?? null,
      })),
    });
  } catch (error) {
    console.error("List users error:", error instanceof Error ? error.message : "unknown");
    return apiInternal("Failed to list users");
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireMentor(request);
    if (auth instanceof Response) return auth;

    const body = await request.json().catch(() => ({}));
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Invalid user data", "VALIDATION_ERROR");
    }

    const { username, password, role, nickname, game_id } = parsed.data;

    const existing = await db.user.findUnique({ where: { username } });
    if (existing) {
      return apiConflict("Username is already in use");
    }

    const passwordHash = await hashPassword(password);

    const user = await db.user.create({
      data: {
        username,
        password_hash: passwordHash,
        nickname: nickname ?? null,
        role,
      },
    });

    let player = null;
    if (role === "PLAYER") {
      let targetGameId = game_id;
      if (!targetGameId) {
        const activeGame = await db.game.findFirst({
          where: { status: "ACTIVE" },
          orderBy: { created_at: "desc" },
        });
        targetGameId = activeGame?.id ?? undefined;
      }

      if (targetGameId) {
        const gameExists = await db.game.findUnique({ where: { id: targetGameId } });
        if (gameExists) {
          const finalGameId = targetGameId;
          player = await db.player.create({
            data: {
              user_id: user.id,
              game_id: finalGameId,
              team_id: null,
              total_score: 0,
              status: "ACTIVE",
            },
            select: {
              id: true,
              game_id: true,
              team_id: true,
              total_score: true,
            },
          });
        }
      }
    }

    return apiSuccess(
      {
        user: { id: user.id, username: user.username, nickname: user.nickname, role: user.role },
        player,
      },
      "User created successfully"
    );
  } catch (error) {
    console.error("Create user error:", error instanceof Error ? error.message : "unknown");
    return apiInternal("Failed to create user");
  }
}