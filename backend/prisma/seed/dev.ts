/**
 * Deterministic dev-branch seed.
 * Resets the dev database, then seeds a fixed set of users, events,
 * departments, and volunteers. No real PII; re-runnable to an identical state.
 *
 * Guard: runs only when Railway reports the development environment, so it can
 * never truncate prod.
 *
 * Usage: npm run prisma:seed:dev
 */
import { DepartmentType, EventType } from '@prisma/client';
import prisma from '../../src/config/database.js';
import { hashPassword } from '../../src/utils/password.js';

const DEV_PASSWORD = 'DevPass123';

const DEV_USERS = [
  {
    userId: 'DEVA01',
    email: 'dev-admin@assemblyops.test',
    firstName: 'Dev',
    lastName: 'Admin',
    isAppAdmin: true,
  },
  {
    userId: 'DEVV01',
    email: 'dev-vol1@assemblyops.test',
    firstName: 'Vol',
    lastName: 'One',
    isAppAdmin: false,
  },
  {
    userId: 'DEVV02',
    email: 'dev-vol2@assemblyops.test',
    firstName: 'Vol',
    lastName: 'Two',
    isAppAdmin: false,
  },
];

const DEV_EVENT = {
  eventType: EventType.REGIONAL_CONVENTION,
  name: 'Dev Regional Convention',
  region: 'US-MA',
  state: 'MA',
  serviceYear: 2026,
  venue: 'Dev Arena',
  address: '100 Dev Way, Boston, MA',
  startDate: new Date('2026-07-01T00:00:00.000Z'),
  endDate: new Date('2026-07-03T00:00:00.000Z'),
  language: 'en',
  isPublic: true,
};

const DEV_DEPARTMENTS: DepartmentType[] = [
  DepartmentType.ATTENDANT,
  DepartmentType.AUDIO,
  DepartmentType.VIDEO,
  DepartmentType.STAGE,
  DepartmentType.PARKING,
];

/** The only Railway environment this seed may touch. */
const DEV_ENVIRONMENT = 'development';

/**
 * Refuse to run anywhere but the Railway development environment.
 *
 * Keys off RAILWAY_ENVIRONMENT_NAME, which Railway injects into the process.
 * Never match on the database host: both environments sit behind the same proxy
 * hostname and differ only by port, so a host check would also match production.
 */
function assertSafeEnv(): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to run dev seed: NODE_ENV=production');
  }
  const environment = process.env.RAILWAY_ENVIRONMENT_NAME;
  if (environment !== DEV_ENVIRONMENT) {
    throw new Error(
      `Refusing to run dev seed: RAILWAY_ENVIRONMENT_NAME is "${environment ?? 'unset'}", ` +
        `expected "${DEV_ENVIRONMENT}". Run it with: npm run prisma:seed:dev`
    );
  }
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set — run it with: npm run prisma:seed:dev');
  }
}

/** Truncate every public table except Prisma's migration log. */
async function reset(): Promise<void> {
  const rows = await prisma.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
    `;
  if (rows.length === 0) return;
  const list = rows.map((r) => `"public"."${r.tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
  console.log(`Reset ${rows.length} tables`);
}

async function seedUsers(): Promise<void> {
  const passwordHash = await hashPassword(DEV_PASSWORD);
  for (const u of DEV_USERS) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { ...u, passwordHash },
      create: { ...u, passwordHash },
    });
  }
  console.log(`Seeded ${DEV_USERS.length} users`);
}

async function seedEvent(): Promise<string> {
  const event = await prisma.event.upsert({
    where: {
      eventType_venue_startDate_language: {
        eventType: DEV_EVENT.eventType,
        venue: DEV_EVENT.venue,
        startDate: DEV_EVENT.startDate,
        language: DEV_EVENT.language,
      },
    },
    update: DEV_EVENT,
    create: DEV_EVENT,
  });
  console.log('Seeded 1 event');
  return event.id;
}

async function seedDepartments(eventId: string): Promise<Record<string, string>> {
  const ids: Record<string, string> = {};
  for (const type of DEV_DEPARTMENTS) {
    const dept = await prisma.department.upsert({
      where: { eventId_departmentType: { eventId, departmentType: type } },
      update: { name: type },
      create: { eventId, departmentType: type, name: type },
    });
    ids[type] = dept.id;
  }
  console.log(`Seeded ${DEV_DEPARTMENTS.length} departments`);
  return ids;
}

async function seedVolunteers(eventId: string, deptIds: Record<string, string>): Promise<void> {
  const memberships = [
    { email: 'dev-admin@assemblyops.test', departmentId: undefined as string | undefined },
    { email: 'dev-vol1@assemblyops.test', departmentId: deptIds[DepartmentType.ATTENDANT] },
    { email: 'dev-vol2@assemblyops.test', departmentId: deptIds[DepartmentType.AUDIO] },
  ];
  for (const m of memberships) {
    const user = await prisma.user.findUniqueOrThrow({ where: { email: m.email } });
    await prisma.eventVolunteer.upsert({
      where: { userId_eventId: { userId: user.id, eventId } },
      update: { departmentId: m.departmentId },
      create: { userId: user.id, eventId, departmentId: m.departmentId },
    });
  }
  console.log(`Seeded ${memberships.length} volunteers`);
}

async function main(): Promise<void> {
  assertSafeEnv();
  console.log('Starting dev seed...\n');

  await reset();
  await seedUsers();
  const eventId = await seedEvent();
  const deptIds = await seedDepartments(eventId);
  await seedVolunteers(eventId, deptIds);

  console.log('\nDev seed complete!');
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Dev seed failed:', e);
    process.exit(1);
  });
