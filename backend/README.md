# AssemblyOps Backend

GraphQL API for the AssemblyOps volunteer scheduling system.

## Tech Stack

- **Runtime:** Node.js 20+
- **Framework:** Express + Apollo Server 5
- **API:** GraphQL with graphql-scalars
- **Database:** PostgreSQL 16 with Prisma ORM
- **Auth:** JWT (access tokens 15min, refresh tokens 7 days), OAuth (Google/Apple)
- **Validation:** Zod runtime schemas
- **Testing:** Vitest

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 16+ (or Docker)
- npm

### Setup

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your values (see Environment Variables below)

# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed the database (event templates)
npm run prisma:seed

# Start development server
npm run dev
```

The Apollo Sandbox will be available at `http://localhost:4000/graphql` (introspection is disabled in production).

### Using Docker

```bash
# Start API + PostgreSQL
docker compose up

# In another terminal, run migrations
npm run prisma:migrate
npm run prisma:seed
```

## Environment Variables

See `.env.example` for the full list with generation commands. Required variables:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/assemblyops
DIRECT_URL=postgresql://user:password@localhost:5432/assemblyops

# JWT (min 32 chars each — generate: openssl rand -base64 32)
JWT_SECRET=
JWT_REFRESH_SECRET=

# Encryption (64-char hex — generate: openssl rand -hex 32)
VOLUNTEER_TOKEN_KEY=
PII_ENCRYPTION_KEY=

# OAuth (optional)
GOOGLE_CLIENT_ID=
APPLE_CLIENT_ID=

# Server
PORT=4000
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:4000
```

## Scripts

| Command                   | Description                      |
| ------------------------- | -------------------------------- |
| `npm run dev`             | Start dev server with hot reload |
| `npm run build`           | Compile TypeScript               |
| `npm start`               | Start production server          |
| `npm test`                | Run tests                        |
| `npm run test:watch`      | Run tests in watch mode          |
| `npm run test:coverage`   | Run tests with coverage report   |
| `npm run lint`            | ESLint check                     |
| `npm run lint:fix`        | Auto-fix lint issues             |
| `npm run format`          | Prettier format                  |
| `npm run prisma:migrate`  | Run database migrations          |
| `npm run prisma:generate` | Regenerate Prisma client         |
| `npm run prisma:seed`     | Seed database                    |
| `npm run prisma:push`     | Push schema changes (dev only)   |

## Project Structure

```text
src/
├── graphql/
│   ├── schema/        # GraphQL type definitions
│   ├── resolvers/     # Resolver implementations
│   ├── validators/    # Zod input validation
│   ├── guards/        # Authorization guards
│   ├── context.ts     # Request context
│   └── index.ts       # Apollo Server setup
├── services/          # Business logic
├── utils/             # JWT, password hashing, errors
├── config/            # Database client
├── __tests__/         # Integration tests
└── server.ts          # Entry point
```

## API Overview

### Authentication

```graphql
# Register a new user
mutation {
  registerUser(
    input: {
      email: "user@example.com"
      password: "SecurePass123"
      firstName: "John"
      lastName: "Doe"
      isOverseer: true
    }
  ) {
    accessToken
    refreshToken
    user {
      id
      email
    }
  }
}

# Login
mutation {
  loginUser(input: { email: "user@example.com", password: "SecurePass123" }) {
    accessToken
    refreshToken
    user {
      id
      email
    }
  }
}
```

### Posts & Sessions

```graphql
# Create posts (volunteer positions)
mutation {
  createPosts(
    input: { departmentId: "...", posts: [{ name: "East Lobby" }, { name: "Main Entrance" }] }
  ) {
    id
    name
  }
}

# Create sessions (time blocks)
mutation {
  createSessions(
    input: {
      eventId: "..."
      sessions: [
        {
          name: "Saturday Morning"
          date: "2026-03-07T00:00:00Z"
          startTime: "09:00"
          endTime: "12:00"
        }
        {
          name: "Saturday Afternoon"
          date: "2026-03-07T00:00:00Z"
          startTime: "13:30"
          endTime: "16:30"
        }
      ]
    }
  ) {
    id
    name
  }
}
```

## Authorization

All requests require `Authorization: Bearer <token>` header.

| Role                | Permissions                                  |
| ------------------- | -------------------------------------------- |
| APP_ADMIN           | Full platform access, manage all events      |
| DEPARTMENT_OVERSEER | Department-scoped, manage posts & volunteers |
| VOLUNTEER           | View own assignments only                    |

## Database Schema

See `prisma/schema.prisma` for the full data model. Key entities:

- **User** — All users (email/password + OAuth, `isOverseer` flag for role)
- **Event** — Convention or assembly event with sessions and departments
- **Department** — One of 14 convention departments
- **EventVolunteer** — User membership in an event (linked to User)
- **Post** — Physical positions within a department
- **Session** — Event-wide time blocks
- **ScheduleAssignment** — EventVolunteer + Post + Session

## Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test -- health

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

## Deployment

The API deploys to Google Cloud Run via GitHub Actions:

- Push to `main` → Deploy to production

See `.github/workflows/` for CI/CD configuration.
