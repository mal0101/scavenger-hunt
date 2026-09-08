import { z } from "zod";

export const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(32, "Username must be at most 32 characters")
  .regex(
    /^\+?[a-zA-Z0-9_.-]+$/,
    "Username may only contain letters, numbers, dots, dashes, underscores or a leading + sign"
  );

export const passwordSchema = z
  .string()
  .min(1, "Password may not be empty")
  .max(128, "Password must be at most 128 characters");

export const credentialsSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
});

export const createUserSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
  role: z.enum(["PLAYER", "MENTOR"]).default("PLAYER"),
  nickname: z.string().min(1).max(50).optional(),
  game_id: z.string().uuid().optional(),
});

export const resetPasswordSchema = z.object({
  password: passwordSchema,
});

export const teamSchema = z.object({
  team_name: z.string().min(1).max(50).optional(),
  invite_code: z.string().length(6).optional(),
});

export const gameSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  max_rounds: z.number().int().min(1).max(10).default(3),
  round_duration: z.number().int().min(300).max(7200).default(1800),
  elimination_pct: z.number().min(0).max(0.5).default(0.2),
});

export const indexSchema = z.object({
  game_id: z.string().uuid(),
  label: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  display_code: z.string().max(500).optional(),
  points: z.number().int().min(1).max(100).default(25),
  location_name: z.string().max(200).optional(),
  location_lat: z.number().min(-90).max(90).optional(),
  location_lng: z.number().min(-180).max(180).optional(),
  enigma_type: z.string().max(50).optional(),
  question: z.string().max(500).optional(),
  answer: z.string().max(500).optional(),
  hint: z.string().max(500).optional(),
  sequence_order: z.number().int().min(0).max(500).optional(),
  answer_options: z
    .array(z.string().min(1).max(200))
    .min(1)
    .max(8)
    .optional(),
});

/** Decode a stored JSON string-array of QCM answer options, tolerating
 *  legacy rows (null/corrupt → null) so callers can fall back to free text. */
export function parseAnswerOptions(
  raw: string | null | undefined
): string[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (
      Array.isArray(parsed) &&
      parsed.every((o) => typeof o === "string")
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/** Cross-field coherence for an index payload. Used by the create handlers
 *  (full payloads) and tolerates partial updates (PUT) by only validating the
 *  fields that are actually present. Returns an error message or null. */
export function validateIndexEnigma(input: Partial<IndexInput>): string | null {
  if (input.enigma_type === "trap") {
    if (input.sequence_order !== undefined && input.sequence_order > 0) {
      return "Trap indexes cannot be sequence steps (Sequence Position must be 0)";
    }
    if (input.question !== undefined && !input.question.trim()) {
      return "Trap indexes require a question";
    }
    if (input.answer !== undefined && !input.answer.trim()) {
      return "Trap indexes require a correct answer";
    }
  }

  if (input.answer_options && input.answer_options.length > 0) {
    const normalized = input.answer_options.map((o) => o.trim()).filter(Boolean);
    if (normalized.length < 2) {
      return "QCM traps require at least two answer options";
    }
    const answer = input.answer?.trim().toLowerCase();
    if (answer && !normalized.some((o) => o.toLowerCase() === answer)) {
      return "The correct answer must be one of the answer options";
    }
  }

  return null;
}

export const scanSchema = z.object({
  qr_data: z.string().min(1),
  game_id: z.string().uuid(),
  gps_lat: z.number().min(-90).max(90).optional(),
  gps_lng: z.number().min(-180).max(180).optional(),
});

export const stateTransitionSchema = z.object({
  action: z.enum([
    "start",
    "eliminate",
    "next_round",
    "finish",
    "reset",
  ]),
});

export type CredentialsInput = z.infer<typeof credentialsSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type TeamInput = z.infer<typeof teamSchema>;
export type GameInput = z.infer<typeof gameSchema>;
export type IndexInput = z.infer<typeof indexSchema>;
export type ScanInput = z.infer<typeof scanSchema>;
export type StateTransitionInput = z.infer<typeof stateTransitionSchema>;
