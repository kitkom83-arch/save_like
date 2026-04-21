import { NextRequest, NextResponse } from "next/server";
import { sendFallbackUsageAlert } from "@/lib/alerts";
import { enrichIpAddress } from "@/lib/ip-enrichment";
import { maskIpForStorage } from "@/lib/ip-mask";
import { getPrivacyConfig } from "@/lib/privacy-config";
import { prisma } from "@/lib/prisma";
import { parseRequestMetadata } from "@/lib/request-metadata";

type LinkRecord = {
  id: string;
  shortCode: string;
  title: string;
  primaryUrl: string;
  fallbackUrl: string;
  status: "healthy" | "broken" | "paused";
  clickCount: number;
};

type VisitOptions = {
  forceFallback?: boolean;
};

export async function handleLinkVisit(request: NextRequest, link: LinkRecord, options?: VisitOptions) {
  if (link.status === "paused") {
    const pausedUrl = new URL(`/paused?code=${encodeURIComponent(link.shortCode)}`, request.url);
    return NextResponse.redirect(pausedUrl, 307);
  }

  const metadata = parseRequestMetadata(request);
  const privacy = getPrivacyConfig();
  const maskedIp = privacy.storeRawIp ? metadata.ipAddress : maskIpForStorage(metadata.ipAddress);
  const geo =
    privacy.enableIpEnrichment && !privacy.requireConsentForEnrichment
      ? await enrichIpAddress(metadata.ipAddress)
      : null;

  await prisma.$transaction([
    prisma.clickLog.create({
      data: {
        linkId: link.id,
        shortCode: link.shortCode,
        ipAddress: maskedIp,
        userAgent: metadata.userAgent,
        referer: metadata.referer,
        country: geo?.country,
        deviceType: metadata.deviceType,
      },
    }),
    prisma.link.update({
      where: { id: link.id },
      data: { clickCount: { increment: 1 } },
    }),
  ]);

  const destination =
    link.status === "broken" || options?.forceFallback ? link.fallbackUrl : link.primaryUrl;

  if (link.status === "broken" || options?.forceFallback) {
    await sendFallbackUsageAlert({
      shortCode: link.shortCode,
      title: link.title,
      primaryUrl: link.primaryUrl,
      fallbackUrl: link.fallbackUrl,
      status: link.status === "broken" ? link.status : "healthy",
      checkedAt: new Date().toISOString(),
      reason: options?.forceFallback ? "fallback redirect triggered after reject policy" : "fallback redirect triggered",
      clickCount: link.clickCount + 1,
    });
  }

  return NextResponse.redirect(destination, 302);
}
