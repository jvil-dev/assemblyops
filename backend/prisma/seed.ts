/// <reference types="node" />
import { seedCircuits } from './seed/circuits.js';
import { seedVenues } from './seed/venues.js';
import { seedCongregations } from './seed/congregations.js';
import { seedEvents } from './seed/events.js';

async function main() {
  console.log('Starting seed...\n');

  // Seed in order: circuits → venues → congregations → events
  await seedCircuits();
  await seedVenues();
  await seedCongregations();
  await seedEvents();

  console.log('\nSeed complete!');
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  });
