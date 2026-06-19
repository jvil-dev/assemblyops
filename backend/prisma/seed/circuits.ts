/**
 * Seed script for Circuit data
 * Reads circuit.csv and upserts each row into the Circuit table by code
 * Derives region from the 2-letter state
 * CSV columns: circuit, state lang
 */

import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import prisma from '../../src/config/database.js';
import { parseCSV } from './parseCSV.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function seedCircuits() {
  const csvPath = resolve(__dirname, 'circuits.csv');
  const rows = parseCSV(csvPath);

  if (rows.length === 0) {
    console.log('No circuit data in CSV, skipping...');
    return;
  }

  console.log(`Seeding ${rows.length} circuits...`);

  for (const row of rows) {
    const region = `US-${row.state.toUpperCase()}`;
    await prisma.circuit.upsert({
      where: { code: row.circuit },
      update: { region, language: row.lang || 'en' },
      create: { code: row.circuit, region, language: row.lang || 'en' },
    });
  }

  console.log(`Upserted ${rows.length} circuits`);
}
