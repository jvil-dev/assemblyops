/**
 * Seed script for Venue data.
 * Reads venues.csv and upserts each row into the Venue table by (name, state).
 * Derives region from the 2-letter state (e.g. "MA" → "US-MA").
 * CSV columns: name, address, state
 */

import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import prisma from '../../src/config/database.js';
import { parseCSV } from './parseCSV.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function seedVenues() {
  const csvPath = resolve(__dirname, 'venues.csv');
  const rows = parseCSV(csvPath);

  if (rows.length === 0) {
    console.log('No venue data in CSV, skipping...');
    return;
  }

  console.log(`Seeding ${rows.length} venues...`);

  for (const row of rows) {
    const region = `US-${row.state.toUpperCase()}`;
    await prisma.venue.upsert({
      where: { name_state: { name: row.name, state: row.state } },
      update: { address: row.address, region },
      create: { name: row.name, address: row.address, state: row.state, region },
    });
  }

  console.log(`Upserted ${rows.length} venues`);
}
