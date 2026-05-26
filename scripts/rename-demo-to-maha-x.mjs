import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

const norm = (s) => String(s || '').replace(/[_\-\s]/g, '').toLowerCase();

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

const TITLE_PATTERNS = [
  'MAHA X Main',
  'MAHA X DM',
  'MAHA X Chat',
  'MAHA X Boost',
  'MAHA X Retarget',
  'MAHA X Push',
  'MAHA X Night',
  'MAHA X Profile',
];

const CAMPAIGN_PATTERNS = [
  'MAHA X Main Funnel',
  'MAHA X DM Reply',
  'MAHA X Chat Push',
  'MAHA X Traffic Boost',
  'MAHA X Retarget Wave',
  'MAHA X Push Daily',
  'MAHA X Night Traffic',
  'MAHA X Profile Visit',
];

const CODE_PATTERNS = [
  'xm',
  'xdm',
  'xch',
  'xbs',
  'xrt',
  'xps',
  'xnt',
  'xpf',
];

function monthLabel(d) {
  if (!(d instanceof Date)) return 'APR';
  const m = d.getMonth() + 1;
  if (m === 4) return 'APR';
  if (m === 5) return 'MAY';
  return `M${String(m).padStart(2, '0')}`;
}

function makeUniqueShort(i, used) {
  const pad = String(i + 1).padStart(3, '0');
  const first = `${CODE_PATTERNS[i % CODE_PATTERNS.length]}${pad}`.toLowerCase();
  if (!used.has(first)) {
    used.add(first);
    return first;
  }

  const second = `x${pad}`.toLowerCase();
  if (!used.has(second)) {
    used.add(second);
    return second;
  }

  const third = `mx${pad}`.toLowerCase();
  used.add(third);
  return third;
}

async function main() {
  const models = Prisma.dmmf.datamodel.models;
  const linkModel = [...models].sort((a, b) => scoreLinkModel(b) - scoreLinkModel(a))[0];

  if (!linkModel || scoreLinkModel(linkModel) < 10) {
    throw new Error('หา Link model ไม่เจอ');
  }

  const db = getDelegate(linkModel.name);

  const idField = linkModel.fields.find((f) => f.isId);
  if (!idField) throw new Error('หา id field ไม่เจอ');

  const nameField = findField(linkModel, ['name', 'title', 'label'], (f) => f.kind === 'scalar' && f.type === 'String');
  const shortField = findField(linkModel, ['shortCode', 'short_code', 'slug', 'code', 'alias'], (f) => f.kind === 'scalar' && f.type === 'String');
  const campaignField = findField(linkModel, ['campaignName', 'campaign', 'utmCampaign'], (f) => f.kind === 'scalar' && f.type === 'String');
  const sourceField = findField(linkModel, ['source', 'sourceName', 'utmSource'], (f) => f.kind === 'scalar' && f.type === 'String');
  const mediumField = findField(linkModel, ['medium', 'mediumName', 'utmMedium'], (f) => f.kind === 'scalar' && f.type === 'String');
  const createdField = findField(linkModel, ['createdAt', 'created_at'], (f) => f.kind === 'scalar' && f.type === 'DateTime');
  const updatedField = findField(linkModel, ['updatedAt', 'updated_at'], (f) => f.kind === 'scalar' && f.type === 'DateTime');

  if (!nameField && !shortField) {
    throw new Error('หา field ชื่อ หรือ รหัสสั้น ไม่เจอ');
  }

  const whereOr = [];
  if (nameField) whereOr.push({ [nameField.name]: { startsWith: 'DEMO' } });
  if (shortField) whereOr.push({ [shortField.name]: { startsWith: 'mk' } });

  if (!whereOr.length) {
    throw new Error('หาเงื่อนไข target ไม่เจอ');
  }

  const select = {
    [idField.name]: true,
  };
  if (nameField) select[nameField.name] = true;
  if (shortField) select[shortField.name] = true;
  if (createdField) select[createdField.name] = true;
  if (updatedField) select[updatedField.name] = true;

  const orderBy = createdField ? { [createdField.name]: 'asc' } : { [idField.name]: 'asc' };

  const targets = await db.findMany({
    where: { OR: whereOr },
    orderBy,
    select,
  });

  if (!targets.length) {
    console.log('ไม่เจอลิงก์ DEMO / mk ให้แก้');
    return;
  }

  const allSelect = {
    [idField.name]: true,
  };
  if (shortField) allSelect[shortField.name] = true;

  const allRows = shortField ? await db.findMany({ select: allSelect }) : [];
  const targetIdSet = new Set(targets.map((r) => String(r[idField.name])));
  const usedShorts = new Set(
    shortField
      ? allRows
          .filter((r) => !targetIdSet.has(String(r[idField.name])))
          .map((r) => String(r[shortField.name] || '').toLowerCase())
          .filter(Boolean)
      : []
  );

  for (let i = 0; i < targets.length; i++) {
    const row = targets[i];
    const pad = String(i + 1).padStart(3, '0');
    const idx = i % TITLE_PATTERNS.length;
    const mLabel = createdField ? monthLabel(row[createdField.name]) : 'APR';
    const wave = String(Math.floor(i / 12) + 1).padStart(2, '0');

    const data = {};

    if (nameField) data[nameField.name] = `${TITLE_PATTERNS[idx]} ${pad}`;
    if (shortField) data[shortField.name] = makeUniqueShort(i, usedShorts);
    if (campaignField) data[campaignField.name] = `${CAMPAIGN_PATTERNS[idx]} ${mLabel}-${wave}`;
    if (sourceField) data[sourceField.name] = 'x';
    if (mediumField) data[mediumField.name] = 'twitter';

    // พยายามคงเวลา updated เดิมไว้
    if (updatedField && row[updatedField.name]) {
      data[updatedField.name] = row[updatedField.name];
    }

    await db.update({
      where: { [idField.name]: row[idField.name] },
      data,
    });

    if ((i + 1) % 25 === 0) {
      console.log(`แก้แล้ว ${i + 1}/${targets.length}`);
    }
  }

  console.log('เสร็จแล้ว');
  console.log(`แก้ชื่อ/รหัส/แคมเปญทั้งหมด ${targets.length} รายการ`);
  console.log('ชื่อ = MAHA X ...');
  console.log('แหล่งที่มา = x');
  console.log('สื่อ = twitter');
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