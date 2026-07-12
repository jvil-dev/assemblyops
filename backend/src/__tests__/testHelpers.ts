/**
 * Test Helpers
 *
 * Shared utilities for integration tests.
 * Creates events directly via Prisma (events are first-class records in production).
 *
 * Used by: integration/*.ts
 */
import express from 'express';
import supertest from 'supertest';
import prisma from '../config/database.js';

/**
 * Create a test event directly in the database (simulating seed/admin import).
 * Returns the event ID.
 */
export async function createTestEvent(overrides?: {
  name?: string;
  eventType?: 'CIRCUIT_ASSEMBLY_CO' | 'CIRCUIT_ASSEMBLY_BR' | 'REGIONAL_CONVENTION' | 'SPECIAL_CONVENTION';
  startDate?: Date;
  endDate?: Date;
}): Promise<string> {
  const now = new Date();
  const startDate = overrides?.startDate ?? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const endDate = overrides?.endDate ?? new Date(startDate.getTime() + 2 * 24 * 60 * 60 * 1000);

  const eventName = overrides?.name ?? `Test Event ${Date.now()}`;
  const eventType = overrides?.eventType ?? 'CIRCUIT_ASSEMBLY_CO';

  const event = await prisma.event.create({
    data: {
      name: eventName,
      eventType,
      region: 'US-MA',
      venue: `Test Venue ${Date.now()}`,
      address: '123 Test St',
      startDate,
      endDate,
      serviceYear: startDate.getFullYear(),
      isPublic: true,
    },
  });

  return event.id;
}

/**
 * Create a test congregation directly in the database.
 * Required for registration since congregationId is now mandatory
 * Returns the congregation ID
 */
export async function createTestCongregation(overrides?: {
    name?: string;
    state?: string;
}): Promise<string> {
    const congregation = await prisma.congregation.create({
        data: {
            name:
                overrides?.name ??
                `Test Cong ${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            state: overrides?.state ?? 'MA',
        },
    });
    return congregation.id;
}

/**
 * Register a user via GraphQL and return tokens
 * Auto-creates a congregation unless one is supplied
 * Used by integration tests that need an authenticated user
 */
export async function registerTestUser(
    app: express.Application,
    overrides?: {
        email?: string;
        password?: string;
        firstName?: string;
        lastName?: string;
        isOverseer?: boolean;
        congregationId?: string;
    }
): Promise<{
    accessToken: string;
    refreshToken: string;
    userId: string;
    email: string;
    congregationId: string;
}> {
    const email = overrides?.email ?? `test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@test.com`;
    const congregationId = overrides?.congregationId ?? (await createTestCongregation());

    const res = await supertest(app)
        .post('/graphql')
        .send({
            query: `mutation RegisterUser($input: RegisterUserInput!) {
                registerUser(input: $input) {
                    accessToken
                    refreshToken
                    user { id }
                }
            }`,
            variables: {
                input: {
                    email,
                    password: overrides?.password ?? 'TestPass123',
                    firstName: overrides?.firstName ?? 'Test',
                    lastName: overrides?.lastName ?? 'User',
                    isOverseer: overrides?.isOverseer ?? false,
                    congregationId,
                },
            },
        });
    const data = res.body.data?.registerUser;
    if (!data?.accessToken) {
        throw new Error(`registerTestUser failed: ${JSON.stringify(res.body.errors)}`);
    }
    return {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        userId: data.user.id,
        email,
        congregationId,
    };
}

/**
 * Set a user as app admin by email.
 */
export async function setAppAdmin(email: string): Promise<void> {
  await prisma.user.update({
    where: { email },
    data: { isAppAdmin: true },
  });
}

/**
 * Clean up test data created during integration tests.
 */
export async function cleanupTestData() {
  // Delete AV records that reference EventVolunteer with RESTRICT delete
  // (must be deleted before events cascade to EventVolunteers)
  const testEvents = await prisma.event.findMany({
    where: { name: { startsWith: 'Test Event' } },
    select: { id: true },
  });
  const testEventIds = testEvents.map((e) => e.id);

  if (testEventIds.length > 0) {
    await prisma.aVSafetyBriefingAttendee.deleteMany({
      where: { briefing: { eventId: { in: testEventIds } } },
    });
    await prisma.aVDamageReport.deleteMany({
      where: { equipment: { eventId: { in: testEventIds } } },
    });
    await prisma.aVEquipmentCheckout.deleteMany({
      where: { equipment: { eventId: { in: testEventIds } } },
    });
  }

  // Delete test events (cascades to departments, sessions, etc.)
  await prisma.event.deleteMany({
    where: { name: { startsWith: 'Test Event' } },
  });

  // Delete test congregations (test users referencing them are already removed)
  await prisma.congregation.deleteMany({
    where: { name: { startsWith: 'Test Cong' } },
  });

  // Delete test users
  await prisma.user.deleteMany({
    where: { email: { contains: 'test-' } },
  });
}

/**
 * Create a test user who is also an EventVolunteer for the given event.
 * 1. Register a new User via GraphQL
 * 2. Create an EventVolunteer via Prisma
 * Returns { accessToken, userId, eventVolunteerId }
 */
export async function createTestVolunteerUser(
    app: express.Application,
    eventId: string,
    departmentId?: string
  ): Promise<{ accessToken: string; userId: string; eventVolunteerId: string }> {
    const { accessToken, userId } = await registerTestUser(app, {
      email: `test-vol-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@test.com`,
      firstName: 'TestVol',
    });

    const eventVolunteer = await prisma.eventVolunteer.create({
      data: {
        userId,
        eventId,
        ...(departmentId && { departmentId }),
      },
    });

    return { accessToken, userId, eventVolunteerId: eventVolunteer.id };
  }
