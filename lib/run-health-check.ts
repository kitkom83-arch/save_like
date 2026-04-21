import { sendBrokenAlert } from "@/lib/alerts";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { checkLinkHealth } from "@/lib/link-health";

type HealthCheckResultItem = {
  id: string;
  shortCode: string;
  statusBefore: string;
  statusAfter: string;
  ok: boolean;
  reason?: string;
  httpStatus?: number;
};

export type HealthCheckSummary = {
  checked: number;
  broken: number;
  recovered: number;
  skipped: number;
  results: HealthCheckResultItem[];
};

function revalidateHealthCheckPaths(linkIds: string[]) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/links");

  for (const id of linkIds) {
    revalidatePath(`/dashboard/links/${id}`);
  }
}

export async function runHealthCheckForLink(linkId: string) {
  const link = await prisma.link.findUnique({
    where: { id: linkId },
    select: {
      id: true,
      shortCode: true,
      title: true,
      primaryUrl: true,
      fallbackUrl: true,
      status: true,
    },
  });

  if (!link) {
    return null;
  }

  if (link.status === "paused") {
    return {
      checked: 0,
      broken: 0,
      recovered: 0,
      skipped: 1,
      results: [
        {
          id: link.id,
          shortCode: link.shortCode,
          statusBefore: link.status,
          statusAfter: link.status,
          ok: true,
          reason: "skipped paused link",
        },
      ],
    } satisfies HealthCheckSummary;
  }

  const health = await checkLinkHealth(link.primaryUrl);
  let statusAfter = link.status;
  let broken = 0;
  let recovered = 0;

  if (!health.ok && link.status !== "broken") {
    await prisma.link.update({
      where: { id: link.id },
      data: { status: "broken" },
    });
    await sendBrokenAlert({
      shortCode: link.shortCode,
      title: link.title,
      primaryUrl: link.primaryUrl,
      fallbackUrl: link.fallbackUrl,
      status: "broken",
      checkedAt: new Date().toISOString(),
      reason: health.reason,
    });
    statusAfter = "broken";
    broken = 1;
    revalidateHealthCheckPaths([link.id]);
  } else if (health.ok && link.status === "broken") {
    await prisma.link.update({
      where: { id: link.id },
      data: { status: "healthy" },
    });
    statusAfter = "healthy";
    recovered = 1;
    revalidateHealthCheckPaths([link.id]);
  }

  return {
    checked: 1,
    broken,
    recovered,
    skipped: 0,
    results: [
      {
        id: link.id,
        shortCode: link.shortCode,
        statusBefore: link.status,
        statusAfter,
        ok: health.ok,
        reason: health.reason,
        httpStatus: health.httpStatus,
      },
    ],
  } satisfies HealthCheckSummary;
}

export async function runHealthCheckForAllLinks(): Promise<HealthCheckSummary> {
  const links = await prisma.link.findMany({
    select: {
      id: true,
      shortCode: true,
      title: true,
      primaryUrl: true,
      fallbackUrl: true,
      status: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  const summary: HealthCheckSummary = {
    checked: 0,
    broken: 0,
    recovered: 0,
    skipped: 0,
    results: [],
  };

  const changedIds: string[] = [];

  for (const link of links) {
    if (link.status === "paused") {
      summary.skipped += 1;
      summary.results.push({
        id: link.id,
        shortCode: link.shortCode,
        statusBefore: link.status,
        statusAfter: link.status,
        ok: true,
        reason: "skipped paused link",
      });
      continue;
    }

    summary.checked += 1;
    const health = await checkLinkHealth(link.primaryUrl);
    let statusAfter = link.status;

    if (!health.ok && link.status !== "broken") {
      await prisma.link.update({
        where: { id: link.id },
        data: { status: "broken" },
      });
      await sendBrokenAlert({
        shortCode: link.shortCode,
        title: link.title,
        primaryUrl: link.primaryUrl,
        fallbackUrl: link.fallbackUrl,
        status: "broken",
        checkedAt: new Date().toISOString(),
        reason: health.reason,
      });
      statusAfter = "broken";
      summary.broken += 1;
      changedIds.push(link.id);
    } else if (health.ok && link.status === "broken") {
      await prisma.link.update({
        where: { id: link.id },
        data: { status: "healthy" },
      });
      statusAfter = "healthy";
      summary.recovered += 1;
      changedIds.push(link.id);
    }

    summary.results.push({
      id: link.id,
      shortCode: link.shortCode,
      statusBefore: link.status,
      statusAfter,
      ok: health.ok,
      reason: health.reason,
      httpStatus: health.httpStatus,
    });
  }

  if (changedIds.length > 0) {
    revalidateHealthCheckPaths(changedIds);
  }

  return summary;
}
