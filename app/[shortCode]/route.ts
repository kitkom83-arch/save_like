import { NextRequest, NextResponse } from "next/server";
import { makeConsentCookieName } from "@/lib/consent";
import { requiresConsentBridge } from "@/lib/link-consent";
import { handleLinkVisit } from "@/lib/link-redirect";
import { parseLinkMetadata } from "@/lib/link-metadata";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest, context: { params: Promise<{ shortCode: string }> }) {
  const { shortCode } = await context.params;

  const link = await prisma.link.findUnique({
    where: { shortCode },
  });

  if (!link) {
    return NextResponse.json(
      { ok: false, error: { code: "LINK_NOT_FOUND", message: "ไม่พบลิงก์นี้" } },
      { status: 404 }
    );
  }

  const linkMetadata = parseLinkMetadata(link.note);
  const consentCookie = request.cookies.get(makeConsentCookieName(shortCode))?.value;

  if (link.status !== "paused" && requiresConsentBridge(linkMetadata) && !consentCookie) {
    const bridgeUrl = new URL(`/bridge/${encodeURIComponent(shortCode)}`, request.url);
    return NextResponse.redirect(bridgeUrl, 307);
  }

  return handleLinkVisit(request, link);
}
