import type { Prisma } from "@prisma/client";
import { buildCsv, csvResponse } from "@/lib/csv";
import { parseLinkMetadata } from "@/lib/link-metadata";
import { prisma } from "@/lib/prisma";

const statusValues = ["healthy", "broken", "paused"] as const;

function getParam(url: URL, key: string) {
  return (url.searchParams.get(key) || "").trim();
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = getParam(url, "q");
  const status = getParam(url, "status");
  const sort = getParam(url, "sort");
  const where: Prisma.LinkWhereInput = {};

  if (query) {
    where.OR = [
      { title: { contains: query, mode: "insensitive" } },
      { shortCode: { contains: query, mode: "insensitive" } },
    ];
  }

  if (statusValues.includes(status as (typeof statusValues)[number])) {
    where.status = status as (typeof statusValues)[number];
  }

  const orderBy: Prisma.LinkOrderByWithRelationInput =
    sort === "clicks"
      ? { clickCount: "desc" }
      : sort === "newest"
        ? { createdAt: "desc" }
        : { updatedAt: "desc" };

  const links = await prisma.link.findMany({
    where,
    orderBy,
    include: {
      _count: { select: { clickLogs: true } },
      clickLogs: {
        orderBy: { clickedAt: "desc" },
        take: 1,
        select: { clickedAt: true },
      },
    },
  });

  const csv = buildCsv(
    [
      "id",
      "title",
      "shortCode",
      "primaryUrl",
      "fallbackUrl",
      "campaign",
      "source",
      "medium",
      "status",
      "clickCount",
      "clickLogs",
      "lastClick",
      "createdAt",
      "updatedAt",
    ],
    links.map((link) => {
      const metadata = parseLinkMetadata(link.note);
      return [
        link.id,
        link.title,
        link.shortCode,
        link.primaryUrl,
        link.fallbackUrl,
        metadata.campaignName,
        metadata.source,
        metadata.medium,
        link.status,
        link.clickCount,
        link._count.clickLogs,
        link.clickLogs[0]?.clickedAt ?? "",
        link.createdAt,
        link.updatedAt,
      ];
    }),
  );

  return csvResponse(csv, "links-export.csv");
}
