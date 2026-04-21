import { NextRequest, NextResponse } from "next/server";
import { handleLinkVisit } from "@/lib/link-redirect";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest, context: { params: Promise<{ shortCode: string }> }) {
  const { shortCode } = await context.params;
  const link = await prisma.link.findUnique({
    where: { shortCode },
  });

  if (!link) {
    return NextResponse.json(
      { ok: false, error: { code: "LINK_NOT_FOUND", message: "ไม่พบลิงก์นี้" } },
      { status: 404 },
    );
  }

  const forceFallback = request.nextUrl.searchParams.get("forceFallback") === "1";
  return handleLinkVisit(request, link, { forceFallback });
}
