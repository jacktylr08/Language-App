# MVP Implementation Checklist (Weeks 1-14)

**Goal:** Ship core learning loop by end of Week 14 (foundation phase, spaced repetition, basic progress tracking)

---

## WEEK 1: Backend Foundation

### Database & Infrastructure
- [ ] Set up PostgreSQL schema from `DATABASE_SCHEMA.sql`
- [ ] Create database migrations (Knex.js or TypeORM)
- [ ] Test ACID transaction support (critical for SR state)
- [ ] Set up Redis connection + test caching
- [ ] Configure S3/Minio for audio storage
- [ ] Create Docker Compose stack (PostgreSQL, Redis, Minio)
- [ ] Document all DB connection strings in .env.example

### Project Setup
- [ ] Initialize Node.js project with TypeScript
- [ ] Set up Express.js boilerplate
- [ ] Configure ESLint, Prettier, Jest
- [ ] Create directory structure (see PROJECT_STRUCTURE.md)
- [ ] Add GitHub Actions CI workflow
- [ ] Set up Sentry for error tracking
- [ ] Create basic Dockerfile for backend

**Deliverable:** Runnable backend with PostgreSQL, Redis, S3 connected
**Time:** ~40 hours

---

## WEEK 2: Authentication & Basic APIs

### Authentication
- [ ] Implement JWT token generation (access + refresh)
- [ ] Create `/auth/register` endpoint
- [ ] Create `/auth/login` endpoint
- [ ] Create `/auth/refresh` endpoint
- [ ] Create `/auth/logout` endpoint
- [ ] Create `/auth/me` endpoint
- [ ] Implement JWT middleware (verify token in protected routes)
- [ ] Hash passwords (bcrypt)
- [ ] Test all auth flows end-to-end
- [ ] Rate limiting on auth endpoints

### Basic Lesson CRUD
- [ ] Create `/lessons` (GET - list, paginate, filter by level/phase)
- [ ] Create `/lessons/:id` (GET - full lesson detail with segments + vocabulary + questions)
- [ ] Create `/lessons/:id/audio` (GET - redirect to S3)
- [ ] Implement lesson filtering by level, phase, theme
- [ ] Test pagination with large datasets

### Vocabulary Endpoints
- [ ] Create `/vocabulary` (GET - search, paginate, filter)
- [ ] Create `/vocabulary/:id` (GET - full entry with related words)
- [ ] Create `/vocabulary/:id/audio` (GET - redirect to S3)
- [ ] Implement search by Spanish or English word
- [ ] Implement frequency rank filtering

**Deliverable:** All auth + lesson/vocab endpoints tested
**Time:** ~50 hours

---

## WEEK 3: Spaced Repetition Engine

### Core Algorithm
- [ ] Implement SM-2 algorithm
  - [ ] Calculate interval_days based on ease_factor and quality
  - [ ] Update ease_factor based on response quality
  - [ ] Handle edge cases (new words, forgotten words, easy words)
  - [ ] Test algorithm with known inputs/outputs
- [ ] Implement state transitions (new → learning → review → mastered)
- [ ] Implement "encounter tracking" (passive input logging)
- [ ] Handle "reset on 3 consecutive failures"

### Redis Caching
- [ ] Design review queue cache structure
  - `reviews:{userId}:due_today` (array of vocab IDs, < 100ms lookup)
  - `vocab_state:{vocabId}:{userId}` (full SR state for quick lookup)
  - `vocab:{vocabId}` (vocabulary metadata, never expires)
- [ ] Implement cache invalidation strategy
- [ ] Implement daily recalculation job (Bull queue)
- [ ] Cache warmup on app startup

### Review Endpoints
- [ ] Create `/reviews/due-today` (GET - vocabulary IDs due today)
- [ ] Create `/reviews/queue` (GET - full vocabulary data for frontend)
- [ ] Create `/reviews/vocabulary/:id` (POST - submit review result)
  - [ ] Validate quality (0-5)
  - [ ] Call SM-2 algorithm
  - [ ] Update DB
  - [ ] Update Redis cache
  - [ ] Return updated progress + next vocab
- [ ] Create `/reviews/analytics` (GET - acquisition metrics)

### Audit Trail
- [ ] Create `vocabulary_review_history` table to log all reviews
- [ ] Log state before/after each review (for debugging SR calculations)

### Testing
- [ ] Unit test SM-2 algorithm (10+ test cases)
- [ ] Unit test state transitions
- [ ] Integration test: review submission → SR state update → cache invalidation
- [ ] Performance test: < 100ms response time for due-today query

**Deliverable:** Complete SR engine with testing
**Time:** ~60 hours

---

## WEEK 4: Lesson Progress & Vocabulary Acquisition

### Lesson Progress Tracking
- [ ] Create `lesson_progress` table & model
- [ ] Create `/lessons/:id/start` (POST - record lesson started)
- [ ] Create `/lessons/:id/complete` (POST - mark lesson done, extract vocabulary)
  - [ ] Validate completion (100% or configurable threshold)
  - [ ] Extract vocabulary_ids from lesson
  - [ ] Create user_vocabulary_progress entries for new words
  - [ ] Mark lesson as completed
  - [ ] Check prerequisites for next lesson unlock
  - [ ] Trigger review queue recalculation
- [ ] Create `/lessons/:id/comprehension-answer` (POST - submit answer, validate)
  - [ ] Check if answer is correct (for MC)
  - [ ] Score open-ended answers (manual or simple heuristic for now)
  - [ ] Update lesson_progress with score

### Vocabulary Acquisition
- [ ] Implement "20 passive encounters before first active review" rule
  - [ ] Track `encounters` count in user_vocabulary_progress
  - [ ] Don't make word due for review until encounters >= 20
  - [ ] Log every listen/read where word appears
- [ ] Implement lesson prerequisite checking
  - [ ] Query prerequisites from lesson
  - [ ] Check if all prerequisite lessons are completed
  - [ ] Block lesson start if prerequisites not met
- [ ] Implement calendar-based unlocking
  - [ ] Some lessons unlock only after N days (e.g., lesson 5 on day 8+)
  - [ ] Check calendar_unlock_day in lesson table

### Side Effects & Async Jobs
- [ ] Set up Bull job queue
- [ ] Create daily review queue recalculation job
  - [ ] Runs at midnight (or configurable time)
  - [ ] Queries all vocabulary due today for each user
  - [ ] Updates Redis cache
  - [ ] (Optionally) sends email notifications
- [ ] Create job to aggregate daily metrics (preparation for analytics)

**Deliverable:** Full lesson → vocabulary → SR review flow working
**Time:** ~50 hours

---

## WEEK 5: Frontend Foundation

### Project Setup
- [ ] Initialize Next.js 14 project with TypeScript
- [ ] Configure Tailwind CSS + shadcn/ui
- [ ] Set up TanStack Query for server state
- [ ] Set up Zustand for client state (minimal)
- [ ] Create API client (axios wrapper)
- [ ] Configure environment variables
- [ ] Create basic Docker setup for frontend

### Authentication UI
- [ ] Create `/login` page
  - [ ] Email + password form
  - [ ] Error handling
  - [ ] Redirect to onboarding on success
- [ ] Create `/register` page
  - [ ] Email + password + confirm password form
  - [ ] Validation (password strength, email format)
  - [ ] Link to login
- [ ] Create auth context (store JWT token, user info)
- [ ] Create protected route wrapper
  - [ ] Redirect to login if not authenticated
  - [ ] Refresh token if expired

### Onboarding Flow
- [ ] Create `/onboarding` page (3-4 screens)
  - [ ] Screen 1: Goal setting ("What's your goal?")
  - [ ] Screen 2: Level assessment (3-5 short audio clips, self-report)
  - [ ] Screen 3: Preferences (daily reviews, audio speed, etc.)
  - [ ] Screen 4: Ready screen, "Start first lesson"
- [ ] Save preferences to backend
- [ ] Redirect to first lesson on completion

### Basic Layouts
- [ ] Create root layout with theme provider
- [ ] Create lesson layout (header with progress bar)
- [ ] Create practice layout
- [ ] Dark mode support (Tailwind)

**Deliverable:** Auth flow + onboarding flow (no backend integration yet)
**Time:** ~45 hours

---

## WEEK 6: Audio Player & Lesson UI

### Audio Player Component
- [ ] Install Howler.js
- [ ] Create reusable `<AudioPlayer />` component
  - [ ] Play/pause button
  - [ ] Progress bar (seek)
  - [ ] Current time / duration display
  - [ ] Playback speed control (0.75x, 1.0x, 1.25x)
  - [ ] Volume control
  - [ ] Repeat button (single, loop)
  - [ ] Handle audio errors gracefully
- [ ] Test on multiple browsers (Chrome, Firefox, Safari)
- [ ] Test on mobile
- [ ] Optimize for low bandwidth (streaming, caching)

### Listening Comprehension Lesson Page
- [ ] Create `/lessons/listening/[id]` page
- [ ] Implement lesson flow:
  1. Audio player (large, prominent)
  2. Transcript toggle (Spanish only initially, English after listen)
  3. Vocabulary preview (clickable chips)
  4. Comprehension questions (MC or open-ended)
  5. Vocabulary extraction (card stack)
- [ ] Fetch lesson from backend (`/lessons/:id`)
- [ ] Stream audio from S3
- [ ] Display comprehension questions
- [ ] Submit answers to `/lessons/:id/comprehension-answer`
- [ ] On lesson complete, call `/lessons/:id/complete`
- [ ] Show extracted vocabulary with definitions
- [ ] Display next lesson unlock time (if applicable)

### Vocabulary Card Component
- [ ] Create `<VocabularyCard />` component (for preview)
  - [ ] Flip animation (front: Spanish, back: English)
  - [ ] Click to hear pronunciation (Howler.js)
  - [ ] Example sentence display
  - [ ] Clean, minimal design

### Comprehension Questions Component
- [ ] Create `<ComprehensionQuestion />` component
  - [ ] MC: Radio buttons or clickable options
  - [ ] Open-ended: Text input
  - [ ] Submit button
  - [ ] Show feedback (correct/incorrect, explanation)
  - [ ] Move to next question

**Deliverable:** Full listening lesson flow (audio + questions + vocabulary)
**Time:** ~50 hours

---

## WEEK 7: Vocabulary Review UI & State Management

### Vocabulary Review Card Stack
- [ ] Create `<VocabularyReviewCard />` component
  - [ ] Front: Spanish word + pronunciation button
  - [ ] Back: English definition + example sentence + audio
  - [ ] Flip animation (smooth)
  - [ ] Swipe gestures (left/right) or arrow keys for navigation
- [ ] Create review response buttons
  - [ ] "Again" (quality 0, red)
  - [ ] "Struggled" (quality 1-2, orange)
  - [ ] "Got it" (quality 3, blue)
  - [ ] "Easy" (quality 4-5, green)
- [ ] Implement submit on button click
  - [ ] POST to `/reviews/vocabulary/:id`
  - [ ] Update local state (countdown, next card)
  - [ ] Optimistic UI updates

### Vocabulary Review Page
- [ ] Create `/practice/vocabulary` page
- [ ] Fetch daily reviews on load
  - [ ] GET `/reviews/queue`
  - [ ] Store in TanStack Query
- [ ] Display progress bar (X/20 reviews done)
- [ ] Card stack loop:
  - [ ] Show card
  - [ ] User answers
  - [ ] Submit → fetch next card
  - [ ] Repeat until all done
- [ ] On completion
  - [ ] Show "Great job! Today's complete"
  - [ ] Suggest next action (read story, move on, etc.)
- [ ] Implement keyboard shortcuts
  - [ ] Space to flip
  - [ ] Number keys 0-5 for quality rating

### State Management
- [ ] Use TanStack Query for server state
  - [ ] Cache due-today reviews
  - [ ] Invalidate on new review submitted
- [ ] Use Zustand for UI state
  - [ ] Current card index
  - [ ] Remaining reviews count
- [ ] Implement offline support (basic, cache card data locally)

### Analytics/Progress Page (Basic)
- [ ] Create `/progress/dashboard` page
- [ ] Fetch metrics: GET `/progress/vocabulary`
- [ ] Display:
  - [ ] Active vocabulary count
  - [ ] Mastered vocabulary count
  - [ ] Total listening hours
  - [ ] Lessons completed
  - [ ] Upcoming milestones

**Deliverable:** Full vocabulary review flow (SR feedback loop)
**Time:** ~45 hours

---

## WEEK 8: Story Reading & Integration

### Story Model & Endpoints
- [ ] Create stories table + story_blocks table
- [ ] Create `/stories` (GET - list by level/theme)
- [ ] Create `/stories/:id` (GET - full story with blocks + comprehension)
- [ ] Create `/stories/:id/read` (POST - log reading, extract vocabulary)

### Story Reading Page
- [ ] Create `/lessons/story/[id]` page
- [ ] Display story text in blocks (one section at a time or scroll)
- [ ] Hover tooltip: click word → definition + pronunciation
- [ ] Optional audio narration (play while reading)
- [ ] Optional playback speed control
- [ ] Reading time estimate
- [ ] Comprehension check at end (open-ended or MC)
- [ ] Submit comprehension answer
- [ ] Extract new vocabulary from story
- [ ] Mark story as completed

### Integration
- [ ] Link lessons to stories
  - [ ] After completing lesson, suggest related story
  - [ ] Story shown on lesson complete screen
- [ ] Vocabulary from stories feeds into SR system
  - [ ] New words get entries in user_vocabulary_progress
  - [ ] Schedule as "learning" (passive encounters)

### Sample Content
- [ ] Create 5-10 sample stories (foundation level)
  - [ ] Simple themes: daily routines, family, food
  - [ ] 50-200 words each
  - [ ] Use high-frequency vocabulary
  - [ ] Include example sentences

**Deliverable:** Story reading flow integrated with SR system
**Time:** ~40 hours

---

## WEEK 9: Curriculum Sequencing & Lesson Unlocking

### Curriculum Engine
- [ ] Implement `curriculum.service.ts`
  - [ ] `getAvailableLessons(userId)` - Check prerequisites + calendar + performance
  - [ ] `checkPrerequisitesMet(lessonId, userId)` - Query prerequisite completion
  - [ ] `isLessonUnlocked(lessonId, userId)` - All checks combined
  - [ ] `getNextLessonAfterCompletion(completedLessonId)` - Recommend next lesson

### Prerequisites & Calendar Unlocking
- [ ] Implement prerequisite checking
  - [ ] Query lessons table for prerequisites array
  - [ ] Check if all prerequisites are in "completed" status
  - [ ] Block lesson start if not met
- [ ] Implement calendar-based unlocking
  - [ ] Check days_since_account_creation vs calendar_unlock_day
  - [ ] Only unlock if sufficient time has passed
- [ ] Implement vocabulary-based unlocking
  - [ ] Some lessons require minimum vocabulary mastery
  - [ ] Query user_vocabulary_progress for "review" + "mastered" count

### Lesson Recommendation
- [ ] Get next available lessons for user
- [ ] Return 2-3 recommended options (ordered by curriculum phase)
- [ ] Display on dashboard

### Testing
- [ ] Create test users with different progress levels
- [ ] Verify prerequisites block lessons correctly
- [ ] Verify calendar unlocking works
- [ ] Verify vocabulary thresholds work

**Deliverable:** Robust curriculum sequencing, tested
**Time:** ~35 hours

---

## WEEK 10: Content Creation & Seed Data

### Vocabulary Content
- [ ] Source top 500 Spanish words from frequency list (RAE, SUBTLEX-ES)
- [ ] Create vocabulary entries (at least 500)
  - [ ] Spanish + English translations
  - [ ] Part of speech
  - [ ] Frequency rank
  - [ ] Example sentences
  - [ ] IPA pronunciation (or use TTS)
  - [ ] Audio files (S3 URLs)
  - [ ] Difficulty factor (default 2.5)
- [ ] Script to validate vocabulary JSON format
- [ ] Bulk insert into database

### Lesson Content (Foundation Phase, Week 1-4)
- [ ] Create 50 phonetic lesson segments
  - [ ] Minimal pairs (e.g., /r/ vs /rr/)
  - [ ] Isolated phonemes with context
  - [ ] 5-10 seconds each
  - [ ] Record or source from Common Voice
- [ ] Create 40 short listening lessons (foundation + core phase)
  - [ ] Themes: daily life, family, food, travel
  - [ ] 1-3 minutes each
  - [ ] Use high-frequency vocabulary
  - [ ] Include comprehension questions (2-3 per lesson)
  - [ ] Audio files sourced/recorded
- [ ] Create lesson JSON files with metadata, segments, vocabulary, questions

### Story Content
- [ ] Write/adapt 10-15 short stories (foundation + early core phase)
  - [ ] Level 1: 50-200 words, present tense, 20-30 unique words
  - [ ] Level 2: 200-300 words, past + present, 50-80 unique words
  - [ ] Themes: daily routines, family, travel, food
- [ ] Record audio narration (or use TTS as fallback)
- [ ] Create story JSON with blocks + vocabulary + comprehension

### Database Seeding
- [ ] Create seed script (`scripts/seed-database.ts`)
  - [ ] Load vocabulary JSON
  - [ ] Load lesson JSON
  - [ ] Load story JSON
  - [ ] Insert into PostgreSQL
- [ ] Run seed script against staging database
- [ ] Verify content displays correctly in frontend

### S3 Upload
- [ ] Upload all audio files to S3/Minio
  - [ ] Lesson audio
  - [ ] Vocabulary pronunciation
  - [ ] Story narration
- [ ] Verify URLs are accessible
- [ ] Test playback in browser

**Deliverable:** 500+ vocabulary entries + 40+ lessons + 10+ stories seeded
**Time:** ~60 hours (most time spent recording/sourcing audio)

---

## WEEK 11: End-to-End Testing & Performance

### User Journey Testing
- [ ] Test complete flow:
  1. Register → Login
  2. Onboarding (goal, level assessment, preferences)
  3. First lesson (listening comprehension)
  4. Comprehension questions
  5. Vocabulary extraction
  6. Vocabulary review (5-10 cards)
  7. Progress dashboard
- [ ] Verify all data persists correctly
- [ ] Verify SR state updates after each review
- [ ] Verify next lesson unlocks after first completion

### Performance Testing
- [ ] Load test: 100+ concurrent users
  - [ ] Review submission latency < 100ms
  - [ ] Lesson load time < 2 seconds
  - [ ] Audio playback smooth (no buffering)
- [ ] Database query optimization
  - [ ] Identify slow queries with EXPLAIN ANALYZE
  - [ ] Add indexes (on created_at, user_id, vocabulary_id)
  - [ ] Test N+1 query prevention
- [ ] Redis cache hit rate (target > 95% for reviews)
  - [ ] Monitor cache misses
  - [ ] Adjust TTL if needed

### Audio Quality
- [ ] Verify audio files
  - [ ] All MP3s: 44.1kHz, 128kbps (quality vs. size tradeoff)
  - [ ] Normalize loudness (LUFS -16)
  - [ ] No artifacts, clipping
- [ ] Test playback across browsers & devices
  - [ ] Chrome, Firefox, Safari
  - [ ] iOS Safari, Android Chrome
  - [ ] Mobile network (3G/4G)

### UI/UX Polish
- [ ] Mobile responsiveness
  - [ ] Test on iPhone, Android phones
  - [ ] Verify touch interactions (tap, swipe)
  - [ ] Ensure text readable on small screens
- [ ] Accessibility
  - [ ] Keyboard navigation (Tab through lesson, review cards)
  - [ ] Screen reader support (basic)
  - [ ] Color contrast (WCAG AA)
- [ ] Error handling
  - [ ] Network error (show retry)
  - [ ] Audio not found (show message)
  - [ ] SR calculation error (log to Sentry)

### API Documentation
- [ ] Update API_SPECIFICATION.md with real response examples
- [ ] Generate API docs (e.g., with Swagger)
- [ ] Test all endpoints with Postman/Insomnia

**Deliverable:** Full system tested end-to-end, performance validated
**Time:** ~45 hours

---

## WEEK 12: Monitoring & DevOps Setup

### Monitoring & Observability
- [ ] Set up Prometheus scraping
  - [ ] Configure `/metrics` endpoint in Express.js
  - [ ] Track: response time, error rate, cache hit rate, active users
- [ ] Set up Grafana dashboards
  - [ ] API latency over time
  - [ ] SR cache hit rate
  - [ ] Audio playback latency
  - [ ] User acquisition (new registrations)
- [ ] Set up Sentry error tracking
  - [ ] Configure in backend + frontend
  - [ ] Alert on errors in SR calculations
- [ ] Set up logging (ELK or Loki)
  - [ ] Centralize logs from backend
  - [ ] Searchable logs by user/lesson/vocabulary

### Docker & Deployment
- [ ] Create production Dockerfile
  - [ ] Multi-stage build (optimize image size)
  - [ ] Non-root user
  - [ ] Health checks
- [ ] Create production docker-compose.yml
  - [ ] PostgreSQL, Redis, Minio, backend, frontend, Nginx
- [ ] Create Nginx config
  - [ ] Reverse proxy to Express.js
  - [ ] Static assets from Next.js
  - [ ] Gzip compression
  - [ ] Security headers
- [ ] Test local stack with docker-compose
  - [ ] All services start correctly
  - [ ] Network connectivity works
  - [ ] Volumes persist

### CI/CD Pipelines (GitHub Actions)
- [ ] Backend CI
  - [ ] Lint (ESLint) + format (Prettier)
  - [ ] Type check (TypeScript)
  - [ ] Unit tests + integration tests
  - [ ] Build Docker image
  - [ ] (Optionally) push to Docker Hub
- [ ] Frontend CI
  - [ ] Lint + format
  - [ ] Type check
  - [ ] Unit tests
  - [ ] Build Next.js
- [ ] Deploy workflow (manual trigger for now)
  - [ ] Run tests
  - [ ] Build images
  - [ ] Push to staging
  - [ ] Run smoke tests

### Secrets Management
- [ ] Store secrets in GitHub Secrets (not in code)
  - [ ] JWT_SECRET
  - [ ] DATABASE_URL
  - [ ] AWS credentials
- [ ] .env.example files without secrets

**Deliverable:** Production-ready infrastructure, monitoring setup
**Time:** ~40 hours

---

## WEEK 13: Beta Testing & Feedback

### Beta Recruitment
- [ ] Recruit 10-20 beta testers
  - [ ] Language learning enthusiasts
  - [ ] Mix of absolute beginners and intermediate learners
  - [ ] Feedback from various devices (mobile, tablet, desktop)
- [ ] Create feedback form (Google Form or simple survey)
  - [ ] Questions: clarity, engagement, audio quality, suggestions

### Beta Testing Plan
- [ ] Day 1-3: Onboarding & first lesson
  - [ ] Verify completion rates > 90%
  - [ ] Collect feedback on level assessment accuracy
- [ ] Day 4-7: Full week of learning
  - [ ] Track daily active users
  - [ ] Monitor for bugs/crashes
  - [ ] Collect feedback on vocabulary review
- [ ] Day 8-14: Extended usage
  - [ ] Verify vocabulary progress (target: 50+ words recognized)
  - [ ] Check if learners are returning daily
  - [ ] Gather feedback on curriculum pacing

### Bug Fixes & Iteration
- [ ] Monitor Sentry for errors
- [ ] Fix critical bugs immediately
- [ ] Collect feature requests (for post-MVP)
- [ ] Iterate on UI based on feedback (small, non-breaking changes)

### Analytics
- [ ] Track key metrics
  - [ ] Onboarding completion rate
  - [ ] Lesson completion rate
  - [ ] Daily active users
  - [ ] Average session duration
  - [ ] Vocabulary review accuracy
  - [ ] SR calculation correctness (verify ease factors trending)
- [ ] Export data for analysis

**Deliverable:** Beta testing complete, feedback incorporated
**Time:** ~30 hours (mostly monitoring, less coding)

---

## WEEK 14: Polish & Launch Preparation

### Final QA & Edge Cases
- [ ] Test edge cases
  - [ ] User with 0 reviews (nothing to show on practice page)
  - [ ] User completing lesson before audio finishes loading
  - [ ] Switching between lessons rapidly
  - [ ] Offline (no internet, verify graceful degradation)
- [ ] Test all error states
  - [ ] 404 (lesson not found)
  - [ ] 401 (token expired)
  - [ ] 500 (server error)
  - [ ] Network timeout
- [ ] Verify all success paths
  - [ ] Complete onboarding → lesson unlocks
  - [ ] Complete lesson → vocabulary added to SR
  - [ ] Complete review → next vocabulary appears
  - [ ] Complete story → vocabulary extracted

### Documentation
- [ ] Finalize README.md
  - [ ] Quick start guide
  - [ ] Tech stack overview
  - [ ] Development setup instructions
- [ ] Finalize ARCHITECTURE.md (already done in Week 0)
- [ ] Create user guide / FAQ
  - [ ] How to navigate app
  - [ ] What each screen does
  - [ ] Troubleshooting common issues
- [ ] Create developer guide
  - [ ] How to add a lesson
  - [ ] How to create story content
  - [ ] How to extend SR algorithm

### Deployment Preparation
- [ ] Staging environment
  - [ ] Deploy backend to staging
  - [ ] Deploy frontend to staging
  - [ ] Run full beta test suite in staging
  - [ ] Verify all metrics in staging
- [ ] Production environment
  - [ ] DNS configured
  - [ ] SSL certificates
  - [ ] Database backups configured
  - [ ] Monitoring alerts configured
- [ ] Runbook for common issues
  - [ ] Database connection failed
  - [ ] Redis unavailable
  - [ ] S3 upload failures
  - [ ] High error rate on SR calculations

### Soft Launch
- [ ] Deploy to production
- [ ] Monitor closely first 24 hours
  - [ ] Sentry errors
  - [ ] API latency
  - [ ] User feedback
- [ ] Announce to beta testers
- [ ] Gather final feedback

### Post-Launch Hotfixes
- [ ] Patch any critical bugs found
- [ ] Optimize based on production data
- [ ] Plan MVP+1 features (conversation, real media)

**Deliverable:** MVP launched, monitoring active, ready for post-launch iteration
**Time:** ~35 hours

---

## Post-MVP (Weeks 15-26)

### MVP+1: Conversation & Speaking (Weeks 15-18)
- [ ] Integrate speech-to-text (Google Cloud Speech API or OpenAI Whisper)
- [ ] Integrate AI conversation partner (fine-tuned LLM or GPT API)
- [ ] Implement pronunciation scoring (pitch/formant analysis)
- [ ] Create `/conversations/start` endpoint
- [ ] Create `/conversations/:id/send-message` endpoint
- [ ] Create conversation UI (chat-like interface)
- [ ] Test end-to-end conversation flow
- [ ] Launch to production

### MVP+2: Real Media Integration (Weeks 19-22)
- [ ] Source real media content (YouTube, podcasts, news)
- [ ] Create real media table in database
- [ ] Create `/real-media` endpoints
- [ ] Implement video player with transcript sync
- [ ] Create real media comprehension questions
- [ ] Create real media listening page
- [ ] Integrate real media into curriculum (month 4+)
- [ ] Test transition from lessons to real media

### MVP+3: Advanced Features (Weeks 23-26)
- [ ] Mobile app (React Native or PWA)
- [ ] Personalized lesson recommendations
- [ ] Content generation (generate lessons per user)
- [ ] Social features (light-touch, no gamification)
- [ ] Multi-language support (extend to French, German)
- [ ] Advanced analytics (error analysis, cohort comparisons)

---

## Development Metrics & Success Criteria

### Code Quality
- Test coverage: > 80%
- Linting: 0 errors
- Type safety: 0 TypeScript errors
- Performance: API p95 < 100ms, frontend Lighthouse > 90

### Learning Effectiveness
- Week 1: 90%+ onboarding completion
- Week 4: 80%+ learners reach foundation phase goal (100+ words recognized)
- Week 4: Average ease factor trending toward 2.0+ (SR algorithm working)
- Week 8: 70%+ learners still active (daily logins)

### User Experience
- Onboarding: < 10 min start-to-first-lesson
- Lesson playback: smooth (no buffering, < 50ms latency)
- Vocabulary review: 20 cards in < 15 minutes
- Mobile: fully responsive, touch-friendly

### Operations
- Uptime: 99.5%+
- Error rate: < 0.5%
- Database: all queries < 100ms
- S3: 99.9% audio availability

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Audio quality issues | Record multiple speakers, normalize all audio, test on real devices |
| SR algorithm bugs | Extensive unit testing, audit trail (review_history), manual verification |
| Performance (N+1 queries) | Use database profiling early (EXPLAIN ANALYZE), add indexes proactively |
| Content gaps | Pre-create all core content before launch, don't launch with placeholders |
| User retention | Focus on core loop (input → recall → progress), no gamification pressure |
| Mobile issues | Test early and often on real devices, use responsive design patterns |
| Database corruption | ACID transactions on all SR updates, daily backups, tested restore procedure |

---

## Rollback Plan

If critical issue found post-launch:
1. **Immediate:** Disable affected feature (e.g., vocabulary review)
2. **Rollback:** Deploy previous working version from git tag
3. **Fix:** Create hotfix branch, test thoroughly
4. **Redeploy:** Push hotfix to production
5. **Post-mortem:** Review root cause, improve testing

---

See also:
- `ARCHITECTURE.md` - Overall system design
- `PROJECT_STRUCTURE.md` - Directory organization
- `API_SPECIFICATION.md` - API endpoint details
- `DATABASE_SCHEMA.sql` - Schema DDL
