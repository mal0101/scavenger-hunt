import { NextRequest } from "next/server";
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
    const { game_id, round_id, format = "png" } = body;

    if (!game_id || !round_id) {
      return apiError("game_id and round_id are required", "VALIDATION_ERROR");
    }

    if (format === "svg") {
      const svg = await generateQrSvg(id, game_id, round_id);
      return apiSuccess({ svg, format: "svg" }, "QR code generated");
    }

    const dataUrl = await generateQrImage(id, game_id, round_id);
    return apiSuccess({ data_url: dataUrl, format: "png" }, "QR code generated");
  } catch (error) {
    console.error("Generate QR error:", error);
    return apiInternal("Failed to generate QR code");
  }
}
