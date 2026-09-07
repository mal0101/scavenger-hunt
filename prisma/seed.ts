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
    {
      label: "The Clocktower",
      points: 15,
      location_name: "Main entrance",
      enigma_type: "visual",
      seq: 1,
      hint: "Below the clock, steam rises through a grated vent.",
    },
    {
      label: "Steam Vent",
      points: 15,
      location_name: "Building B hallway",
      enigma_type: "puzzle",
      seq: 2,
      hint: "Let the vent push you toward the compass rose in the courtyard.",
    },
    {
      label: "The Compass Rose",
      points: 15,
      location_name: "Courtyard",
      enigma_type: "trivia",
      seq: 3,
      hint: "Head underground, where the boilers thrum beneath the stones.",
    },
    {
      label: "Boiler Room",
      points: 20,
      location_name: "Basement level",
      enigma_type: "physical",
      seq: 4,
      hint: "Keep calm. A pressure gauge on the water tower stairwell guards the next step.",
    },
    {
      label: "The Pressure Gauge",
      points: 20,
      location_name: "Water tower stairwell",
      enigma_type: "trap",
      seq: 5,
      question: "What moves steam through the city below?",
      answer: "steam",
      options: ["steam", "coal", "water", "wind"],
      hint: "Past the gauge, sealed valves hide the Enigma Vault.",
    },
    {
      label: "The Enigma Vault",
      points: 25,
      location_name: "Library corner",
      enigma_type: "logic",
      seq: 6,
      hint: "The vault key is a regulator with a bitter flip.",
    },
    {
      label: "Mistlock Regulator",
      points: 30,
      location_name: "Rooftop fan housing",
      enigma_type: "trap",
      seq: 7,
      question: "Name the gear that dares turn backwards?",
      answer: "idler",
      options: ["idler", "ratchet", "pinion", "crown"],
      hint: "Climb down — the workshop bench holds a copper mandrel.",
    },
    {
      label: "Copper Mandrel",
      points: 20,
      location_name: "Workshop bench",
      enigma_type: "puzzle",
      seq: 8,
      hint: "Spin the shaft and follow the cogs to the gears' gallery.",
    },
    {
      label: "Gear Gallery",
      points: 25,
      location_name: "Gallery mezzanine",
      enigma_type: "visual",
      seq: 9,
      hint: "A winding gear begins to turn on the east wall.",
    },
    {
      label: "Winding Gear",
      points: 25,
      location_name: "East wall display",
      enigma_type: "trap",
      seq: 10,
      question: "What uncoils when the hunt begins?",
      answer: "spring",
      options: ["spring", "chain", "rope", "ratchet"],
      hint: "Through the gallery, steam clouds the open corridor.",
    },
    {
      label: "Steam Gallery",
      points: 20,
      location_name: "Open corridor",
      enigma_type: "physical",
      seq: 11,
      hint: "Steady the pressure at the regulator bank.",
    },
    {
      label: "Regulator Bank",
      points: 25,
      location_name: "Control room",
      enigma_type: "puzzle",
      seq: 12,
      hint: "Report to the bronze gate in the inner hall.",
    },
    {
      label: "Bronze Gate",
      points: 15,
      location_name: "Inner hall",
      enigma_type: "trivia",
      seq: 13,
      hint: "Climb to the watchtower and scan the grounds.",
    },
    {
      label: "Watchtower",
      points: 20,
      location_name: "West tower",
      enigma_type: "visual",
      seq: 14,
      hint: "The archive reading room holds the next cipher.",
    },
    {
      label: "Reading Room",
      points: 25,
      location_name: "Archive library",
      enigma_type: "logic",
      seq: 15,
      hint: "The brass tab on the desk shows the way deeper.",
    },
    {
      label: "Brass Tab",
      points: 15,
      location_name: "Desk at archive",
      enigma_type: "puzzle",
      seq: 16,
      hint: "Warm the old boiler to crack it open.",
    },
    {
      label: "Old Boiler",
      points: 40,
      location_name: "Sub-basement",
      enigma_type: "trap",
      seq: 17,
      question: "Iron veins and glowing coal — what heats the hall?",
      answer: "steam",
      options: ["steam", "lava", "solar", "coal"],
      hint: "The blast door answers to the gears you've turned.",
    },
    {
      label: "Blast Door",
      points: 25,
      location_name: "Sub-basement exit",
      enigma_type: "physical",
      seq: 18,
      hint: "Ascend to the observatory and fix your bearings.",
    },
    {
      label: "Observatory",
      points: 20,
      location_name: "Rooftop dome",
      enigma_type: "logic",
      seq: 19,
      hint: "One aether-bound keystone remains beneath the clock.",
    },
    {
      label: "Aether Keystone",
      points: 30,
      location_name: "Gateway hall",
      enigma_type: "visual",
      seq: 20,
      hint: "Final marker — congratulate your team. The course is complete.",
    },
  ] as const;

  const playerHash = await bcrypt.hash(PLAYER_PASSWORD, 10);

  for (let i = 0; i < indexes.length; i++) {
    const idx = indexes[i] as (typeof indexes)[number] & {
      question?: string;
      answer?: string;
      options?: readonly string[];
      hint?: string;
      seq?: number;
    };
    const created = await db.index.upsert({
      where: {
        id: `00000000-0000-0000-0000-${String(i + 1).padStart(12, "0")}`,
      },
      update: {
        label: idx.label,
        points: idx.points,
        location_name: idx.location_name,
        enigma_type: idx.enigma_type,
        question: idx.question,
        answer: idx.answer,
        hint: idx.hint,
        sequence_order: idx.seq ?? 0,
        answer_options: idx.options?.length
          ? JSON.stringify(idx.options)
          : null,
      },
      create: {
        id: `00000000-0000-0000-0000-${String(i + 1).padStart(12, "0")}`,
        game_id: game.id,
        label: idx.label,
        points: idx.points,
        location_name: idx.location_name,
        enigma_type: idx.enigma_type,
        question: idx.question as string | undefined,
        answer: idx.answer as string | undefined,
        hint: idx.hint,
        sequence_order: idx.seq ?? 0,
        answer_options: idx.options?.length
          ? JSON.stringify(idx.options)
          : undefined,
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
