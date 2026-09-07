import { NextRequest } from "next/server";
import { db } from "@/lib/db/postgres";
import { apiSuccess, apiError, apiInternal } from "@/lib/types/api";
import { generateQrImage, generateQrSvg } from "@/lib/qr/generator";
import { requireMentor } from "@/lib/auth/guard";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireMentor(request);
    if (auth instanceof Response) return auth;

    const { id } = await params;
    const body = await request.json();
    const { game_id, format = "png" } = body;

    if (!game_id) {
      return apiError("game_id is required", "VALIDATION_ERROR");
    }

    const index = await db.index.findUnique({ where: { id } });
    if (!index || index.game_id !== game_id) {
      return apiError("Index not found for this game", "NOT_FOUND", 404);
    }

    const qrCode = await db.qrCode.upsert({
      where: { index_id: id },
      update: {
        points: index.points,
        pool_value: index.points,
        status: "ACTIVE",
        first_scanned_at: null,
      },
      create: {
        index_id: id,
        game_id,
        points: index.points,
        pool_value: index.points,
      },
    });

    if (format === "svg") {
      const svg = await generateQrSvg(id, game_id, qrCode.id);
      return apiSuccess(
        {
          code_id: qrCode.id,
          pool_value: qrCode.pool_value,
          status: qrCode.status,
          svg,
          format: "svg",
        },
        "QR code generated"
      );
    }

    const dataUrl = await generateQrImage(id, game_id, qrCode.id);
    return apiSuccess(
      {
        code_id: qrCode.id,
        pool_value: qrCode.pool_value,
        status: qrCode.status,
        data_url: dataUrl,
        format: "png",
      },
      "QR code generated"
    );
  } catch (error) {
    console.error("Generate QR error:", error instanceof Error ? error.message : "unknown");
    return apiInternal("Failed to generate QR code");
  }
}