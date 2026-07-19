# Project Structure & Setup Guide

## Directory Layout

```
Language-App/
├── ARCHITECTURE.md                 # Main design document (this repo)
├── DATABASE_SCHEMA.sql             # PostgreSQL schema
├── PROJECT_STRUCTURE.md            # This file
├── API_SPEC.md                     # REST API specification
├── IMPLEMENTATION_CHECKLIST.md     # Week-by-week tasks
│
├── backend/                        # Node.js + Express.js backend
│   ├── src/
│   │   ├── main.ts                 # Express app entry point
│   │   ├── config/
│   │   │   ├── database.ts         # PostgreSQL connection pool
│   │   │   ├── redis.ts            # Redis client setup
│   │   │   └── env.ts              # Environment variables
│   │   ├── routes/
│   │   │   ├── auth.ts             # /auth/* endpoints
│   │   │   ├── lessons.ts          # /lessons/* endpoints
│   │   │   ├── vocabulary.ts       # /vocabulary/* endpoints
│   │   │   ├── reviews.ts          # /reviews/* endpoints (SR engine)
│   │   │   ├── progress.ts         # /progress/* endpoints
│   │   │   ├── stories.ts          # /stories/* endpoints
│   │   │   └── conversations.ts    # /conversations/* endpoints (post-MVP)
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts
│   │   │   ├── lesson.controller.ts
│   │   │   ├── vocabulary.controller.ts
│   │   │   ├── review.controller.ts
│   │   │   ├── progress.controller.ts
│   │   │   └── ...
│   │   ├── services/
│   │   │   ├── auth.service.ts
│   │   │   ├── spaced-repetition.service.ts  # SM-2 algorithm
│   │   │   ├── curriculum.service.ts         # Lesson sequencing
│   │   │   ├── vocabulary.service.ts
│   │   │   ├── progress.service.ts
│   │   │   └── analytics.service.ts
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts   # JWT verification
│   │   │   ├── error-handler.ts
│   │   │   └── request-logger.ts
│   │   ├── models/
│   │   │   ├── user.model.ts
│   │   │   ├── lesson.model.ts
│   │   │   ├── vocabulary.model.ts
│   │   │   ├── progress.model.ts
│   │   │   └── ...
│   │   ├── jobs/                   # Bull queue jobs
│   │   │   ├── calculate-daily-reviews.ts
│   │   │   ├── notify-users.ts
│   │   │   └── aggregate-metrics.ts
│   │   ├── utils/
│   │   │   ├── logger.ts
│   │   │   ├── validators.ts
│   │   │   ├── date-helpers.ts
│   │   │   └── sm2-calculator.ts   # SM-2 helper functions
│   │   └── types/
│   │       ├── user.types.ts
│   │       ├── vocabulary.types.ts
│   │       └── api.types.ts
│   ├── migrations/                 # Database migrations (Knex.js)
│   │   ├── 001_initial_schema.ts
│   │   ├── 002_add_indexes.ts
│   │   └── ...
│   ├── tests/
│   │   ├── unit/
│   │   │   ├── spaced-repetition.test.ts
│   │   │   ├── curriculum.test.ts
│   │   │   └── ...
│   │   └── integration/
│   │       ├── auth.integration.test.ts
│   │       ├── reviews.integration.test.ts
│   │       └── ...
│   ├── docker/
│   │   ├── Dockerfile             # Production Docker image
│   │   └── Dockerfile.dev         # Development Docker image
│   ├── package.json
│   ├── tsconfig.json
│   ├── jest.config.js
│   └── .env.example               # Environment template
│
├── frontend/                       # React + Next.js frontend
│   ├── app/
│   │   ├── layout.tsx              # Root layout (auth check, theme provider)
│   │   ├── page.tsx                # Home/landing page
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   └── onboarding/page.tsx
│   │   ├── (lessons)/
│   │   │   ├── listening/[id]/page.tsx
│   │   │   ├── story/[id]/page.tsx
│   │   │   └── real-media/[id]/page.tsx
│   │   ├── (practice)/
│   │   │   ├── vocabulary/page.tsx
│   │   │   ├── conversation/page.tsx
│   │   │   └── conversation/[id]/page.tsx
│   │   ├── (progress)/
│   │   │   ├── dashboard/page.tsx
│   │   │   └── export/page.tsx
│   │   └── api/
│   │       └── (API routes for non-proxied calls)
│   ├── components/
│   │   ├── audio-player.tsx        # Reusable audio player with speed control
│   │   ├── vocabulary-card.tsx     # Flip card for SR review
│   │   ├── lesson-header.tsx       # Lesson progress bar
│   │   ├── comprehension-question.tsx
│   │   ├── conversation-ui.tsx
│   │   └── ...
│   ├── hooks/
│   │   ├── useVocabularyReviews.ts # Fetch daily reviews
│   │   ├── useLessonProgress.ts
│   │   ├── useConversation.ts
│   │   └── useAuth.ts
│   ├── lib/
│   │   ├── api-client.ts           # Axios instance, API methods
│   │   ├── auth-context.ts
│   │   ├── spaced-repetition.ts    # SM-2 calculations (client-side helpers)
│   │   ├── audio-manager.ts        # Howler.js wrapper
│   │   └── validators.ts
│   ├── styles/
│   │   ├── globals.css             # Tailwind imports
│   │   └── variables.css           # CSS variables (dark mode support)
│   ├── public/
│   │   └── ... (static assets, icons)
│   ├── next.config.js
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── package.json
│   └── .env.local.example          # Local environment template
│
├── content/                        # Content management
│   ├── vocabulary/
│   │   ├── es-top-500.json        # Frequency-ordered vocabulary lists
│   │   ├── es-top-1000.json
│   │   └── es-top-2500.json
│   ├── lessons/
│   │   ├── foundation-phase/      # Week 1-4 phonetics + basic lessons
│   │   │   ├── phonetics-01.json
│   │   │   ├── listening-comprehension-01.json
│   │   │   └── ...
│   │   ├── core-phase/            # Week 5-12 vocabulary expansion
│   │   │   ├── theme-food.json
│   │   │   ├── theme-family.json
│   │   │   └── ...
│   │   └── conversation-phase/    # Week 9+ conversation scenarios
│   ├── stories/
│   │   ├── level-1/
│   │   │   ├── story-morning-routine.json
│   │   │   └── ...
│   │   └── level-2/
│   ├── audio/
│   │   ├── lessons/               # Lesson audio files (MP3/WAV)
│   │   ├── vocabulary/            # Pronunciation audio
│   │   ├── stories/               # Narrated story audio
│   │   └── ...
│   └── seed-data.ts               # Database seeding script
│
├── infra/                         # Infrastructure & deployment
│   ├── docker-compose.yml         # Local dev environment
│   ├── docker-compose.prod.yml    # Production setup
│   ├── kubernetes/
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   ├── configmap.yaml
│   │   └── secrets.yaml
│   ├── nginx/
│   │   └── nginx.conf             # Reverse proxy, static file serving
│   └── monitoring/
│       ├── prometheus.yml         # Metrics scraping
│       └── grafana-dashboards/
│
├── .github/
│   ├── workflows/
│   │   ├── backend-ci.yml        # Backend lint, test, build
│   │   ├── frontend-ci.yml       # Frontend lint, test, build
│   │   ├── deploy.yml            # Deploy to staging/prod
│   │   └── content-validation.yml # Content schema validation
│   └── pull_request_template.md
│
├── docs/
│   ├── API.md                     # API endpoint documentation
│   ├── CURRICULUM.md              # Detailed curriculum progression
│   ├── CONTENT_CREATION.md        # Guide for creating lessons/stories
│   ├── DEPLOYMENT.md              # Deploy procedures
│   ├── MONITORING.md              # Observability setup
│   └── TROUBLESHOOTING.md         # Common issues
│
├── scripts/
│   ├── seed-database.ts           # Load initial vocabulary
│   ├── validate-content.ts        # Validate lesson structure
│   ├── generate-vocab-audio.ts    # Batch create vocab pronunciations
│   ├── export-user-data.ts        # GDPR data export
│   └── migrate-audio-to-s3.ts     # Upload audio files to S3
│
├── docker-compose.yml             # Local development stack
├── .env.example                   # Environment template (root)
├── .gitignore
├── README.md
└── CHANGELOG.md
```

## Development Environment Setup

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 15+ (or use Docker image)
- Redis 7+ (or use Docker image)
- AWS CLI (for S3 operations)

### Local Development (Docker Compose)

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd Language-App
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your settings
   ```

3. **Start local services**
   ```bash
   docker-compose up -d
   # Services:
   # - PostgreSQL on :5432
   # - Redis on :6379
   # - Minio (S3-compatible) on :9000
   ```

4. **Backend setup**
   ```bash
   cd backend
   npm install
   npm run db:migrate        # Run migrations
   npm run db:seed           # Load vocabulary + sample lessons
   npm run dev               # Start dev server on :3001
   ```

5. **Frontend setup**
   ```bash
   cd frontend
   npm install
   npm run dev               # Start dev server on :3000
   ```

6. **Access the app**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - Minio S3 console: http://localhost:9000 (minioadmin/minioadmin)

### Backend Development

#### Running Tests
```bash
npm run test              # All tests
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests only
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report
```

#### Database Migrations
```bash
npm run db:migrate        # Run pending migrations
npm run db:migrate:down   # Rollback last migration
npm run db:seed           # Load seed data
npm run db:reset          # Drop all, recreate schema, seed
```

#### Code Quality
```bash
npm run lint              # ESLint
npm run format            # Prettier
npm run type-check        # TypeScript
```

### Frontend Development

#### Running Tests
```bash
npm run test              # Unit tests
npm run test:e2e          # End-to-end tests (Playwright)
npm run test:watch        # Watch mode
```

#### Build & Production
```bash
npm run build             # Production build
npm run start             # Start production server
npm run export            # Static export (if applicable)
```

## Key Files & Entry Points

### Backend

**Main Entry:** `backend/src/main.ts`
```typescript
// Initializes Express app, connects to DB/Redis, starts server
```

**Spaced Repetition Engine:** `backend/src/services/spaced-repetition.service.ts`
- `scheduleNextReview()` - Calculate next review interval (SM-2)
- `recordEncounter()` - Log passive input
- `calculateDueReviews()` - Get today's reviews
- `generateReviewQueue()` - Cache optimization

**Curriculum Engine:** `backend/src/services/curriculum.service.ts`
- `getAvailableLessons()` - Unlock logic
- `getLessonPrerequisites()` - Check prerequisites
- `progressLesson()` - Track lesson completion

**API Routes:**
- `backend/src/routes/reviews.ts` - POST /reviews/vocabulary/:id (SR feedback)
- `backend/src/routes/lessons.ts` - GET /lessons (list), GET /lessons/:id (detail)
- `backend/src/routes/vocabulary.ts` - GET /vocabulary (search)

### Frontend

**Auth Flow:** `frontend/app/(auth)/`
- Login → Register → Onboarding

**Lesson Player:** `frontend/app/(lessons)/listening/[id]/page.tsx`
- Audio player component
- Comprehension questions
- Vocabulary extraction

**Vocabulary Practice:** `frontend/app/(practice)/vocabulary/page.tsx`
- Fetches daily review queue
- Card stack UI (Howler.js for pronunciation audio)
- Submits review scores

**Progress Dashboard:** `frontend/app/(progress)/dashboard/page.tsx`
- Acquisition metrics
- Listening hours
- Vocabulary mastery timeline

**API Client:** `frontend/lib/api-client.ts`
- Axios instance
- Methods for all endpoints
- Error handling, retry logic

## Content Management

### Lesson JSON Format
```json
{
  "id": "lesson-001",
  "title": "Mi primer día",
  "level": 0,
  "curriculum_phase": "foundation",
  "content_type": "listening_comprehension",
  "audio_url": "s3://bucket/lessons/lesson-001.mp3",
  "segments": [
    {
      "start_ms": 0,
      "end_ms": 5000,
      "spanish": "Hola, me llamo Juan.",
      "english": "Hello, my name is Juan.",
      "vocabulary_ids": ["vocab-001", "vocab-002"]
    }
  ],
  "vocabulary": ["vocab-001", "vocab-002"],
  "comprehension_questions": [
    {
      "type": "multiple_choice",
      "question": "What is the person's name?",
      "options": ["Juan", "María", "Pedro"],
      "correct": 0
    }
  ]
}
```

### Vocabulary JSON Format
```json
{
  "id": "vocab-0245",
  "spanish": "comer",
  "english": ["to eat"],
  "pos": "verb",
  "frequency_rank": 245,
  "audio_url": "s3://bucket/vocab/comer.mp3",
  "example_sentence": {
    "spanish": "Yo como pan.",
    "english": "I eat bread."
  },
  "category": "verb_ar_regular",
  "difficulty_factor": 2.5
}
```

### Content Validation Script
```bash
npm run validate-content  # Check all JSON schemas
```

## Testing Strategy

### Unit Tests
- SM-2 algorithm (edge cases: new words, forgotten words, easy words)
- Curriculum unlocking logic
- Date/time helpers

### Integration Tests
- Full review workflow (submit review → update SR state → get next review)
- Lesson completion flow
- User creation → onboarding → first lesson

### End-to-End Tests (Playwright)
- Onboarding flow
- Listening lesson start → finish
- Vocabulary review card stack
- Progress dashboard data display

## Deployment

### Staging
```bash
git push origin develop
# GitHub Actions: runs tests, builds Docker images, deploys to staging
# Access: https://staging.language-app.dev
```

### Production
```bash
git tag v0.1.0
git push origin v0.1.0
# GitHub Actions: runs tests, builds images, deploys to prod
# Access: https://language-app.dev
```

## Performance & Monitoring

### Key Metrics
- API response time (< 100ms p95)
- Vocabulary review cache hit rate (> 95%)
- Audio playback latency (< 50ms)
- Database query performance

### Observability
- **Prometheus:** Scrapes /metrics endpoint
- **Grafana:** Dashboards for response time, cache hit rate, active users
- **Sentry:** Error tracking (especially SR calculation errors)
- **ELK:** Log aggregation, searchable logs

### Alerts
- SR calculation errors
- Database connection pool exhaustion
- Redis cache failures
- High API latency (> 500ms)

## Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql://user:pass@localhost:5432/language_app
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_secret_key
JWT_EXPIRY=24h
S3_BUCKET=language-app-audio
S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
NODE_ENV=development
LOG_LEVEL=debug
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_APP_NAME=Spanish Learning App
```

## Troubleshooting

### Database Connection Issues
```bash
# Check PostgreSQL is running
docker ps | grep postgres

# View logs
docker logs language-app-postgres

# Reset database
npm run db:reset
```

### Redis Cache Issues
```bash
# Clear cache
redis-cli FLUSHALL

# Check key space
redis-cli INFO keyspace
```

### Audio Playback Issues
- Check S3/Minio is accessible
- Verify audio file format (MP3, sample rate 44.1kHz)
- Check browser console for Howler.js errors

## Next Steps

1. **Start with Database:** Run migrations, seed initial vocabulary
2. **Build Auth:** Login/register endpoints, JWT validation
3. **Implement SR Engine:** SM-2 algorithm, Redis caching
4. **Frontend Onboarding:** Level assessment, preference collection
5. **First Lesson:** Listening player, audio controls, comprehension questions
6. **Vocabulary Review:** Card stack UI, spaced repetition feedback loop
7. **Progress Dashboard:** Metrics display, analytics
8. **Beta Testing:** Recruit users, gather feedback
9. **MVP+1 Planning:** Conversation, real media, mobile

---

See also:
- `ARCHITECTURE.md` - Overall design
- `API_SPEC.md` - REST API details
- `IMPLEMENTATION_CHECKLIST.md` - Week-by-week tasks
- `docs/CONTENT_CREATION.md` - How to create lessons
- `docs/DEPLOYMENT.md` - Deployment procedures
