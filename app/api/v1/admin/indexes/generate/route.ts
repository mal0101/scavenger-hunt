import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db/postgres";
import { apiSuccess, apiError, apiInternal } from "@/lib/types/api";
import { generateQrImage, generateQrSvg } from "@/lib/qr/generator";
import { requireMentor } from "@/lib/auth/guard";

const schema = z.object({
  game_id: z.string().uuid(),
  format: z.enum(["png", "svg"]).default("png"),
  index_ids: z.array(z.string().uuid()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await requireMentor(request);
    if (auth instanceof Response) return auth;

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError("Invalid generation request", "VALIDATION_ERROR");
    }

    const { game_id, format, index_ids } = parsed.data;

    const game = await db.game.findUnique({ where: { id: game_id } });
    if (!game) return apiError("Game not found", "NOT_FOUND", 404);

    const indexes = await db.index.findMany({
      where: {
        game_id,
        ...(index_ids ? { id: { in: index_ids } } : {}),
      },
      orderBy: { label: "asc" },
    });

    if (indexes.length === 0) {
      return apiError("No indexes found for generation", "NO_INDEXES");
    }

    const generated = [];
    for (const index of indexes) {
      const qrCode = await db.qrCode.upsert({
        where: { index_id: index.id },
        update: {
          points: index.points,
          pool_value: index.points,
          status: "ACTIVE",
          first_scanned_at: null,
        },
        create: {
          index_id: index.id,
          game_id,
          points: index.points,
          pool_value: index.points,
        },
      });

      const base = {
        index_id: index.id,
        code_id: qrCode.id,
        label: index.label,
        points: index.points,
        pool_value: qrCode.pool_value,
        status: qrCode.status,
        location_name: index.location_name,
      };

      if (format === "svg") {
        const svg = await generateQrSvg(index.id, game_id, qrCode.id);
        generated.push({ ...base, format: "svg", svg });
      } else {
        const dataUrl = await generateQrImage(index.id, game_id, qrCode.id);
        generated.push({ ...base, format: "png", data_url: dataUrl });
      }
    }

    return apiSuccess({
      game_id,
      game_title: game.title,
      count: generated.length,
      format,
      codes: generated,
    }, `Generated ${generated.length} QR code(s)`);
  } catch (error) {
    console.error("Batch QR generation error:", error instanceof Error ? error.message : "unknown");
    return apiInternal("Failed to generate QR codes");
  }
}
