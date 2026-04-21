import { execFileSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { PrismaClient } from "@prisma/client";

function resolveSqlitePath(sqliteUrl) {
  if (!sqliteUrl?.startsWith("file:")) {
    throw new Error(
      'SQLITE_DATABASE_URL must use the SQLite "file:" protocol, for example file:./dev.db',
    );
  }

  const rawPath = sqliteUrl.slice("file:".length);
  if (!rawPath) {
    throw new Error("SQLITE_DATABASE_URL is missing a file path.");
  }

  if (path.isAbsolute(rawPath)) {
    return rawPath;
  }

  return path.resolve(process.cwd(), "prisma", rawPath.replace(/^\.\//, ""));
}

function loadSqliteRows(sqliteFilePath) {
  const pythonScript = `
import json
import sqlite3
import sys

conn = sqlite3.connect(sys.argv[1])
conn.row_factory = sqlite3.Row

def read_table(name):
    rows = []
    for row in conn.execute(f'SELECT * FROM "{name}" ORDER BY rowid ASC'):
        rows.append(dict(row))
    return rows

payload = {
    "links": read_table("Link"),
    "clickLogs": read_table("ClickLog"),
}

print(json.dumps(payload, default=str))
`.trim();

  const output = execFileSync("python", ["-c", pythonScript, sqliteFilePath], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  return JSON.parse(output);
}

function toDateOrUndefined(value) {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl?.startsWith("postgresql://")) {
    throw new Error(
      "Set DATABASE_URL to your PostgreSQL database before running db:migrate-data.",
    );
  }

  const sqliteUrl = process.env.SQLITE_DATABASE_URL ?? "file:./dev.db";
  const sqliteFilePath = resolveSqlitePath(sqliteUrl);
  const { links, clickLogs } = loadSqliteRows(sqliteFilePath);

  const prisma = new PrismaClient({
    log: ["warn", "error"],
  });

  try {
    console.log(
      `Starting SQLite -> PostgreSQL migration from ${sqliteFilePath} (${links.length} links, ${clickLogs.length} click logs).`,
    );

    await prisma.$transaction(async (tx) => {
      for (const link of links) {
        await tx.link.upsert({
          where: { id: link.id },
          update: {
            shortCode: link.shortCode,
            title: link.title,
            primaryUrl: link.primaryUrl,
            fallbackUrl: link.fallbackUrl,
            status: link.status,
            note: link.note,
            clickCount: link.clickCount,
            createdAt: toDateOrUndefined(link.createdAt),
            updatedAt: toDateOrUndefined(link.updatedAt),
          },
          create: {
            id: link.id,
            shortCode: link.shortCode,
            title: link.title,
            primaryUrl: link.primaryUrl,
            fallbackUrl: link.fallbackUrl,
            status: link.status,
            note: link.note,
            clickCount: link.clickCount,
            createdAt: toDateOrUndefined(link.createdAt),
            updatedAt: toDateOrUndefined(link.updatedAt),
          },
        });
      }

      for (const clickLog of clickLogs) {
        await tx.clickLog.upsert({
          where: { id: clickLog.id },
          update: {
            linkId: clickLog.linkId,
            shortCode: clickLog.shortCode,
            ipAddress: clickLog.ipAddress,
            userAgent: clickLog.userAgent,
            referer: clickLog.referer,
            country: clickLog.country,
            deviceType: clickLog.deviceType,
            clickedAt: toDateOrUndefined(clickLog.clickedAt),
          },
          create: {
            id: clickLog.id,
            linkId: clickLog.linkId,
            shortCode: clickLog.shortCode,
            ipAddress: clickLog.ipAddress,
            userAgent: clickLog.userAgent,
            referer: clickLog.referer,
            country: clickLog.country,
            deviceType: clickLog.deviceType,
            clickedAt: toDateOrUndefined(clickLog.clickedAt),
          },
        });
      }
    });

    console.log("SQLite data migration completed successfully.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("SQLite -> PostgreSQL migration failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
