/**
 * Floor Plan Service
 *
 * Manages event floor plan images stored in Cloudflare R2 (S3-compatible).
 * Generates presigned URLs for upload and view access.
 *
 * Methods:
 *   - getUploadUrl(eventId): Presigned PUT URL for uploading a floor plan
 *   - confirmUpload(eventId): Persist the object key to the event record after upload
 *   - getViewUrl(eventId): Presigned GET URL for viewing the floor plan
 *   - delete(eventId): Remove the object from R2 and clear the DB reference
 *
 * Called by: ../graphql/resolvers/floorPlan.ts
 */
import {
  S3Client,
  HeadBucketCommand,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PrismaClient } from '@prisma/client';
import { NotFoundError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

const BUCKET = process.env.S3_BUCKET?.trim() ?? '';

const s3 = new S3Client({
  region: process.env.S3_REGION?.trim() || 'auto',
  endpoint: process.env.S3_ENDPOINT?.trim(),
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
  },
});

//** Validate S3_BUCKET is set and the bucket is accessible. Call at startup. */
export async function validateStorageBucket(): Promise<void> {
  if (!BUCKET) {
    throw new Error('S3_BUCKET environment variable is required');
  }
  try {
    await s3.send(new HeadBucketCommand({ Bucket: BUCKET }));
  } catch (err) {
    const e = err as { name?: string; message?: string; $metadata?: { httpStatusCode?: number } };
    logger.error('Storage bucket check failed', {
      bucket: BUCKET,
      endpoint: process.env.S3_ENDPOINT,
      name: e.name,
      status: e.$metadata?.httpStatusCode,
      message: e.message,
    });
    throw new Error(
      `Storage bucket "${BUCKET}" is not accessible: ${e.name ?? e.message ?? 'unknown error'}`
    );
  }
  logger.info('Storage bucket verified', { bucket: BUCKET });
}

export class FloorPlanService {
  constructor(private prisma: PrismaClient) {}

  async getUploadUrl(eventId: string): Promise<string> {
    const key = `floor-plans/${eventId}.jpg`;
    logger.debug('Generating presigned upload URL', { bucket: BUCKET, key });
    return getSignedUrl(
      s3,
      new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: 'image/jpeg' }),
      { expiresIn: 5 * 60 }
    );
  }

  async confirmUpload(eventId: string): Promise<void> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true },
    });
    if (!event) {
      throw new NotFoundError('Event');
    }
    const key = `floor-plans/${eventId}.jpg`;
    await this.prisma.event.update({ where: { id: eventId }, data: { floorPlanKey: key } });
  }

  async getViewUrl(eventId: string): Promise<string | null> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { floorPlanKey: true },
    });
    if (!event?.floorPlanKey) return null;
    return getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: event.floorPlanKey }), {
      expiresIn: 60 * 60,
    });
  }

  async delete(eventId: string): Promise<void> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { floorPlanKey: true },
    });

    const key = event?.floorPlanKey;

    // Clear the DB reference first. If the R2 delete below fails, the floor plan
    // becomes unreachable (no signed URL is generated) rather than generating
    // a broken URL pointing to a deleted object.
    await this.prisma.event.update({ where: { id: eventId }, data: { floorPlanKey: null } });

    if (key) {
      await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
    }
  }
}
