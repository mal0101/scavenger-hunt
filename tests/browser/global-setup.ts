import { PrismaClient } from "@prisma/client";
import { loadEnvLocal } from "./helpers/env";

loadEnvLocal();

const db = new PrismaClient();

const SEED_GAME_ID = "00000000-0000-0000-0000-000000000001";
const QA_USERNAME_PREFIX = "qa_";
const QA_GAME_TITLE_PREFIX = "QA-Browser-";

export default async function globalSetup(): Promise<void> {
  // Restore the seeded game to its canonical state in case a previous run
  // left it mid-transition, so individual specs can rely on an ACTIVE R1 game.
  await db.game.update({
    where: { id: SEED_GAME_ID },
    data: { status: "ACTIVE", current_round: 1 },
  });

  // Re-arm the seeded game's QR codes so every scan spec starts from a
  // fully-charged, active pool.
  await db.qrCode.updateMany({
    where: { game_id: SEED_GAME_ID },
    data: { status: "ACTIVE", first_scanned_at: null },
  });
  const codes = await db.qrCode.findMany({
    where: { game_id: SEED_GAME_ID },
    select: { id: true },
  });
  for (const code of codes) {
    await db.$executeRawUnsafe(
      `UPDATE qr_codes SET pool_value = qr_codes.points WHERE id = '${code.id}'`
    );
  }

  // Clean up any QA artifacts from a previous browser run.
  const qaUsers = await db.user.findMany({
    where: { username: { startsWith: QA_USERNAME_PREFIX } },
    select: { id: true },
  });
  if (qaUsers.length > 0) {
    await db.user.deleteMany({ where: { id: { in: qaUsers.map((u) => u.id) } } });
  }
  await db.game.deleteMany({ where: { title: { startsWith: QA_GAME_TITLE_PREFIX } } });

  // Remove teams orphaned by the QA user sweep.
  const orphaned = await db.team.findMany({
    where: { players: { none: {} } },
    select: { id: true },
  });
  if (orphaned.length > 0) {
    await db.team.deleteMany({ where: { id: { in: orphaned.map((t) => t.id) } } });
  }

  await db.$disconnect();
}