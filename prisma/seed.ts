import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const mentor = await db.user.upsert({
    where: { phone_number: "+212600000001" },
    update: {},
    create: {
      phone_number: "+212600000001",
      nickname: "Admin Mentor",
      role: "MENTOR",
    },
  });
  console.log(`Mentor: ${mentor.id} (${mentor.phone_number})`);

  const game = await db.game.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      title: "ESCAPE ROOM — Kick-off Week 2026",
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

  const round1 = await db.round.upsert({
    where: { game_id_round_number: { game_id: game.id, round_number: 1 } },
    update: {},
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
  ];

  // Reset indexes for this game so re-seeding is idempotent (no duplicates)
  await db.index.deleteMany({ where: { game_id: game.id } });
  for (const idx of indexes) {
    const created = await db.index.upsert({
      where: {
        id: `00000000-0000-0000-0000-${String(indexes.indexOf(idx) + 1).padStart(12, "0")}`,
      },
      update: {},
      create: {
        id: `00000000-0000-0000-0000-${String(indexes.indexOf(idx) + 1).padStart(12, "0")}`,
        game_id: game.id,
        round_id: round1.id,
        label: idx.label,
        points: idx.points,
        location_name: idx.location_name,
        enigma_type: idx.enigma_type,
      },
    });
    console.log(`Index: ${created.label} (${created.points} pts)`);
  }

  // ── Full demo environment: 2 teams × 2 players ──────────────

  const teamDefs = [
    { name: "Brass Falcons", invite: "BRASS1", members: [
      { phone: "+212600000101", nick: "Falcon Alpha" },
      { phone: "+212600000102", nick: "Falcon Beta" },
      { phone: "+212777628130", nick: "Test WhatsApp" },
    ]},
    { name: "Steam Serpents", invite: "SERPNT", members: [
      { phone: "+212600000201", nick: "Serpent Alpha" },
      { phone: "+212600000202", nick: "Serpent Beta" },
    ]},
  ];

  for (const teamDef of teamDefs) {
    const team = await db.team.upsert({
      where: { invite_code: teamDef.invite },
      update: {},
      create: {
        name: teamDef.name,
        invite_code: teamDef.invite,
        game_id: game.id,
      },
    });
    console.log(`Team: ${team.name} (${team.id})`);

    for (const m of teamDef.members) {
      const user = await db.user.upsert({
        where: { phone_number: m.phone },
        update: {},
        create: {
          phone_number: m.phone,
          nickname: m.nick,
          role: "PLAYER",
        },
      });

      const player = await db.player.upsert({
        where: { user_id: user.id },
        update: { game_id: game.id, team_id: team.id, status: "ACTIVE" },
        create: {
          user_id: user.id,
          game_id: game.id,
          team_id: team.id,
          total_score: 0,
          status: "ACTIVE",
        },
      });
      console.log(`  Player: ${m.nick} → ${team.name} (${player.id})`);
    }
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
