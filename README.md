# Affiliate Video AI Studio

A full-stack production-ready platform for creating AI-powered affiliate marketing videos using NestJS, Next.js 14, PostgreSQL, Redis, MinIO, and AI services (DeepSeek-R1/GPT-4o-mini).

## Features

- 🤖 **AI Content Generation** — Titles, hooks, scripts, storyboards via Ollama (DeepSeek-R1) + OpenAI fallback
- 🎬 **Video Rendering** — FFmpeg-based 1080×1920 vertical video (TikTok/Reels format)
- 📦 **Product Import** — Auto-scrape from Shopee and TikTok Shop affiliate links
- 📈 **Trend Analysis** — Weighted trend scoring (sales growth, engagement, competition)
- 🧠 **Knowledge Base** — Semantic search with OpenAI text-embedding-3-small + cosine similarity
- 👤 **AI Presenters** — CRUD for presenter profiles
- 🔐 **JWT Auth** — Access token (15m) + refresh token (7d)
- 🗄️ **S3 Storage** — MinIO-compatible file storage for rendered videos

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | NestJS 10, TypeScript, Prisma ORM |
| Frontend | Next.js 14 (App Router), TailwindCSS, Zustand, TanStack Query |
| Database | PostgreSQL 15 |
| Queue | Bull (Redis) |
| Storage | MinIO (S3-compatible) |
| AI | Ollama (DeepSeek-R1) + OpenAI GPT-4o-mini fallback |
| Video | FFmpeg via fluent-ffmpeg |

## Quick Start

```bash
# 1. Clone and copy env
cp .env.example .env
# Edit .env with your values

# 2. Start infrastructure
docker-compose up postgres redis minio -d

# 3. Backend
cd backend
npm install
npx prisma migrate dev
npm run start:dev

# 4. Frontend
cd frontend
npm install
npm run dev
```

Or run everything with Docker:

```bash
docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/api
- Swagger Docs: http://localhost:3001/api/docs
- MinIO Console: http://localhost:9001

## Project Structure

```
├── backend/                 # NestJS API
│   ├── src/
│   │   ├── auth/            # JWT authentication
│   │   ├── products/        # Product import & scraping
│   │   ├── trends/          # Trend analysis
│   │   ├── ai-content/      # AI content generation
│   │   ├── presenters/      # AI presenter CRUD
│   │   ├── knowledge/       # Knowledge base + embeddings
│   │   ├── videos/          # Video project management
│   │   ├── workers/         # Bull queue processors
│   │   ├── render/          # FFmpeg video rendering
│   │   ├── storage/         # S3/MinIO integration
│   │   └── prisma/          # Database service
│   └── prisma/schema.prisma
├── frontend/                # Next.js 14
│   └── src/
│       ├── app/             # App Router pages
│       ├── components/      # UI components
│       ├── store/           # Zustand state
│       └── lib/             # API client & utilities
├── docker-compose.yml
└── .env.example
```

## API Endpoints

| Module | Endpoints |
|---|---|
| Auth | POST /api/auth/register, /login, /logout, GET /profile |
| Products | POST /api/products/import, GET /products, /products/:id, /trending |
| Trends | GET /api/trends, /trends/:productId, POST /analyze/:productId |
| AI Content | POST /api/ai-content/generate |
| Presenters | CRUD /api/presenters |
| Knowledge | CRUD /api/knowledge, POST /knowledge/search |
| Videos | POST /api/videos, GET /videos, /videos/:id, POST /:id/render, GET /:id/status |

## Environment Variables

See `.env.example` for all required variables.
