# HookWeb

A browser-based webhook debugger. Get an instant disposable URL, receive incoming HTTP requests in real time, inspect headers/body, and replay them to your real endpoint.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL + Prisma |
| Cache / Realtime | Redis + WebSockets |
| Frontend | React 19, Vite, Tailwind CSS |
| State | Zustand |
| Monorepo | Bun workspaces + Turborepo |
| Infra | Docker, GitHub Actions |

## Project Structure
```
hookweb/
├── apps/
│   ├── api/         ← Express backend
│   └── web/         ← React frontend
├── packages/
│   ├── types/       ← Shared TypeScript interfaces
│   └── utils/       ← Shared utility functions
├── infra/           ← Docker, Nginx configs
└── .github/         ← CI/CD workflows
```

## Getting Started

### Prerequisites
- [Bun](https://bun.sh) >= 1.3
- [Docker](https://docker.com) >= 24

### Setup

1. Clone the repo
```bash
git clone <your-repo-url>
cd hookweb
```

2. Install dependencies
```bash
make install
```

3. Setup environment variables
```bash
# Root env (for Docker)
cp .env.example .env

# API env
cp apps/api/.env.example apps/api/.env
```
Then open both `.env` files and fill in your values.

4. Start the database and Redis
```bash
make up
```

5. Run migrations
```bash
make migrate
```

6. Start development servers
```bash
make dev
```

- API: `http://localhost:4000`
- Web: `http://localhost:5173`

## Available Commands

| Command | Description |
|---|---|
| `make dev` | Start all services |
| `make up` | Start Docker containers |
| `make down` | Stop Docker containers |
| `make migrate` | Run database migrations |
| `make migrate-new name=<name>` | Create new migration |
| `make studio` | Open Prisma Studio |
| `make psql` | Open Postgres shell |
| `make typecheck` | Run TypeScript checks |
| `make test` | Run all tests |
| `make clean` | Remove node_modules + dist |
| `make reset` | Full reset |

## Environment Variables

| File | Purpose |
|---|---|
| `.env` | Docker Compose — Postgres credentials |
| `apps/api/.env` | API server — all backend config |

Copy the example files and fill in your values — never commit real credentials.

## License
MIT
