import { config as loadEnv } from 'dotenv-flow';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import typeDefs from '../graphql/schema/index.js';
import resolvers from '../graphql/resolvers/index.js';
import { createContext, Context } from '../graphql/context.js';
import { cleanupTestData } from './testHelpers.js';

loadEnv();

let app: express.Application;
let server: ApolloServer<Context>;

export async function createTestApp() {
  if (app) return app;

  app = express();
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors());
  app.use(express.json());

  // Cron endpoint: meeting reminders (mirrors server.ts)
  app.post('/api/cron/meeting-reminders', async (req, res) => {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || req.headers['x-cron-secret'] !== cronSecret) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    try {
      const prisma = (await import('../config/database.js')).default;
      const { NotificationService } = await import('../services/notificationService.js');

      const now = new Date();
      const tomorrowStart = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
      );
      const tomorrowEnd = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 2)
      );

      const meetings = await prisma.attendantMeeting.findMany({
        where: { meetingDate: { gte: tomorrowStart, lt: tomorrowEnd } },
        include: {
          attendees: {
            include: { eventVolunteer: { select: { userId: true } } },
          },
        },
      });

      let notificationsSent = 0;
      const notificationService = new NotificationService(prisma);

      for (const meeting of meetings) {
        const userIds = meeting.attendees.map((a) => a.eventVolunteer.userId);
        if (userIds.length === 0) continue;

        await notificationService.sendToUsers(userIds, meeting.eventId, {
          title: 'Meeting Reminder',
          body: meeting.name
            ? `Reminder: "${meeting.name}" is scheduled for tomorrow`
            : 'You have an attendant meeting scheduled for tomorrow',
          data: { type: 'MEETING_REMINDER', eventId: meeting.eventId, meetingId: meeting.id },
        });
        notificationsSent += userIds.length;
      }

      res.status(200).json({ meetingsProcessed: meetings.length, notificationsSent });
    } catch {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Health check endpoint for tests
  app.get('/health', async (_req, res) => {
    try {
      const prisma = (await import('../config/database.js')).default;
      await prisma.$queryRaw`SELECT 1`;
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: { database: 'connected' },
      });
    } catch {
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        services: { database: 'disconnected' },
      });
    }
  });

  server = new ApolloServer<Context>({
    typeDefs,
    resolvers,
  });

  await server.start();

  app.use(
    '/graphql',
    cors(),
    express.json(),
    expressMiddleware(server, { context: createContext })
  );

  return app;
}

export async function closeTestApp() {
  await cleanupTestData();
  if (server) await server.stop();
}
