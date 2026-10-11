# ascii-streamer

A high-performance TypeScript workspace for streaming ASCII-art and related backend services. This project combines a React frontend, Node.js API server, and Python-based video processing engine.

## 🚀 Quick Start

### Local Development

```bash
# Install dependencies
pnpm install

# Start API server (port 3000)
pnpm --filter @workspace/api-server run dev

# Start React frontend (port 5173)
pnpm --filter @workspace/ascili run dev
```

Visit http://localhost:3000 to see the app.

### Docker

```bash
# Start with PostgreSQL
docker-compose up -d

# Access at http://localhost:3000
```

## 📦 Stack

- **Frontend:** React 18 + Vite + TypeScript
- **API:** Node.js 24 + Express 5 + TypeScript
- **Database:** PostgreSQL + Drizzle ORM
- **Validation:** Zod v4
- **Deployment:** Docker, Railway, Render, Vercel

## 📁 Repository Map

```
ascii-streamer/
├── artifacts/
│   ├── api-server/      Express.js API server + health checks
│   ├── ascili/          React frontend (Vite + TypeScript)
│   └── mockup-sandbox/  UI component sandbox
├── lib/
│   ├── api-spec/        OpenAPI contract
│   ├── api-zod/         Generated Zod validators
│   ├── api-client-react/ React hooks for API
│   └── db/              Database schema + migrations
├── ai_video_engine/     Python video processing (optional)
├── scripts/             Dev utilities
├── Dockerfile           Multi-stage build
├── docker-compose.yml   Local development
└── railway.json / render.yaml  Production configs
```

## 🔧 Run and Operate

```bash
# Install
pnpm install

# Type check
pnpm run typecheck

# Build everything
pnpm run build

# Start API server
pnpm --filter @workspace/api-server run dev

# Start React app
pnpm --filter @workspace/ascili run dev

# Run tests
pnpm run test

# Database operations
pnpm --filter @workspace/db run push
```

## 🌐 API Endpoints

- `GET /` - React frontend (served from `/public`)
- `GET /api/health` - Server health check
- `GET /api/status` - API status

## 🚢 Deploy

See [DEPLOY.md](./DEPLOY.md) for detailed deployment instructions.

### Quick Deploy Options

**Railway (Recommended):**
```bash
railway link && railway up
```

**Render:**
1. Connect GitHub repo
2. Auto-detects `render.yaml`
3. Deploy!

**Docker:**
```bash
docker build -t ascii-streamer .
docker run -p 3000:3000 ascii-streamer
```

## 🏗️ Architecture

### Request Flow

1. Browser requests `/` → Express serves React app from `/public`
2. React app calls `/api/*` endpoints
3. Express API routes to handlers
4. Handlers query PostgreSQL via Drizzle ORM
5. Responses validated with Zod schemas

### Build Process

1. TypeScript monorepo built with pnpm workspaces
2. API server compiled to `/artifacts/api-server/dist`
3. React app built to `/artifacts/ascili/dist`
4. Docker copies built artifacts into final image
5. Production image runs Node.js server on port 3000

### Environment Configuration

**Development (.env.local):**
```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ascii_streamer
```

**Production (Railway/Render):**
- Set via platform dashboard
- `DATABASE_URL` auto-linked by platform
- `PORT` defaults to 3000

## 🔐 Security & Best Practices

- CORS enabled for frontend-to-API communication
- Environment variables never committed to repo
- Docker image uses Alpine Linux (minimal attack surface)
- Health checks for deployment monitoring
- TypeScript for type safety across codebase

## 🐛 Troubleshooting

**Port 3000 already in use:**
```bash
lsof -ti:3000 | xargs kill -9
```

**DATABASE_URL not set:**
- Development: See `.env.example`
- Production: Configure in Railway/Render dashboard

**Build fails:**
```bash
pnpm install --force
pnpm run build
```

**Docker build slow:**
```bash
docker system prune -a
```

## 📚 Architecture Decisions

- **Monorepo:** pnpm workspaces allow independent package evolution
- **OpenAPI contract:** Single source of truth for API - regenerate Zod/client after changes
- **Database isolation:** Queries centralized in `lib/db` package
- **Type safety:** Generated types prevent drift between frontend/backend
- **Production-ready:** Includes health checks, logging, error handling

## 👥 User Preferences

- Keep changes small and explicit
- Regenerate API artifacts after spec updates
- Document environment assumptions
- Avoid hidden runtime dependencies

## ⚡ Performance

- React app pre-built and served as static files
- API runs with Node.js event loop optimization
- Database connection pooling (Drizzle ORM)
- Logging disabled in production (unless `LOG_LEVEL=debug`)

## 📖 See Also

- [DEPLOY.md](./DEPLOY.md) - Detailed deployment guide
- [ai_video_engine/README.md](./ai_video_engine/README.md) - Python video engine docs
- [GitHub Actions](./.github/workflows/deploy.yml) - CI/CD pipeline

## 📝 License

MIT
