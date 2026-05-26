import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

function norm(s) {
  return String(s || '').replace(/[_\-\s]/g, '').toLowerCase();
}

function getDelegate(modelName) {
  const keys = Object.keys(prisma).filter(
    (k) => prisma[k] && typeof prisma[k].deleteMany === 'function'
  );

  const lower = modelName.toLowerCase();

  const key =
    keys.find((k) => k.toLowerCase() === lower) ||
    keys.find((k) => k.toLowerCase() === lower[0] + lower.slice(1));

  if (!key) {
    throw new Error(`หา Prisma delegate ของ model ${modelName} ไม่เจอ`);
  }

  return prisma[key];
}

function hasField(model, names) {
  const wanted = names.map(norm);
  return model.fields.some((f) => wanted.includes(norm(f.name)));
}

function scoreLinkModel(model) {
  let score = 0;

  if (norm(model.name).includes('link')) score += 20;
  if (hasField(model, ['shortCode', 'short_code', 'slug', 'code', 'alias'])) score += 10;
  if (hasField(model, ['primaryUrl', 'primary_url', 'url', 'destinationUrl', 'targetUrl', 'originalUrl'])) score += 10;
  if (hasField(model, ['status'])) score += 5;
  if (hasField(model, ['createdAt'])) score += 3;

  return score;
}

function modelHasFkTo(model, targetModelName) {
  return model.fields.some((field) => {
    return (
      field.kind === 'object' &&
      field.type === targetModelName &&
      Array.isArray(field.relationFromFields) &&
      field.relationFromFields.length > 0
    );
  });
}

function findDeleteTargets(models, linkModel) {
  const targets = new Map();

  targets.set(linkModel.name, {
    model: linkModel,
    depth: 0,
  });

  let changed = true;

  while (changed) {
    changed = false;

    for (const model of models) {
      if (targets.has(model.name)) continue;

      for (const target of targets.values()) {
        if (modelHasFkTo(model, target.model.name)) {
          targets.set(model.name, {
            model,
            depth: target.depth + 1,
          });
          changed = true;
          break;
        }
      }
    }
  }

  return [...targets.values()].sort((a, b) => b.depth - a.depth);
}

async function main() {
  const models = Prisma.dmmf.datamodel.models;

  const linkModel = [...models].sort((a, b) => scoreLinkModel(b) - scoreLinkModel(a))[0];

  if (!linkModel || scoreLinkModel(linkModel) < 20) {
    throw new Error('หา Link model ไม่เจอ');
  }

  const targets = findDeleteTargets(models, linkModel);

  console.log('จะล้างข้อมูลจาก model เหล่านี้:');
  console.log('--------------------------------');

  for (const item of targets) {
    const db = getDelegate(item.model.name);
    const count = await db.count();
    console.log(`${item.model.name}: ${count} rows`);
  }

  console.log('--------------------------------');

  if (process.env.CLEAR_ALL_LINKS !== 'YES') {
    console.log('ยังไม่ลบจริง');
    console.log('ถ้าต้องการลบจริง ให้รัน:');
    console.log('$env:CLEAR_ALL_LINKS="YES"');
    console.log('node .\\scripts\\clear-all-links.mjs');
    return;
  }

  console.log('เริ่มลบจริง...');

  for (const item of targets) {
    const db = getDelegate(item.model.name);
    const result = await db.deleteMany({});
    console.log(`ลบ ${item.model.name}: ${result.count} rows`);
  }

  console.log('เสร็จแล้ว ล้างลิงก์ทั้งหมดเรียบร้อย');
}

main()
  .catch((error) => {
    console.error('ERROR:', error.message);
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });