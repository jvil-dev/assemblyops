/**
 * Backfill Script: Encrypt existing plaintext PII fields
 *
 * Run AFTER the 20260226100000_encrypt_pii_fields migration.
 * Reads rows with plaintext data and encrypts them in-place.
 *
 * Usage: npx tsx prisma/backfill-encrypt-pii.ts
 *
 * Idempotent: Skips rows that already contain base64-encoded encrypted data.
 */
import { config as loadEnv } from 'dotenv-flow';
import { PrismaClient } from '@prisma/client';
import { encryptField } from '../src/utils/encryption.js';

loadEnv();

const prisma = new PrismaClient();

function isAlreadyEncrypted(value: string): boolean {
  // Encrypted values are base64 strings at least 37 chars (12 IV + 16 tag + 1 char min)
  // and contain characters like +, /, = that plaintext tokens/names typically don't
  try {
    const buf = Buffer.from(value, 'base64');
    return buf.length >= 29; // 12 (IV) + 16 (authTag) + 1 (min ciphertext)
  } catch {
    return false;
  }
}

async function main() {
  console.log('Starting PII encryption backfill...');

  // 1. Encrypt EventVolunteer.encryptedToken (was plaintext "token")
  const eventVolunteers = await prisma.eventVolunteer.findMany({
    select: { id: true, encryptedToken: true },
  });
  let evCount = 0;
  for (const ev of eventVolunteers) {
    if (!isAlreadyEncrypted(ev.encryptedToken)) {
      await prisma.eventVolunteer.update({
        where: { id: ev.id },
        data: { encryptedToken: encryptField(ev.encryptedToken) },
      });
      evCount++;
    }
  }
  console.log(`  EventVolunteer tokens encrypted: ${evCount}/${eventVolunteers.length}`);

  // 2. Encrypt LostPersonAlert PII fields
  const alerts = await prisma.lostPersonAlert.findMany({
    select: {
      id: true,
      encryptedPersonName: true,
      encryptedContactName: true,
      encryptedContactPhone: true,
    },
  });
  let alertCount = 0;
  for (const alert of alerts) {
    const updates: Record<string, string> = {};
    if (!isAlreadyEncrypted(alert.encryptedPersonName)) {
      updates.encryptedPersonName = encryptField(alert.encryptedPersonName);
    }
    if (!isAlreadyEncrypted(alert.encryptedContactName)) {
      updates.encryptedContactName = encryptField(alert.encryptedContactName);
    }
    if (alert.encryptedContactPhone && !isAlreadyEncrypted(alert.encryptedContactPhone)) {
      updates.encryptedContactPhone = encryptField(alert.encryptedContactPhone);
    }
    if (Object.keys(updates).length > 0) {
      await prisma.lostPersonAlert.update({
        where: { id: alert.id },
        data: updates,
      });
      alertCount++;
    }
  }
  console.log(`  LostPersonAlert records encrypted: ${alertCount}/${alerts.length}`);

  // 3. Encrypt OAuthConnection.encryptedEmail
  const oauthConns = await prisma.oAuthConnection.findMany({
    select: { id: true, encryptedEmail: true },
  });
  let oauthCount = 0;
  for (const conn of oauthConns) {
    if (conn.encryptedEmail && !isAlreadyEncrypted(conn.encryptedEmail)) {
      await prisma.oAuthConnection.update({
        where: { id: conn.id },
        data: { encryptedEmail: encryptField(conn.encryptedEmail) },
      });
      oauthCount++;
    }
  }
  console.log(`  OAuthConnection emails encrypted: ${oauthCount}/${oauthConns.length}`);

  console.log('Backfill complete.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
