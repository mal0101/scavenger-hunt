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

  // Course de la chasse au trésor (Document_9__3_.md) : chaque fiche décrit un
  // lieu, un code à afficher, un indice et (quand elle en a) une question dont
  // la solution est la bonne réponse.
  //
  // Parcours : seuls les lieux UNIQUES du document sont des index "enigma"
  // (la POUBELLE revient 2 fois dans le fichier mais doit être trouvée une
  // seule fois — Fiche 9 fusionnée dans "Poubelle du parking"). Le dernier QR
  // du parcours est SALLE ADE (fiche 16 = "fiche 17", dernier QR code).
  // Les 4 "trap" sont les questions d'étages (QCM) fournies séparément
  // (trap 1..4) ; un seul `enigma_type` par index : "enigma" ou "trap".
  const indexes = [
    {
      label: "Buvette",
      display_code: "2 - 8 - 8 - 3 - 8 - 8 - 3",
      description: "Code à afficher : 2 - 8 - 8 - 3 - 8 - 8 - 3",
      hint: "Clavier de téléphone Nokia pile (2 = A/B/C, 3 = D/E/F, 8 = T/U/V).",
      question: "Quel est ce lieu d'immanquable pause-café ?",
      answer: "BUVETTE",
      enigma_type: "enigma",
      seq: 1,
    },
    {
      label: "Poubelle du parking",
      display_code: "16 - 15 - 21 - 2 - 5 - 12 - 12 - 5",
      description: "Code à afficher : 16 - 15 - 21 - 2 - 5 - 12 - 12 - 5",
      hint: "Alphabet numéroté (1 = A, 2 = B, 3 = C...).",
      question: "Quel objet garde le parking propre ?",
      answer: "POUBELLE",
      enigma_type: "enigma",
      seq: 2,
    },
    {
      label: "Banc vert",
      display_code: "C A N B — R E V T",
      description: "Code à afficher : C A N B — R E V T",
      hint: "Anagramme (remettez les lettres dans l'ordre).",
      question: "Quel meuble d'extérieur coloré vous attend sous les arbres ?",
      answer: "BANC VERT",
      enigma_type: "enigma",
      seq: 3,
    },
    {
      label: "Terrain de foot",
      display_code: "— 🇪 —",
      description: "Code à afficher : — 🇪 —",
      hint: "Clé : =T, =R, =A, =I, =N, =D, 🇪=E, =F, =O.",
      question: "Remplacez les symboles pour trouver le lieu du match.",
      answer: "TERRAIN DE FOOT",
      enigma_type: "enigma",
      seq: 4,
    },
    {
      label: "Conteneur",
      display_code: "E Q P V G P G W T",
      description: "Code à afficher : E Q P V G P G W T",
      hint: "Code César -2 (E → C, Q → O) : décalez chaque lettre de 2 rangs vers l'arrière dans l'alphabet.",
      question: "Quel est cet imposant bloc métallique de stockage ?",
      answer: "CONTENEUR",
      enigma_type: "enigma",
      seq: 5,
    },
    {
      label: "Bancs du parking 1",
      display_code: "[A1-A2-A3-A4-A5] — [A1-B2] — [B3-A2-B4-B5-C1-C2-C3]",
      description:
        "Code à afficher : [A1-A2-A3-A4-A5] — [A1-B2] — [B3-A2-B4-B5-C1-C2-C3]",
      question:
        "Décodez les coordonnées de la grille (ligne, colonne) pour trouver où vous asseoir à proximité des véhicules.",
      hint: "Grille (Ligne, Colonne) : ligne A = B A N C S ; ligne B = D U P R K ; ligne C = I N G O E. A1=B, A2=A...",
      answer: "BANCS DU PARKING 1",
      enigma_type: "enigma",
      seq: 6,
    },
    {
      label: "Bancs du parking 2",
      display_code: "SNCAB UD GNIKRAP2",
      description: "Code à afficher : SNCAB UD GNIKRAP2",
      hint: "Anagramme : les lettres de chaque mot ont été mélangées.",
      question: "Recomposez ces trois mots pour trouver où vous asseoir à proximité des véhicules.",
      answer: "BANCS DU PARKING 2",
      enigma_type: "enigma",
      seq: 7,
    },
    {
      label: "Gradins du terrain",
      display_code: null,
      description: "Énigme : escaliers des supporters au bord du terrain.",
      hint: "Taillés en escaliers au bord du terrain, ils portent les supporters en colère ou en joie lors de chaque match.",
      question:
        "Taillés en escaliers au bord du terrain, nous portons les supporters en colère ou en joie lors de chaque match. Que sommes-nous ?",
      answer: "GRADINS DU TERRAIN",
      enigma_type: "enigma",
      seq: 8,
    },
    {
      label: "Terrain de volley",
      display_code:
        "Mot 1 : 25 - 5 = ? ; 10 - 5 = ? ; 20 - 2 = ? ; 22 - 4 = ? ; 5 - 4 = ? ; 15 - 6 = ? ; 20 - 6 = ? — Mot 2 : 10 - 6 = ? ; 8 - 3 = ? — Mot 3 : 25 - 3 = ? ; 20 - 5 = ? ; 15 - 3 = ? ; 20 - 8 = ? ; 12 - 7 = ? ; 3 - 5 = ?",
      description: "Code à calculer : soustractions simples.",
      hint: "Calculez chaque soustraction et remplacez le résultat par la lettre correspondante dans l'alphabet (1 = A … 26 = Z). Ex. : 25-5=20 → T. Détail de la solution : 20, 5, 18, 18, 1, 9, 14 → TERRAIN ; 4, 5 → DE ; 22, 15, 12, 12, 5, 25 → VOLLEY.",
      question: "Calculez ces soustractions pour trouver le terrain de sport recherché.",
      answer: "TERRAIN DE VOLLEY",
      enigma_type: "enigma",
      seq: 9,
    },
    {
      label: "Réception",
      display_code: "SFDFQUJPO",
      description: "Code à afficher : SFDFQUJPO",
      hint: "Code César +1 : chaque lettre a été avancée d'un rang (S − 1 = R, F − 1 = E...). Détail de la résolution : S−1=R, F−1=E, D−1=C, F−1=E, Q−1=P, U−1=T, J−1=I, P−1=O, O−1=N.",
      question: "Décodez ce mot pour localiser le point d'accueil principal.",
      answer: "RÉCEPTION",
      enigma_type: "enigma",
      seq: 10,
    },
    {
      label: "Terrain de basket",
      display_code: "R E T R A I N — E D — S A B K E T",
      description: "Code à afficher : R E T R A I N — E D — S A B K E T",
      hint: "Anagramme simple : les lettres de chaque mot ont été mélangées. Détail de la résolution : R E T R A I N → TERRAIN ; E D → DE ; S A B K E T → BASKET.",
      question: "Remettez les lettres dans le bon ordre pour trouver cet espace sportif équipé de paniers.",
      answer: "TERRAIN DE BASKET",
      enigma_type: "enigma",
      seq: 11,
    },
    {
      label: "Chemin de la porte principale vers la buvette",
      display_code: null,
      description: null,
      question:
        "Franchis le portail d'entrée, garde le poste de garde dans ton dos. Emprunte la grande allée centrale sans dévier vers le parking à gauche, ni vers le terrain à gauche. Laisse-toi guider par cette voie directe jusqu'au comptoir des rafraîchissements. Où dois-tu aller ?",
      hint: "Franchis le portail d'entrée, garde le poste de garde dans ton dos. Emprunte la grande allée centrale sans dévier vers le parking à gauche, ni vers le terrain à gauche.",
      answer: "CHEMIN DE LA PORTE PRINCIPALE VERS LA BUVETTE",
      enigma_type: "enigma",
      seq: 12,
    },
    {
      label: "Gradins en face de la buvette",
      display_code: null,
      description: null,
      question:
        "Mes marches en béton servent de sièges aux supporters pendant les matchs. Si tu t'assieds sur moi et que tu regardes juste droit devant toi, tu verras là où l'on sert le café et les snacks. Où es-tu assis ?",
      hint: "Pense aux escaliers des supporters et à leur position par rapport au point de restauration.",
      answer: "GRADINS EN FACE DE LA BUVETTE",
      enigma_type: "enigma",
      seq: 13,
    },
    {
      label: "Escaliers des terrains",
      display_code: null,
      description: null,
      question:
        "En me gravissant marche après marche, je t'élève au-dessus du sol. Depuis mon sommet, je t'offre la plus belle vue panoramique sur l'ensemble des terrains de sport. Où dois-tu monter ?",
      hint: "Pense aux grandes marches extérieures qui surplombent l'espace sportif.",
      answer: "ESCALIERS DES TERRAINS",
      enigma_type: "enigma",
      seq: 14,
    },
    {
      label: "Poste de sécurité du parking",
      display_code: "QPTUF EF TFDVSJUF EV QBSLJOH",
      description: "Code à afficher : QPTUF EF TFDVSJUF EV QBSLJOH",
      hint: "Code César +1 : chaque lettre a été avancée d'une case (QPTUF − 1 → POSTE...). Détail de la résolution : QPTUF−1 → POSTE ; EF−1 → DE ; TFDVSJUF−1 → SECURITE ; EV−1 → DU ; QBSLJOH−1 → PARKING.",
      question: "Décodez ce message pour localiser l'abri des gardiens situé près des voitures.",
      answer: "POSTE DE SECURITE DU PARKING",
      enigma_type: "enigma",
      seq: 15,
    },
    {
      label: "Salle ADE",
      display_code: "✦ ★ ♣ ♣ ♥ — ★ ◆ ♥",
      description: "Code à afficher : ✦ ★ ♣ ♣ ♥ — ★ ◆ ♥",
      hint: "Table de correspondance : ✦ = S, ★ = A, ♣ = L, ♥ = E, ◆ = D. Détail de la résolution : ✦★♣♣♥ → SALLE ; ★◆♥ → ADE.",
      question: "Remplacez chaque symbole par la lettre correspondante pour découvrir le lieu.",
      answer: "SALLE ADE",
      enigma_type: "enigma",
      seq: 16,
    },
    {
      label: "Salle de prototypage",
      description: "Trap 1 — question d'étage.",
      hint: null,
      question: "À quel étage se trouve la salle de prototypage ?",
      answer: "1er étage (à côté des salles de conception DAO/Informatique)",
      options: [
        "Sous-sol",
        "Rez-de-chaussée",
        "1er étage (à côté des salles de conception DAO/Informatique)",
        "2ème étage",
      ],
      enigma_type: "trap",
      seq: 17,
    },
    {
      label: "Travaux pratiques de métallurgie",
      description: "Trap 2 — question d'étage.",
      hint: null,
      question:
        "À quel niveau devez-vous vous rendre pour les travaux pratiques de métallurgie et d'essais des matériaux ?",
      answer: "Sous-sol",
      options: [
        "Rez-de-chaussée",
        "1er étage",
        "2ème étage (avec les laboratoires de chimie)",
        "Sous-sol",
      ],
      enigma_type: "trap",
      seq: 18,
    },
    {
      label: "Amphi 2",
      description: "Trap 3 — question d'étage.",
      hint: null,
      question: "À quel étage se situe l'Amphi 2 ?",
      answer: "1er étage uniquement",
      options: [
        "Rez-de-chaussée uniquement",
        "1er étage uniquement",
        "Accessibilité à la fois au Rez-de-chaussée et au 1er étage",
        "Sous-sol",
      ],
      enigma_type: "trap",
      seq: 19,
    },
    {
      label: "Bureau de la Secrétaire Générale",
      description: "Trap 4 — question d'étage.",
      hint: null,
      question:
        "Où devez-vous monter/descendre pour trouver le bureau de la Secrétaire Générale (SG) ?",
      answer: "2ème étage",
      options: [
        "Rez-de-chaussée (à côté du guichet du Service Scolarité)",
        "1er étage (Bloc Administration)",
        "2ème étage",
        "Entre-sol",
      ],
      enigma_type: "trap",
      seq: 20,
    },
  ] as const;

  const playerHash = await bcrypt.hash(PLAYER_PASSWORD, 10);

  for (let i = 0; i < indexes.length; i++) {
    const idx = indexes[i] as (typeof indexes)[number] & {
      points?: number;
      location_name?: string | null;
      display_code?: string | null;
      question?: string;
      answer?: string;
      options?: readonly string[];
      hint?: string;
      description?: string | null;
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
        display_code: idx.display_code ?? null,
        question: idx.question,
        answer: idx.answer,
        hint: idx.hint,
        description: idx.description ?? null,
        sequence_order: idx.seq ?? 0,
        answer_options: idx.options?.length
          ? JSON.stringify(idx.options)
          : null,
      },
      create: {
        id: `00000000-0000-0000-0000-${String(i + 1).padStart(12, "0")}`,
        game_id: game.id,
        label: idx.label,
        points: idx.points ?? 25,
        location_name: idx.location_name,
        enigma_type: idx.enigma_type,
        display_code: idx.display_code ?? null,
        question: idx.question as string | undefined,
        answer: idx.answer as string | undefined,
        hint: idx.hint,
        description: idx.description ?? null,
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

  // Old markers (from previous seed compositions) are gone from the course —
  // drop leftover rows so the game only exposes the 16 lieux + 4 traps.
  const targetIndexIds = indexes.map(
    (_, i) => `00000000-0000-0000-0000-${String(i + 1).padStart(12, "0")}`
  );
  const staleRemoved = await db.index.deleteMany({
    where: { game_id: game.id, id: { notIn: targetIndexIds } },
  });
  if (staleRemoved.count > 0) {
    console.log(`Removed ${staleRemoved.count} stale index(es)`);
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
