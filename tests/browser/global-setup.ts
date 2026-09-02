import { PrismaClient } from "@prisma/client";
import { loadEnvLocal } from "./helpers/env";

loadEnvLocal();

const db = new PrismaClient();

const SEED_GAME_ID = "00000000-0000-0000-0000-000000000001";
const QA_PHONE_PREFIX = "+21269991";
const QA_GAME_TITLE_PREFIX = "QA-Browser-";

export default async function globalSetup(): Promise<void> {
  // Restore the seeded game to its canonical state in case a previous run
  // left it mid-transition, so individual specs can rely on an ACTIVE R1 game.
  await db.game.update({
    where: { id: SEED_GAME_ID },
    data: { status: "ACTIVE", current_round: 1 },
  });

  const round = await db.round.findFirst({
    where: { game_id: SEED_GAME_ID, round_number: 1 },
    select: { id: true },
  });
  if (round) {
    await db.index.updateMany({
      where: {
        game_id: SEED_GAME_ID,
        round_id: { not: round.id },
      },
      data: { round_id: round.id },
    });
  }

  // Clean up any QA artifacts from a previous browser run.
  const qaUsers = await db.user.findMany({
    where: { phone_number: { startsWith: QA_PHONE_PREFIX } },
    select: { id: true },
  });
  if (qaUsers.length > 0) {
    await db.user.deleteMany({ where: { id: { in: qaUsers.map((u) => u.id) } } });
  }
  await db.game.deleteMany({ where: { title: { startsWith: QA_GAME_TITLE_PREFIX } } });

  await db.$disconnect();
}