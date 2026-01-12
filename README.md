# MiniZapier

Open-source workflow automation platform inspired by Zapier. Build, test, and deploy automated workflows with a visual editor.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)

## Features

### Visual Workflow Editor
- **Drag-and-drop interface** - Build workflows visually with React Flow
- **Real-time validation** - Instant feedback on workflow errors (cycles, disconnected nodes, missing fields)
- **Data Picker** - Visual mapper for referencing data from previous steps using `{{step.field}}` syntax
- **Live debugging** - Watch workflow execution in real-time with node status indicators

### Triggers
- **Webhook** - Receive HTTP requests with optional HMAC-SHA256 signature verification
- **Schedule** - Cron-based scheduling with timezone support (6-field cron expressions)
- **Email** - Trigger workflows from incoming emails (via SendGrid/Mailgun webhooks)

### Actions
- **HTTP Request** - Make API calls with authentication (Basic, Bearer, API Key)
- **Send Email** - Send emails via Resend API
- **Send Telegram** - Send messages via Telegram Bot API
- **Database Query** - Execute PostgreSQL queries
- **Transform** - Transform data with JSONPath and JavaScript expressions
- **AI Request** - Integration with OpenAI-compatible APIs (GPT, DeepSeek, etc.)
- **Condition** - Conditional branching with JavaScript-like expressions

### Security
- **AES-256-GCM encryption** for stored credentials
- **SSRF protection** - Blocks internal IPs, cloud metadata endpoints, dangerous ports
- **Rate limiting** with @nestjs/throttler
- **JWT authentication** via Supabase Auth

### Reliability
- **BullMQ job queue** - Reliable workflow execution with Redis
- **Retry mechanism** - Exponential backoff for failed steps
- **Error notifications** - Email alerts when workflows fail

## Tech Stack

### Backend
- **NestJS 11** - Node.js framework
- **Prisma 7** - Database ORM with PostgreSQL driver adapter
- **BullMQ 5** - Job queue with Redis
- **Socket.io** - Real-time WebSocket communication

### Frontend
- **Next.js 16** - React framework with App Router
- **React 19** - UI library
- **React Flow** (@xyflow/react) - Visual workflow editor
- **TanStack Query** - Data fetching and caching
- **Zustand** - State management
- **Tailwind CSS 4** - Styling
- **shadcn/ui** - UI components

### Infrastructure
- **PostgreSQL 16** - Primary database
- **Redis 7** - Job queue and caching
- **Docker** - Containerization
- **Nginx** - Reverse proxy (production)

## Architecture

```
minizapier/
├── apps/
│   ├── api/                    # NestJS backend
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── actions/    # Action executors (HTTP, Email, etc.)
│   │   │   │   ├── auth/       # Supabase authentication
│   │   │   │   ├── credentials/# Encrypted credentials storage
│   │   │   │   ├── executions/ # Execution logs and WebSocket events
│   │   │   │   ├── notifications/ # Email notifications
│   │   │   │   ├── queue/      # BullMQ workflow processor
│   │   │   │   ├── triggers/   # Webhook, Schedule, Email triggers
│   │   │   │   └── workflows/  # Workflow CRUD
│   │   │   └── common/         # Guards, utils
│   │   └── prisma/             # Database schema
│   │
│   └── web/                    # Next.js frontend
│       └── src/
│           ├── app/            # Next.js App Router pages
│           ├── components/
│           │   ├── editor/     # Workflow editor components
│           │   │   ├── nodes/  # Custom React Flow nodes
│           │   │   ├── properties/ # Node property forms
│           │   │   └── data-picker/ # Visual data mapper
│           │   ├── credentials/ # Credentials management UI
│           │   ├── executions/ # Execution history UI
│           │   └── ui/         # shadcn/ui components
│           ├── hooks/          # React hooks
│           ├── lib/            # API client, utilities
│           └── stores/         # Zustand stores
│
└── packages/
    └── shared/                 # Shared types and templates
        └── src/
            ├── types/          # TypeScript interfaces
            └── templates/      # Workflow templates
```

## Quick Start

### Prerequisites
- Node.js >= 20.0.0
- pnpm >= 10.0.0
- Docker and Docker Compose

### Installation

1. Clone the repository:
```bash
git clone https://github.com/kpizzy812/minizapier.git
cd minizapier
```

2. Install dependencies:
```bash
pnpm install
```

3. Copy environment file:
```bash
cp .env.example .env
```

4. Start infrastructure (PostgreSQL + Redis):
```bash
docker compose up -d postgres redis
```

5. Push database schema:
```bash
pnpm db:push
```

6. Start development servers:
```bash
pnpm dev
```

The application will be available at:
- Frontend: http://localhost:3000
- API: http://localhost:3001
- Swagger docs: http://localhost:3001/api

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | - |
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `ENCRYPTION_KEY` | 64-char hex key for AES-256-GCM | - |
| `SUPABASE_URL` | Supabase project URL | - |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | - |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL (frontend) | - |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (frontend) | - |
| `RESEND_API_KEY` | Resend API key for emails | - |
| `API_BASE_URL` | Backend URL | `http://localhost:3001` |
| `CORS_ORIGIN` | Allowed CORS origin | `http://localhost:3000` |

Generate encryption key:
```bash
openssl rand -hex 32
```

## API Documentation

API documentation is available via Swagger UI at `/api` when the server is running.

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/workflows` | List all workflows |
| `POST` | `/api/workflows` | Create workflow |
| `PUT` | `/api/workflows/:id` | Update workflow |
| `POST` | `/api/workflows/:id/test` | Test run workflow |
| `POST` | `/api/workflows/:id/activate` | Activate workflow |
| `POST` | `/api/webhooks/:token` | Trigger webhook |
| `GET` | `/api/executions` | List executions |
| `GET` | `/api/credentials` | List credentials |
| `POST` | `/api/credentials` | Create credential |

## Testing

Run all tests:
```bash
pnpm test
```

Run tests with coverage:
```bash
# Backend
cd apps/api && pnpm test:cov

# Frontend
cd apps/web && pnpm test:coverage
```

Run specific test file:
```bash
cd apps/api && pnpm test -- --testPathPattern=url-validator
```

## Deployment

### Docker Compose (Production)

1. Configure environment variables in `.env`

2. Build and start containers:
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### Manual Deployment

Use the interactive deploy script:
```bash
./deploy.sh
```

Features:
- Builds Docker images
- Runs database migrations
- Manages containers
- Shows logs

### Production Checklist

- [ ] Set strong `ENCRYPTION_KEY` (64-char hex)
- [ ] Configure Supabase authentication
- [ ] Set up SSL/TLS certificates
- [ ] Configure reverse proxy (Nginx)
- [ ] Set up monitoring and logging
- [ ] Configure backup for PostgreSQL

## Development

### Project Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start all services in development mode |
| `pnpm build` | Build all packages |
| `pnpm test` | Run all tests |
| `pnpm lint` | Lint all packages |
| `pnpm db:push` | Push Prisma schema to database |
| `pnpm db:studio` | Open Prisma Studio |

### Adding a New Action

1. Create action service in `apps/api/src/modules/actions/services/`:
```typescript
@Injectable()
export class MyAction implements ActionExecutor {
  async execute(config: MyActionConfig, context: ExecutionContext): Promise<ActionResult> {
    // Implementation
  }
}
```

2. Register in `ActionsModule` and `StepExecutorService`

3. Add form in `apps/web/src/components/editor/properties/forms/`

4. Add to node palette in `apps/web/src/components/editor/sidebar/node-palette.tsx`

### Adding a New Trigger

1. Create trigger service in `apps/api/src/modules/triggers/services/`

2. Add trigger type to Prisma schema

3. Implement webhook handler in `WebhooksController`

4. Add UI form for trigger configuration

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- Use TypeScript strict mode
- Follow ESLint configuration
- Write tests for new features
- Keep files under 700 lines
- Use English for code comments

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [React Flow](https://reactflow.dev/) - Visual workflow editor
- [NestJS](https://nestjs.com/) - Backend framework
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [BullMQ](https://bullmq.io/) - Job queue
