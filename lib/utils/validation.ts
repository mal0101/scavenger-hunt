import { z } from "zod";

export const phoneSchema = z.object({
  phone_number: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .max(15, "Phone number must be at most 15 digits")
    .regex(/^\+?[0-9]+$/, "Phone number must contain only digits and optional + prefix"),
});

export const otpSchema = z.object({
  phone_number: z.string(),
  code: z
    .string()
    .length(6, "OTP must be exactly 6 digits")
    .regex(/^[0-9]+$/, "OTP must contain only digits"),
});

export const teamSchema = z.object({
  team_name: z.string().min(1).max(50),
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
  points: z.number().int().min(1).max(100).default(25),
  location_name: z.string().max(200).optional(),
  location_lat: z.number().min(-90).max(90).optional(),
  location_lng: z.number().min(-180).max(180).optional(),
  enigma_type: z.string().max(50).optional(),
});

export const scanSchema = z.object({
  qr_data: z.string().min(1),
  game_id: z.string().uuid(),
  gps_lat: z.number().min(-90).max(90).optional(),
  gps_lng: z.number().min(-180).max(180).optional(),
});

export const stateTransitionSchema = z.object({
  action: z.enum(["start", "eliminate", "finish"]),
});

export type PhoneInput = z.infer<typeof phoneSchema>;
export type OtpInput = z.infer<typeof otpSchema>;
export type TeamInput = z.infer<typeof teamSchema>;
export type GameInput = z.infer<typeof gameSchema>;
export type IndexInput = z.infer<typeof indexSchema>;
export type ScanInput = z.infer<typeof scanSchema>;
export type StateTransitionInput = z.infer<typeof stateTransitionSchema>;
