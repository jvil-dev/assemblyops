/**
 * Server Entry Point
 *
 * Main entry point for the application. Sets up Express, Apollo Server,
 * and starts listening for requests.
 *
 * Startup Flow:
 *   1. Configure Express middleware (helmet, cors, json)
 *   2. Set up /health endpoint for Cloud Run health checks
 *   3. Create Apollo Server and attach to /graphql endpoint
 *   4. Start HTTP server on PORT (default 4000)
 *
 * Endpoints:
 *   - GET /.well-known/apple-app-site-association: AASA for Password AutoFill
 *   - GET /health: REST health check (for load balancer)
 *   - POST /graphql: GraphQL API endpoint
 *
 * Environment Variables:
 *   - PORT: Server port (default 4000)
 *   - ALLOWED_ORIGINS: Comma-separated CORS allowlist (default localhost 3000/3001/4000)
 *   - DATABASE_URL: PostgreSQL connection string
 *   - JWT_SECRET: Access token signing key
 *   - JWT_REFRESH_SECRET: Refresh token signing key
 *   - S3_BUCKET: Cloudflare Storage bucket for floor plan images
 *
 * Run with: npm run dev (development) or npm start (production)
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import prisma from './config/database.js';
import { createApolloServer } from './graphql/index.js';
import { createRateLimiter, shutdownRateLimiter } from './middleware/rateLimiter.js';
import { validateJwtSecrets } from './utils/jwt.js';
import { validateEncryptionKey } from './utils/encryption.js';
import { validateStorageBucket } from './services/floorPlanService.js';
import { logger } from './utils/logger.js';

const app = express();
const PORT = process.env.PORT || 4000;

// Trust first proxy (Cloud Run) for accurate client IP in rate limiting
app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
  })
);
// CORS: restrict to environment-based allowlist
const allowedOrigins = (
  process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:3001,http://localhost:4000'
)
  .split(',')
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, health checks)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
  })
);
app.use(express.json());

// Password reset: 1 request per 60 seconds
app.use(
  '/graphql',
  createRateLimiter({
    windowMs: 60 * 1000,
    max: 1,
    keyPrefix: 'reset-cooldown',
    operations: ['requestPasswordReset'],
    message: 'Please wait 60 seconds before requesting another code',
  })
);

// Password reset: 5 requests per 12 hours
app.use(
  '/graphql',
  createRateLimiter({
    windowMs: 12 * 60 * 60 * 1000,
    max: 5,
    keyPrefix: 'reset-daily',
    operations: ['requestPasswordReset'],
    message: 'Too many reset attempts. Please try again later.',
  })
);

// Rate limiting: sliding window counter with per-user keying
app.use(
  '/graphql',
  createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    keyPrefix: 'auth',
    operations: [
      'loginUser',
      'registerUser',
      'refreshToken',
      'loginWithGoogle',
      'loginWithApple',
      'completeOAuthRegistration',
      'requestPasswordReset',
      'verifyResetCode',
      'resetPassword',
    ],
    message: 'Too many authentication attempts, please try again later',
  })
);

app.use(
  '/graphql',
  createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 300,
    keyPrefix: 'general',
  })
);

// Cron endpoint: send day-before meeting reminders
app.post('/api/cron/meeting-reminders', async (req, res) => {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || req.headers['x-cron-secret'] !== cronSecret) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  try {
    const { NotificationService } = await import('./services/notificationService.js');

    // Tomorrow's date range (midnight-to-midnight UTC)
    const now = new Date();
    const tomorrowStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
    );
    const tomorrowEnd = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 2)
    );

    const meetings = await prisma.attendantMeeting.findMany({
      where: {
        meetingDate: { gte: tomorrowStart, lt: tomorrowEnd },
      },
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

    res.status(200).json({
      meetingsProcessed: meetings.length,
      notificationsSent,
    });
  } catch (error) {
    logger.error('Meeting reminders cron failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Apple App Site Association — enables Password AutoFill & Keychain integration
app.get('/.well-known/apple-app-site-association', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json({
    webcredentials: {
      apps: ['72KK7R8JUS.com.jvilapps.assemblyOps'],
    },
  });
});

app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: { database: 'connected' },
    });
  } catch (error) {
    logger.error('Health check failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      services: { database: 'disconnected' },
    });
  }
});

const shutdown = async () => {
  logger.info('Shutting down gracefully...');
  shutdownRateLimiter();
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

async function start() {
  validateJwtSecrets();
  validateEncryptionKey();
  await validateStorageBucket();
  const httpServer = await createApolloServer(app);

  httpServer.listen(PORT, () => {
    logger.info('Server started successfully', {
      port: PORT,
      environment: process.env.NODE_ENV || 'development',
      healthCheck: `http://localhost:${PORT}/health`,
      graphql: `http://localhost:${PORT}/graphql`,
    });
  });
}

start().catch((error) => {
  logger.error('Failed to start server', {
    error: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
  });
  process.exit(1);
});

export default app;
