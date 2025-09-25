#!/usr/bin/env node

const fs = require('node:fs/promises');
const path = require('node:path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const SOURCE_FILE = '234.txt';

async function readCatalog() {
  const repoRoot = path.resolve(__dirname, '..', '..');
  const filePath = path.join(repoRoot, SOURCE_FILE);

  const raw = await fs.readFile(filePath, 'utf8');
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const items = lines.map((line, index) => {
    const parts = line.split('\t');

    if (parts.length < 3) {
      throw new Error(
        `Invalid line ${index + 1} in ${SOURCE_FILE}: expected "<type>\t<title>\t<price>", got "${line}"`
      );
    }

    const type = (parts[0] ?? '').trim();
    const priceRaw = (parts[parts.length - 1] ?? '').trim();
    const title = parts.slice(1, -1).join('\t').trim();

    if (!type || !title || !priceRaw) {
      throw new Error(
        `Invalid line ${index + 1} in ${SOURCE_FILE}: expected "<type>\t<title>\t<price>", got "${line}"`
      );
    }

    const normalizedPrice = priceRaw.replace(/\s+/g, '').replace(',', '.');
    const numericPrice = Number(normalizedPrice);

    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      throw new Error(
        `Invalid price at line ${index + 1} in ${SOURCE_FILE}: "${priceRaw}"`
      );
    }

    const priceCents = Math.round(numericPrice * 100);

    return {
      type,
      title,
      price: priceCents,
      sortOrder: index + 1,
    };
  });

  return items;
}

async function main() {
  const items = await readCatalog();

  await prisma.$transaction(async (tx) => {
    await tx.orderItem.deleteMany();
    await tx.literature.deleteMany();
    await tx.literature.createMany({ data: items });
  });

  console.log(`Imported ${items.length} literature items from ${SOURCE_FILE}.`);
}

main()
  .catch((error) => {
    console.error('Failed to import literature catalog:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
