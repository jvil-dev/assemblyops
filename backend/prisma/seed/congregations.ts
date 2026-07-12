/**
 * Seed script for Congregation data.
 * Reads congregations.csv and upserts each row into the Congregation table.
 * Links to circuits by code where present; leaves new congregations unlinked.
 * CSV columns: name, state, circuit, lang
 */

import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import prisma from '../../src/config/database.js';
import { parseCSV } from './parseCSV.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function seedCongregations() {
  const csvPath = resolve(__dirname, 'congregations.csv');
  const rows = parseCSV(csvPath);

  if (rows.length === 0) {
    console.log('No congregation data in CSV, skipping...');
    return;
  }

  // --- Remove stale congregations not in current CSV ---
  const csvNames = new Set(rows.map((r) => `${r.name}|${r.state}`));
  const existingCongregations = await prisma.congregation.findMany({
    select: { id: true, name: true, state: true },
  });

  const staleIds = existingCongregations
    .filter((c) => !csvNames.has(`${c.name}|${c.state}`))
    .map((c) => c.id);

  if (staleIds.length > 0) {
    // Unlink users referencing stale congregations before deleting
    await prisma.user.updateMany({
      where: { congregationId: { in: staleIds } },
      data: { congregationId: null },
    });
    await prisma.congregation.deleteMany({
      where: { id: { in: staleIds } },
    });
    console.log(`Removed ${staleIds.length} stale congregations`);
  }

  // --- Upsert congregations ---
  console.log(`Seeding ${rows.length} congregations...`);

  let seeded = 0;

  for (const row of rows) {
    const code = row.circuit?.trim();
    let circuitId: string | null = null;

    if (code) {
      const circuit = await prisma.circuit.findUnique({ where: { code } });
      if (circuit) circuitId = circuit.id;
      else console.warn(`  Circuit ${code} not in pool for "${row.name}" — leaving unlinked`);
    }

    await prisma.congregation.upsert({
      where: { name_state: { name: row.name, state: row.state } },
      update: {
        language: row.lang || 'en',
        ...(circuitId ? { circuitId } : {}), // never overwrite an existing link with null
      },
      create: {
        name: row.name,
        state: row.state,
        language: row.lang || 'en',
        circuitId,
      },
    });

    seeded++;
  }

  console.log(`Seeded ${seeded} congregations`);
}
