import fs from "node:fs";
import path from "node:path";

const envPath = path.join(process.cwd(), ".env");

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");

  for (const line of envContent.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const normalizedValue = rawValue.replace(/^"(.*)"$/, "$1");

    if (!(key in process.env)) {
      process.env[key] = normalizedValue;
    }
  }
}

const baseUrl =
  process.env.HEALTH_CHECK_BASE_URL ||
  process.env.NEXT_PUBLIC_BASE_URL ||
  "http://localhost:3000";

const secret = process.env.HEALTH_CHECK_SECRET;

if (!secret) {
  console.error("Missing HEALTH_CHECK_SECRET");
  process.exit(1);
}

const response = await fetch(`${baseUrl}/api/health-check/run`, {
  method: "POST",
  headers: {
    "x-health-check-secret": secret,
  },
});

const result = await response.json().catch(() => null);

if (!response.ok) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));
