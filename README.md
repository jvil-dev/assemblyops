# AssemblyOps

![CI](https://github.com/jvil-dev/assemblyops/actions/workflows/ci.yml/badge.svg)
![Platform](https://img.shields.io/badge/platform-iOS%20%7C%20Web-blue)
![Node](https://img.shields.io/badge/node-20%2B-339933?logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![GraphQL](https://img.shields.io/badge/GraphQL-E10098?logo=graphql&logoColor=white)
![Swift](https://img.shields.io/badge/Swift%20%7C%20SwiftUI-F05138?logo=swift&logoColor=white)
![License](https://img.shields.io/badge/license-Private-lightgrey)

A volunteer scheduling and management platform for Jehovah's Witnesses assembly and convention committees. AssemblyOps provides a unified system for event coordination, volunteer management, and real-time attendance tracking — replacing the fragmented mix of spreadsheets, documents, and group chats that committees currently rely on.

## Key Features

- **Event Management** — Create and configure events with departments, posts, and multi-day sessions
- **Volunteer Scheduling** — Assign volunteers to posts across sessions with capacity management
- **Assignment Workflows** — Acceptance/decline flow with configurable deadlines and captain roles
- **Real-Time Attendance** — Check-in/check-out tracking with live attendance counts
- **Role-Based Access** — Department Overseers, App Admins, and Volunteers each see what they need
- **In-App Messaging** — Event-wide, department-specific, and post-specific communication
- **Event Discovery** — Volunteers can browse public events and request to join
- **Department-Specific Tools** — Safety incident reporting (Attendant), equipment management (Audio/Video), and more
- **Bilingual Support** — English and Spanish localization
- **OAuth Sign-In** — Google and Apple Sign In alongside email/password authentication

## Tech Stack

| Layer          | Technology                                          |
| -------------- | --------------------------------------------------- |
| iOS App        | Swift, SwiftUI, Apollo iOS (GraphQL client)         |
| Admin Portal   | Next.js 16, React 19, Apollo Client 4, Recharts     |
| API            | Node.js, Express, Apollo Server 5, GraphQL          |
| Database       | PostgreSQL 18 with Prisma ORM                       |
| Auth           | JWT (access + refresh tokens), OAuth (Google/Apple) |
| Validation     | Zod runtime schemas                                 |
| Infrastructure | Railway (API + landing), Railway Postgres 18        |
| CI/CD          | GitHub Actions                                      |

## Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                          Clients                            │
│  iOS App (SwiftUI + Apollo iOS)  ·  Admin Portal (Next.js)  │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                        Railway Edge                         │
│                     api.assemblyops.org                     │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                Railway Service (assemblyops)                │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Node.js + Apollo Server                  │  │
│  │                                                       │  │
│  │   Express → Apollo → Resolvers → Services → Prisma    │  │
│  └───────────────────────────────────────────────────────┘  │
└──────────────────────────────┬──────────────────────────────┘
                               │  postgres.railway.internal
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                     Railway Postgres 18                     │
│                   with connection pooling                   │
└─────────────────────────────────────────────────────────────┘
```

## Getting Started

### Prerequisites

- **Node.js** 20+
- **npm**
- **Railway CLI** (`npm i -g @railway/cli`) — dev secrets come from Railway, not `.env`
- **Docker** (for the local test database)
- **Xcode** 15+ (for iOS development)

### Backend

There are no `.env` files. Local dev pulls secrets from the Railway `development`
environment at run time via `scripts/railway-dev.sh`, which the `dev` and
`prisma:*` scripts wrap. `.env.example` documents the key list for reference only.

```bash
cd backend
npm install

railway login           # First run on a new machine
railway link            # Select the `assemblyops` project

npm run prisma:generate # Generate Prisma client
npm run prisma:migrate  # Run migrations against the Railway dev database
npm run prisma:seed     # Seed with event templates

npm run dev             # Start dev server → http://localhost:4000/graphql
```

**Running tests** — these never touch Railway. They run against a throwaway
Postgres 18 container from `backend/docker-compose.yml`, matching CI's service
container:

```bash
cd backend
npm run test:db:up      # Start + migrate the local test database
npm test                # Vitest (test:coverage, test:watch also available)
npm run test:db:down    # Stop it when you're done
```

See [backend/README.md](./backend/README.md) for full API documentation, environment variables, and available scripts.

### iOS App

```bash
cd ios/JW_AssemblyOps
open AssemblyOps.xcodeproj  # Build and run in Xcode
```

After backend schema changes:

```bash
./apollo-ios-cli fetch-schema   # Re-fetch schema (backend must be running)
./apollo-ios-cli generate       # Regenerate GraphQL types
```

> **Note:** The debug build points to a local network IP for the GraphQL endpoint. Update the URL in `Core/Network/NetworkClient.swift` to match your machine's local IP.

### Admin Portal

```bash
cd web/admin
npm install
npm run dev    # → http://localhost:3000
```

See [web/admin/README.md](./web/admin/README.md) for pages, project structure, and access control details.

### Landing Site

```bash
cd web/landing
npm install
npm run dev    # Astro dev server
```

## User Roles

| Role                | Access Level                                       |
| ------------------- | -------------------------------------------------- |
| App Admin           | Full platform administration                       |
| Department Overseer | Manages a department within an event               |
| Volunteer           | Views own assignments, accepts/declines, checks in |

## Convention Departments

Accounts, Attendant, Audio/Video, Baptism, Cleaning, First Aid, Information & Volunteer Service, Installation, Lost & Found/Checkroom, Parking, Rooming, Trucking & Equipment

## Project Structure

```text
AssemblyOps/
├── ios/               # iOS app (SwiftUI + Apollo iOS)
├── web/               # Browser apps
│   ├── landing/       # Marketing site (Astro)
│   └── admin/         # Admin portal (Next.js + React)
├── backend/           # Node.js GraphQL API
├── docs/              # Architecture & development docs
└── .github/           # CI/CD workflows
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development workflow, coding standards, and how to submit changes.

## Security

See [SECURITY.md](./SECURITY.md) for our security policy and how to report vulnerabilities.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for a detailed history of changes.

## License

Private — All rights reserved.
