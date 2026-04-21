import { NextResponse } from "next/server";
import { createAdminSession } from "@/lib/auth";

export async function POST(request: Request) {
  const configuredPin = process.env.ADMIN_LOGIN_PIN || "";
  if (!configuredPin) {
    return NextResponse.json(
      { ok: false, error: { code: "CONFIG_MISSING", message: "ADMIN_LOGIN_PIN is missing" } },
      { status: 500 },
    );
  }

  let pin = "";
  try {
    const body = (await request.json()) as { pin?: string };
    pin = typeof body?.pin === "string" ? body.pin.trim() : "";
  } catch {
    pin = "";
  }

  if (pin !== configuredPin) {
    return NextResponse.json(
      { ok: false, error: { code: "INVALID_PIN", message: "Invalid PIN" } },
      { status: 401 },
    );
  }

  const session = await createAdminSession();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(session.name, session.value, session.options);
  return response;
}
