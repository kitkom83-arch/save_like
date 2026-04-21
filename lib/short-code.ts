import { prisma } from "@/lib/prisma";

const CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

export function makeShortCode(length = 6) {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
  }
  return result;
}

export async function generateUniqueShortCode() {
  for (let i = 0; i < 10; i++) {
    const code = makeShortCode(6);
    const existing = await prisma.link.findUnique({
      where: { shortCode: code },
      select: { id: true },
    });
    if (!existing) return code;
  }

  throw new Error("สร้าง shortCode ไม่สำเร็จ");
}
