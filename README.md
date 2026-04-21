# Shortener Starter

ระบบย่อลิงก์แบบ self-hosted ด้วย Next.js App Router และ Prisma

รอบนี้ย้ายฐานข้อมูลหลักจาก SQLite local ไปเป็น PostgreSQL แบบพร้อมใช้งานจริง โดยพยายามคง Prisma models และโค้ดแอปเดิมให้มากที่สุด

## สถานะปัจจุบัน
- Next.js App Router
- Prisma `6.19.3`
- PostgreSQL เป็น datasource หลัก
- รองรับ create/edit/delete link, redirect, click log, dashboard, status controls, health check, QR, campaign metadata, privacy mode
- มีสคริปต์สำหรับย้ายข้อมูลจาก SQLite เดิมเข้า PostgreSQL

## สิ่งที่เปลี่ยนในรอบนี้
- `prisma/schema.prisma` เปลี่ยน datasource จาก `sqlite` เป็น `postgresql`
- migration หลักถูกปรับเป็น PostgreSQL SQL
- เพิ่ม scripts สำหรับ `migrate dev`, `migrate deploy`, `migrate status`
- เพิ่มสคริปต์ `scripts/migrate-sqlite-to-postgres.mjs`
- เพิ่ม `docker-compose.postgres.yml` สำหรับ local dev

## Models และ compatibility
โมเดลยังคงเดิม:
- `Link`
- `ClickLog`
- enum `LinkStatus`

จุดที่ปรับสำหรับ PostgreSQL:
- `LinkStatus` ใช้ PostgreSQL enum
- `DateTime` ใน migration ใช้ `TIMESTAMP(3)`
- relation และ unique index คงพฤติกรรมเดิม

ไม่มีการเปลี่ยนชื่อ model หรือ field

## Env ที่ต้องตั้ง
คัดลอก `.env.example` เป็น `.env`

ค่าหลักที่ต้องมี:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/shortener?schema=public"
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
HEALTH_CHECK_SECRET="change-me"
HEALTH_CHECK_BASE_URL="http://localhost:3000"
ALERT_WEBHOOK_URL=""
IP_GEO_PROVIDER="disabled"
IP_GEO_API_KEY=""
IP_GEO_TIMEOUT_MS="1500"
PRIVACY_MODE="balanced"
MASK_IP="true"
STORE_RAW_IP="true"
ENABLE_IP_ENRICHMENT="true"
ENABLE_EXACT_LOCATION="false"
ENABLE_FINGERPRINTING="false"
REQUIRE_CONSENT_FOR_ENRICHMENT="false"
```

ถ้าจะย้ายข้อมูลจาก SQLite เดิม ให้เพิ่ม:

```bash
SQLITE_DATABASE_URL="file:./dev.db"
```

หมายเหตุ:
- `DATABASE_URL` ต้องชี้ไป PostgreSQL เสมอ
- `SQLITE_DATABASE_URL` ใช้เฉพาะตอนรัน data migration
- ห้ามใส่ secret จริงลงใน repo

## Local Dev Flow
### ตัวเลือก 1: ใช้ Docker

```bash
docker compose -f docker-compose.postgres.yml up -d
```

จากนั้นรัน:

```bash
npm install
npm run prisma:generate
npm run prisma:migrate:deploy
npm run dev
```

### ตัวเลือก 2: ใช้ PostgreSQL ที่มีอยู่แล้ว
1. สร้าง database เช่น `shortener`
2. ตั้ง `DATABASE_URL`
3. รัน:

```bash
npm install
npm run prisma:generate
npm run prisma:migrate:deploy
npm run dev
```

## Development migration
ใช้เมื่อมีการแก้ schema เพิ่มเติมในเครื่อง dev:

```bash
npm run prisma:migrate:dev -- --name your_change_name
npm run prisma:generate
```

## Production / Staging Flow
หลัง deploy code และตั้ง env แล้ว ให้รันตามลำดับ:

```bash
npm install
npm run prisma:generate
npm run prisma:migrate:deploy
npm run build
npm run start
```

หลักการ:
- dev ใช้ `migrate dev`
- staging/prod ใช้ `migrate deploy`
- Prisma Client ใช้ env `DATABASE_URL` เดียวกับแอป

## Migration strategy
รอบนี้เตรียมไว้ 2 แบบ

### แบบที่ 1: Fresh production database
เหมาะกับระบบใหม่หรือยังไม่ต้องย้ายข้อมูลเก่า

ขั้นตอน:
1. สร้าง PostgreSQL database เปล่า
2. ตั้ง `DATABASE_URL`
3. รัน `npm run prisma:migrate:deploy`
4. รัน `npm run prisma:generate`
5. เปิดแอป

นี่เป็นแนวทางหลักที่ปลอดภัยที่สุดสำหรับ production เพราะใช้ migration history ของ Prisma โดยตรง

### แบบที่ 2: ย้ายข้อมูลจาก SQLite เดิม
เหมาะกับ repo นี้ถ้ามีข้อมูลอยู่ใน `prisma/dev.db`

ขั้นตอน:

```bash
npm run prisma:generate
npm run prisma:migrate:deploy
npm run db:migrate-data
```

สคริปต์จะ:
- อ่านข้อมูลจาก SQLite เดิม
- upsert `Link` ก่อน
- upsert `ClickLog` ทีหลังเพื่อรักษา relation
- รักษา `id`, `shortCode`, `status`, `clickCount`, timestamps และ click logs เท่าที่มีในฐานเดิม

ข้อกำหนด:
- ต้องมี Python ในเครื่องสำหรับอ่าน SQLite ผ่าน stdlib `sqlite3`
- `DATABASE_URL` ต้องชี้ไป PostgreSQL ปลายทาง
- `SQLITE_DATABASE_URL` ต้องชี้ไปไฟล์ SQLite เดิม

## คำสั่งที่มีให้ใช้
```bash
npm run dev
npm run build
npm run start
npm run prisma:generate
npm run prisma:migrate:dev -- --name your_change_name
npm run prisma:migrate:deploy
npm run prisma:status
npm run db:migrate-data
npm run health-check:run
```

## Rollback เบื้องต้น
Prisma ไม่มี `down migration` อัตโนมัติใน flow นี้ ดังนั้นแนวทาง rollback ที่ปลอดภัยคือ:
1. backup PostgreSQL ก่อน deploy migration
2. ถ้า deploy ล้ม ให้ rollback ที่ระดับฐานข้อมูลจาก snapshot/backup
3. rollback code กลับไปเวอร์ชันก่อนหน้า
4. รันแอปกับฐานข้อมูลที่ restore แล้ว

## สิ่งที่ควรทดสอบหลังย้ายฐาน
1. สร้างลิงก์ใหม่
2. แก้ไขลิงก์
3. ลบลิงก์
4. เปิด short link และเช็ก redirect
5. เช็ก click log
6. เปิด `/dashboard`
7. เปิด `/dashboard/links`
8. เปิด `/dashboard/links/[id]`
9. เช็ก status healthy / paused / broken
10. รัน health check
11. รัน production build

## ข้อจำกัดที่ยังควรรู้
- สคริปต์ย้ายข้อมูลจาก SQLite ใช้ Python ที่มากับเครื่อง ไม่ได้ bundle SQLite reader เพิ่มในโปรเจกต์
- ถ้าฐาน PostgreSQL ปลายทางมีข้อมูลชนกันอยู่แล้ว สคริปต์จะใช้ `upsert` ไม่ได้ลบข้อมูลเดิม
- local dev ต้องมี PostgreSQL จริงหรือ container ที่เข้าถึงได้
