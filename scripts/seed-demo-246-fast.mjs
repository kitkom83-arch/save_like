import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

const TOTAL = 246;
const TARGET_URL = 'https://maha289.com/';
const START = new Date(new Date().getFullYear(), 3, 1, 9, 0, 0); // 1 เม.ย.
const END = new Date();
const NAME_PREFIX = 'DEMO';
const SHORT_PREFIX = 'mk';

const norm = (s) => String(s || '').replace(/[_\-\s]/g, '').toLowerCase();
const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const enumMap = Object.fromEntries(
  (Prisma.dmmf.datamodel.enums || []).map((e) => [e.name, e.values.map((v) => v.name)])
);

function findField(model, names, filterFn = null) {
  const wanted = names.map(norm);
  return (
    model.fields.find((f) => wanted.includes(norm(f.name)) && (!filterFn || filterFn(f))) ||
    model.fields.find((f) => names.some((n) => norm(f.name).includes(norm(n))) && (!filterFn || filterFn(f)))
  );
}

function getDelegate(modelName) {
  const keys = Object.keys(prisma).filter((k) => prisma[k] && typeof prisma[k].findMany === 'function');
  const lower = modelName.toLowerCase();
  const key =
    keys.find((k) => k.toLowerCase() === lower) ||
    keys.find((k) => k.toLowerCase() === lower[0] + lower.slice(1));
  if (!key) throw new Error(`หา Prisma delegate ของ model ${modelName} ไม่เจอ`);
  return prisma[key];
}

function scoreLinkModel(model) {
  let score = 0;
  const n = model.name.toLowerCase();
  if (n.includes('link')) score += 10;
  if (findField(model, ['shortCode', 'short_code', 'slug', 'code', 'alias'])) score += 8;
  if (findField(model, ['primaryUrl', 'primary_url', 'url', 'destinationUrl', 'targetUrl', 'originalUrl'])) score += 8;
  if (findField(model, ['status'])) score += 4;
  if (findField(model, ['createdAt'])) score += 2;
  return score;
}

function resolveEnumValue(field, wanted) {
  const values = enumMap[field.type] || [];
  if (!values.length) return wanted;
  const w = norm(wanted);
  return values.find((v) => norm(v) === w) || values.find((v) => norm(v).includes(w)) || values[0];
}

function buildStatus(i) {
  const r = i % 20;
  if (r === 0 || r === 11) return 'broken';
  if (r === 5 || r === 16) return 'paused';
  return 'healthy';
}

function buildCreatedAt(i) {
  const start = START.getTime();
  const end = END.getTime();
  const slot = start + Math.floor(((end - start) / Math.max(TOTAL - 1, 1)) * i);
  const d = new Date(slot);
  d.setHours(rnd(7, 22), rnd(0, 59), rnd(0, 59), 0);
  return d;
}

function buildUpdatedAt(createdAt) {
  return new Date(rnd(createdAt.getTime(), END.getTime()));
}

function fillRequiredScalars(model, data, i, clicks, createdAt, updatedAt, statusRaw) {
  for (const field of model.fields) {
    if (data[field.name] !== undefined) continue;
    if ((field.kind !== 'scalar' && field.kind !== 'enum') || !field.isRequired || field.hasDefaultValue) continue;

    const n = norm(field.name);

    if (field.kind === 'enum') {
      data[field.name] = resolveEnumValue(field, statusRaw);
      continue;
    }

    if (field.type === 'String') {
      if (n.includes('url')) data[field.name] = TARGET_URL;
      else if (n.includes('ip')) data[field.name] = `49.228.${rnd(1, 254)}.${rnd(1, 254)}`;
      else if (n.includes('country')) data[field.name] = 'TH';
      else if (n.includes('city')) data[field.name] = 'Bangkok';
      else if (n.includes('region')) data[field.name] = 'Bangkok';
      else if (n.includes('browser')) data[field.name] = 'Chrome';
      else if (n === 'os' || n.includes('operating')) data[field.name] = 'Android';
      else if (n.includes('device')) data[field.name] = 'mobile';
      else data[field.name] = `${NAME_PREFIX}-${field.name}-${String(i + 1).padStart(3, '0')}`;
    } else if (field.type === 'Int') {
      data[field.name] = clicks;
    } else if (field.type === 'BigInt') {
      data[field.name] = BigInt(clicks);
    } else if (field.type === 'Boolean') {
      data[field.name] = statusRaw !== 'broken';
    } else if (field.type === 'DateTime') {
      data[field.name] = n.includes('created') ? createdAt : updatedAt;
    } else if (field.type === 'Json') {
      data[field.name] = {};
    }
  }
}

async function main() {
  const models = Prisma.dmmf.datamodel.models;
  const linkModel = [...models].sort((a, b) => scoreLinkModel(b) - scoreLinkModel(a))[0];

  if (!linkModel || scoreLinkModel(linkModel) < 10) {
    throw new Error('หา Link model ไม่เจอ');
  }

  const db = getDelegate(linkModel.name);

  const nameField = findField(linkModel, ['name', 'title', 'label'], (f) => f.kind === 'scalar' && f.type === 'String');
  const shortField = findField(linkModel, ['shortCode', 'short_code', 'slug', 'code', 'alias'], (f) => f.kind === 'scalar' && f.type === 'String');
  const primaryField = findField(linkModel, ['primaryUrl', 'primary_url', 'url', 'destinationUrl', 'targetUrl', 'originalUrl'], (f) => f.kind === 'scalar' && f.type === 'String');
  const fallbackField = findField(linkModel, ['fallbackUrl', 'fallback_url', 'backupUrl', 'secondaryUrl'], (f) => f.kind === 'scalar' && f.type === 'String');
  const campaignField = findField(linkModel, ['campaignName', 'campaign', 'sourceName'], (f) => f.kind === 'scalar' && f.type === 'String');
  const sourceField = findField(linkModel, ['source'], (f) => f.kind === 'scalar' && f.type === 'String');
  const mediumField = findField(linkModel, ['medium'], (f) => f.kind === 'scalar' && f.type === 'String');
  const statusField = findField(linkModel, ['status'], (f) => f.kind === 'enum' || (f.kind === 'scalar' && f.type === 'String'));
  const clicksField = findField(linkModel, ['clickCount', 'clicks', 'totalClicks', 'visitCount'], (f) => f.kind === 'scalar' && ['Int', 'BigInt'].includes(f.type));
  const createdField = findField(linkModel, ['createdAt', 'created_at'], (f) => f.kind === 'scalar' && f.type === 'DateTime');
  const updatedField = findField(linkModel, ['updatedAt', 'updated_at'], (f) => f.kind === 'scalar' && f.type === 'DateTime');
  const lastClickedField = findField(linkModel, ['lastClickedAt', 'last_clicked_at'], (f) => f.kind === 'scalar' && f.type === 'DateTime');

  // ลบ DEMO เดิมออกก่อน เพื่อรันซ้ำได้
  const orWhere = [];
  if (nameField) orWhere.push({ [nameField.name]: { startsWith: NAME_PREFIX } });
  if (shortField) orWhere.push({ [shortField.name]: { startsWith: SHORT_PREFIX } });
  if (orWhere.length) {
    await db.deleteMany({ where: { OR: orWhere } }).catch(() => {});
  }

  let maxClicks = 0;

  for (let i = 0; i < TOTAL; i++) {
    const createdAt = buildCreatedAt(i);
    const updatedAt = buildUpdatedAt(createdAt);
    const statusRaw = buildStatus(i);

    let clicks = rnd(1000, 14500);
    if (i === TOTAL - 1) clicks = 14500; // ให้มีสูงสุดตามที่ขอ
    if (clicks > maxClicks) maxClicks = clicks;

    const data = {};

    if (nameField) data[nameField.name] = `${NAME_PREFIX} ${String(i + 1).padStart(3, '0')}`;
    if (shortField) data[shortField.name] = `${SHORT_PREFIX}${String(i + 1).padStart(3, '0')}`;
    if (primaryField) data[primaryField.name] = TARGET_URL;
    if (fallbackField) data[fallbackField.name] = TARGET_URL;
    if (campaignField) data[campaignField.name] = `${NAME_PREFIX} Campaign ${String(i + 1).padStart(3, '0')}`;
    if (sourceField) {
      const pool = ['facebook', 'line', 'tiktok', 'x', 'direct'];
      data[sourceField.name] = pool[i % pool.length];
    }
    if (mediumField) data[mediumField.name] = 'social';
    if (statusField) data[statusField.name] = statusField.kind === 'enum' ? resolveEnumValue(statusField, statusRaw) : statusRaw;
    if (clicksField) data[clicksField.name] = clicksField.type === 'BigInt' ? BigInt(clicks) : clicks;
    if (createdField) data[createdField.name] = createdAt;
    if (updatedField) data[updatedField.name] = updatedAt;
    if (lastClickedField) data[lastClickedField.name] = updatedAt;

    fillRequiredScalars(linkModel, data, i, clicks, createdAt, updatedAt, statusRaw);

    await db.create({ data });
    if ((i + 1) % 25 === 0) console.log(`สร้างแล้ว ${i + 1}/${TOTAL}`);
  }

  console.log('เสร็จแล้ว');
  console.log(`ลิงก์ทั้งหมด: ${TOTAL}`);
  console.log(`ปลายทางทั้งหมด: ${TARGET_URL}`);
  console.log(`คลิกสูงสุด: ${maxClicks}`);
  console.log(`ช่วงวันที่: ${START.toLocaleDateString('th-TH')} -> ${END.toLocaleDateString('th-TH')}`);
}

main()
  .catch((e) => {
    console.error('ERROR:', e.message);
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });