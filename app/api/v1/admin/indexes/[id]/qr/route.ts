import { NextRequest } from "next/server";
import { apiSuccess, apiInternal, apiForbidden } from "@/lib/types/api";
import { generateQrImage, generateQrSvg } from "@/lib/qr/generator";

function requireMentor(request: NextRequest): string | null {
  const userId = request.headers.get("x-user-id");
  const role = request.headers.get("x-user-role");
  if (!userId || role !== "MENTOR") return null;
  return userId;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = requireMentor(request);
    if (!userId) return apiForbidden("Mentor access required");

    const { id } = await params;
    const body = await request.json();
    const { game_id, round_id, format = "png" } = body;

    if (!game_id || !round_id) {
      return apiInternal("game_id and round_id are required");
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
