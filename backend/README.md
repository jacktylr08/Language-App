# Spanish Learning App - Backend

Evidence-based language learning backend with spaced repetition engine, curriculum sequencing, and progress tracking.

## Quick Start

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- PostgreSQL (via Docker)
- Redis (via Docker)
- S3/Minio (via Docker)

### 1. Start Infrastructure

```bash
cd ..
docker-compose up -d
```

Verify services are running:
```bash
docker-compose ps
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment

```bash
cp .env.example .env
# Edit .env if needed (defaults work with docker-compose)
```

### 4. Run Migrations

```bash
npm run db:migrate:dev
```

This creates all tables, indexes, and triggers.

### 5. Seed Database (optional)

```bash
npm run db:seed:dev
```

Inserts sample vocabulary and content.

### 6. Start Development Server

```bash
npm run dev
```

Server runs on `http://localhost:3001`

Check health: `curl http://localhost:3001/health`

## Project Structure

```
src/
├── index.ts              # Express app entry point
├── config/              # Configuration (database, Redis, etc.)
├── middleware/          # Express middleware (auth, logging, etc.)
├── routes/              # API routes (organized by feature)
│   ├── auth.ts
│   ├── lessons.ts
│   ├── vocabulary.ts
│   └── reviews.ts
├── services/            # Business logic
│   ├── auth.ts
│   ├── spaced-repetition.ts  # SM-2 algorithm
│   ├── curriculum.ts
│   └── vocabulary.ts
├── models/              # Data models (Objection.js)
├── types/               # TypeScript interfaces
├── utils/               # Utilities (logger, cache, etc.)
├── database/            # Migrations & seeds
└── __tests__/           # Unit & integration tests
```

## Key Services

### Spaced Repetition Engine (`services/spaced-repetition.ts`)
Implements SM-2 algorithm with:
- State machine (new → learning → review → mastered)
- Configurable intervals (1d, 3d, 7d, 14d, 30d, 60d)
- Ease factor adjustment
- 20+ passive encounter tracking

### Curriculum Engine (`services/curriculum.ts`)
Handles:
- Lesson prerequisites
- Calendar-based unlocking
- Proficiency gating
- Phase transitions

### Vocabulary Service (`services/vocabulary.ts`)
Manages:
- Frequency-based loading
- Audio/image hosting (S3/Minio)
- Related word associations
- Category tagging

## API Endpoints

See `../API_SPECIFICATION.md` for complete documentation.

Core endpoints (MVP):
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `GET /lessons` - List lessons
- `GET /lessons/:id` - Lesson details
- `GET /vocabulary` - Search vocabulary
- `GET /reviews/due-today` - Daily review queue
- `POST /reviews/:id` - Submit review

## Testing

```bash
# Run all tests
npm test

# Watch mode
npm test:watch

# Coverage report
npm test:coverage
```

Target coverage: >80% (branches, functions, lines)

## Linting & Formatting

```bash
# Lint
npm run lint

# Fix issues
npm run lint -- --fix

# Format
npm run format
```

## Database

### Viewing Data

```bash
# Connect to PostgreSQL
docker exec -it language-app-postgres psql -U user -d language_app

# Useful queries
SELECT * FROM users;
SELECT * FROM vocabulary;
SELECT * FROM user_vocabulary_progress;
```

### Minio (S3)

Access Minio console at `http://localhost:9001`
- Username: `minioadmin`
- Password: `minioadmin`

Create bucket:
```bash
mc mb minio/language-app
```

## Redis

```bash
docker exec -it language-app-redis redis-cli
> KEYS *
> GET reviews:user_id:due_today
```

## Development Workflow

1. **Create feature branch** (see git instructions)
2. **Implement feature** in `src/`
3. **Write tests** in `__tests__/`
4. **Run linting & tests** before committing
5. **Update API spec** if endpoints change
6. **Commit with clear message**
7. **Push to feature branch**
8. **Create PR** against main

## Building for Production

```bash
npm run build
npm start
```

Or use Docker:
```bash
docker build -t language-app-backend .
docker run -p 3001:3001 language-app-backend
```

## Troubleshooting

### Database connection error
```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Check connection string in .env
# Default: postgresql://user:password@localhost:5432/language_app
```

### Redis connection error
```bash
# Check Redis is running
docker-compose ps redis

# Test connection
redis-cli -h localhost ping
```

### Migrations won't run
```bash
# Check migrations directory exists
ls src/database/migrations/

# Run migrations with verbose output
DATABASE_URL=postgresql://user:password@localhost:5432/language_app \
  npx knex migrate:latest --env development
```

### Port already in use
Change `PORT` in `.env` (default 3001) or kill process:
```bash
lsof -i :3001
kill -9 <PID>
```

## Architecture Notes

- **Database**: PostgreSQL 15+ with JSONB for preferences
- **Caching**: Redis for spaced repetition queue (sub-100ms latency)
- **Storage**: S3/Minio for audio files (not database)
- **Async Jobs**: Bull queue for daily recalculations, email notifications
- **ORM**: Objection.js (lightweight, SQL-first)
- **API**: Express.js with TypeScript, no-magic approach

## Next Steps

See `../IMPLEMENTATION_CHECKLIST.md` Week 2-3 for:
- Authentication implementation
- Spaced repetition engine
- Lesson/vocabulary endpoints
- Testing strategy
