import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const ADMIN_USERNAME = "mentor";
const ADMIN_PASSWORD =
  process.env.CREDENTIALS_SEED_ADMIN_PASSWORD ?? "ChangeMe_Admin_2026!";
const PLAYER_PASSWORD =
  process.env.CREDENTIALS_SEED_PLAYER_PASSWORD ?? "DevPass_2026!";

async function main() {
  console.log("Seeding database...");

  const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const mentor = await db.user.upsert({
    where: { username: ADMIN_USERNAME },
    update: {
      password_hash: adminHash,
      nickname: "Admin Mentor",
      role: "MENTOR",
      phone_number: "+212600000000",
    },
    create: {
      username: ADMIN_USERNAME,
      password_hash: adminHash,
      nickname: "Admin Mentor",
      role: "MENTOR",
      phone_number: "+212600000000",
    },
  });
  console.log(`Mentor: ${mentor.username} (${mentor.phone_number})`);

  const game = await db.game.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      title: "ESCAPE ROOM ÔÇö Kick-off Week 2026",
      description: "A steampunk scavenger hunt across the ENSAM Casablanca campus",
      max_rounds: 3,
      round_duration: 1800,
      elimination_pct: 0.2,
      created_by: mentor.id,
      status: "ACTIVE",
      current_round: 1,
      started_at: new Date(),
    },
  });
  console.log(`Game: ${game.id} (${game.title})`);

  const existingActive = await db.round.findFirst({
    where: { game_id: game.id, status: "ACTIVE" },
    select: { id: true },
  });

  const round1 = await db.round.upsert({
    where: { game_id_round_number: { game_id: game.id, round_number: 1 } },
    update: existingActive
      ? {}
      : { status: "ACTIVE", started_at: new Date() },
    create: {
      game_id: game.id,
      round_number: 1,
      status: "ACTIVE",
      started_at: new Date(),
    },
  });
  console.log(`Round 1: ${round1.id}`);

  const indexes = [
    { label: "The Clocktower", points: 50, location_name: "Main entrance", enigma_type: "visual" },
    { label: "Steam Vent", points: 30, location_name: "Building B hallway", enigma_type: "puzzle" },
    { label: "The Compass Rose", points: 25, location_name: "Courtyard", enigma_type: "trivia" },
    { label: "Boiler Room", points: 40, location_name: "Basement level", enigma_type: "physical" },
    { label: "The Enigma Vault", points: 75, location_name: "Library corner", enigma_type: "logic" },
    { label: "The Pressure Gauge", points: 40, location_name: "Water tower stairwell", enigma_type: "trap", question: "What moves steam through the city below?", answer: "steam" },
    { label: "Mistlock Regulator", points: 30, location_name: "Rooftop fan housing", enigma_type: "trap", question: "Name the gear that dares turn backwards?", answer: "idler" },
  ];

  const playerHash = await bcrypt.hash(PLAYER_PASSWORD, 10);

  for (let i = 0; i < indexes.length; i++) {
    const idx = indexes[i];
    const created = await db.index.upsert({
      where: {
        id: `00000000-0000-0000-0000-${String(i + 1).padStart(12, "0")}`,
      },
      update: { points: idx.points, question: idx.question, answer: idx.answer },
      create: {
        id: `00000000-0000-0000-0000-${String(i + 1).padStart(12, "0")}`,
        game_id: game.id,
        label: idx.label,
        points: idx.points,
        location_name: idx.location_name,
        enigma_type: idx.enigma_type,
        question: idx.question as string | undefined,
        answer: idx.answer as string | undefined,
      },
    });
    console.log(`Index: ${created.label} (${created.points} pts)`);

    await db.qrCode.upsert({
      where: { index_id: created.id },
      update: { points: created.points, pool_value: created.points },
      create: {
        index_id: created.id,
        game_id: game.id,
        points: created.points,
        pool_value: created.points,
        status: "ACTIVE",
      },
    });
  }

  const devPlayers = [
    { username: "player1", nickname: "Player One", phone_number: "+212600000001" },
    { username: "player2", nickname: "Player Two", phone_number: "+212600000002" },
    { username: "player3", nickname: "Player Three", phone_number: "+212600000003" },
    { username: "player4", nickname: "Player Four", phone_number: "+212600000004" },
  ];

  for (const dp of devPlayers) {
    const user = await db.user.upsert({
      where: { username: dp.username },
      update: { password_hash: playerHash, nickname: dp.nickname, role: "PLAYER", phone_number: dp.phone_number },
      create: {
        username: dp.username,
        password_hash: playerHash,
        phone_number: dp.phone_number,
        nickname: dp.nickname,
        role: "PLAYER",
      },
    });

    await db.player.upsert({
      where: { user_id: user.id },
      update: { game_id: game.id },
      create: {
        user_id: user.id,
        game_id: game.id,
        team_id: null,
        total_score: 0,
        status: "ACTIVE",
      },
    });
    console.log(`Dev player: ${dp.username} (${user.id})`);
  }

  console.log("Seed complete!");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
