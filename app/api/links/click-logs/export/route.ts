import { buildCsv, csvResponse } from "@/lib/csv";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const linkId = (url.searchParams.get("linkId") || "").trim();

  const logs = await prisma.clickLog.findMany({
    where: linkId ? { linkId } : undefined,
    orderBy: { clickedAt: "desc" },
    include: {
      link: {
        select: {
          title: true,
          primaryUrl: true,
          fallbackUrl: true,
          status: true,
        },
      },
    },
  });

  const csv = buildCsv(
    [
      "id",
      "linkId",
      "title",
      "shortCode",
      "outcome",
      "ipAddress",
      "country",
      "deviceType",
      "referer",
      "userAgent",
      "clickedAt",
      "linkStatus",
      "primaryUrl",
      "fallbackUrl",
    ],
    logs.map((log) => [
      log.id,
      log.linkId,
      log.link.title,
      log.shortCode,
      log.outcome,
      log.ipAddress,
      log.country,
      log.deviceType,
      log.referer,
      log.userAgent,
      log.clickedAt,
      log.link.status,
      log.link.primaryUrl,
      log.link.fallbackUrl,
    ]),
  );

  return csvResponse(csv, linkId ? `click-logs-${linkId}.csv` : "click-logs-export.csv");
}
