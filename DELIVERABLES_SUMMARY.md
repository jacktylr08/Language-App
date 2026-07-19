# Deliverables Summary - Spanish Learning App Architecture

**Created:** July 19, 2026  
**Status:** Complete, ready for implementation  
**Scope:** Full 12-14 week MVP plan + post-MVP roadmap

---

## What's Been Delivered

### 1. **ARCHITECTURE.md** (15 sections, ~6000 words)
The **main design document**. Everything a developer or product manager needs to understand the system.

**Contains:**
- Executive summary (vision, principles)
- Tech stack with rationale (React/Next.js, Node.js/Express, PostgreSQL, Redis, S3)
- Complete data model (13 entities: users, lessons, vocabulary, vocabulary progress, lesson progress, conversation sessions, real media, etc.)
- Core modules design:
  - Spaced Repetition Engine (SM-2 algorithm, Redis caching, state machine)
  - Curriculum Engine (sequencing, prerequisites, unlocking logic)
  - Content Model (lesson structure, vocabulary, stories, real media)
  - Analytics (acquisition metrics, no gamification)
- API architecture (15+ endpoint categories)
- Frontend architecture (key screens, flows, component structure)
- Curriculum sequencing (4 phases over 4+ months)
- Content strategy (vocabulary sourcing, audio, stories, real media)
- MVP scope (what's in, what's deferred to MVP+1/+2/+3)
- 12-14 week implementation roadmap
- Design decisions & tradeoffs
- Success criteria

**Read this first.** Sets the context for everything else.

---

### 2. **DATABASE_SCHEMA.sql** (~800 lines)
**Ready-to-execute PostgreSQL schema**. Every table needed for MVP.

**Includes:**
- `users` (profiles, preferences, current level)
- `lessons` (curriculum content, prerequisites, calendar unlocking)
- `vocabulary` (Spanish words, definitions, audio, frequency rank, difficulty)
- `user_vocabulary_progress` (spaced repetition state: interval, ease factor, next review, acquisition state)
- `lesson_progress` (user's journey through lessons: status, completion %, scores)
- `review_queue` (daily scheduling cache for sub-100ms lookups)
- `vocabulary_review_history` (audit trail of all reviews for debugging)
- `conversation_sessions` (post-MVP, but schema ready)
- `real_media_content` (post-MVP, scaffolded authentic input)
- `conversation_partners` (AI partner profiles)
- `lesson_segments` (detailed lesson structure: timing, text, vocabulary tagged)
- `comprehension_questions` (MC and open-ended questions)
- `stories` & `story_blocks` (reading content segmented for interaction)
- `user_acquisition_metrics` (denormalized metrics table for analytics queries)

**Features:**
- ACID transactions (critical for SR state)
- Proper indexes (for < 100ms lookups on due-today reviews)
- Foreign keys (referential integrity)
- JSONB columns (flexible preferences, vocabulary conjugations)
- Triggers (auto-update timestamps)
- UUID primary keys
- Complete comments explaining each table

**Usage:** `psql language_app < DATABASE_SCHEMA.sql`

---

### 3. **PROJECT_STRUCTURE.md** (~1200 lines)
**Complete directory layout + development setup guide**.

**Covers:**
- Full directory tree (backend, frontend, content, infra, docs, scripts)
- Backend structure: routes, controllers, services, middleware, models, jobs, utils, types
- Frontend structure: app layout (Next.js 14), components, hooks, lib, public, styles
- Content management: vocabulary JSON formats, lesson JSON formats, story JSON formats
- Infrastructure: Docker, Kubernetes, Nginx, monitoring
- Development setup (Docker Compose, local services, migrations, seeding)
- Testing strategy (unit, integration, E2E with Playwright)
- Database migrations, CI/CD with GitHub Actions
- Performance & monitoring (Prometheus, Grafana, Sentry)
- Troubleshooting common issues
- Next steps / roadmap

**Includes:**
- File paths for all key components
- Environment variable templates
- Command reference (npm scripts, docker commands)
- Testing commands
- Deployment procedures

---

### 4. **API_SPECIFICATION.md** (~1500 lines)
**Complete REST API documentation** (40+ endpoints).

**Sections:**
- **Auth** (5 endpoints): register, login, refresh, logout, me
- **Users** (2 endpoints): profile, preferences
- **Lessons** (6 endpoints): list, detail, audio, start, complete, comprehension
- **Vocabulary** (3 endpoints): search, detail, audio, related words
- **Reviews** (4 endpoints): due-today, queue, submit review, analytics
- **Stories** (3 endpoints): list, detail, read, comprehension
- **Progress** (3 endpoints): lessons, vocabulary, timeline, export
- **Conversation** (4 endpoints, post-MVP): start, send message, end, feedback
- **Real Media** (4 endpoints, post-MVP): list, detail, transcript, comprehension

**Every endpoint includes:**
- Request JSON schema
- Response JSON schema (with example data)
- Query parameters & filters
- Possible error codes
- Side effects (what happens in DB/cache)
- Rate limiting info

**Also covers:**
- Authentication (JWT)
- Error handling (standard error format)
- Pagination (offset + cursor-based)
- Filtering & sorting syntax
- Rate limiting (1000 req/hr per user)

---

### 5. **IMPLEMENTATION_CHECKLIST.md** (~1500 lines)
**Detailed 14-week sprint plan** with deliverables & time estimates.

**Week-by-week breakdown:**

| Week | Focus | Hours | Deliverable |
|------|-------|-------|------------|
| 1 | Backend foundation | 40h | DB schema, Redis, S3, project setup |
| 2 | Auth + lesson APIs | 50h | 12 endpoints working, tested |
| 3 | Spaced repetition engine | 60h | SM-2 algorithm, Redis cache, SR endpoints |
| 4 | Lesson + vocab acquisition | 50h | Full lesson→vocab→SR flow |
| 5 | Frontend foundation | 45h | Auth UI, onboarding, layouts |
| 6 | Audio player + lesson UI | 50h | Lesson player, comprehension Q, vocab extraction |
| 7 | Vocabulary review UI | 45h | Card stack, daily review flow |
| 8 | Story reading + integration | 40h | Story reading, vocabulary extraction |
| 9 | Curriculum sequencing | 35h | Prerequisite checking, unlocking logic |
| 10 | Content creation | 60h | 500 vocab + 40 lessons + 10 stories seeded |
| 11 | E2E testing + performance | 45h | Full journey tested, optimized |
| 12 | Monitoring + DevOps | 40h | Prometheus, Grafana, Sentry, CI/CD |
| 13 | Beta testing + iteration | 30h | 10-20 testers, feedback incorporated |
| 14 | Polish + launch prep | 35h | Final QA, docs, deployment |

**Each week includes:**
- Detailed checklist of tasks
- Success criteria
- Testing approach
- Estimated hours (40-60h/week = reasonable sprint)

**Also includes:**
- Post-MVP roadmap (MVP+1: conversation, MVP+2: real media, MVP+3: advanced)
- Risk mitigation strategies
- Development metrics & KPIs
- Rollback procedures
- Common edge cases to test

---

### 6. **README.md** (~600 lines)
**Quick navigation guide** for all documentation.

**Provides:**
- Overview of the project (philosophy, core concepts)
- Navigation to all other docs (which one to read first, then second, etc.)
- Quick start (5 steps to get dev environment running)
- Tech stack summary
- Success criteria for MVP launch
- MVP scope (what's in, what's deferred)
- Common questions answered
- Next steps

---

## How to Use These Documents

### If You're Starting From Scratch
1. **Read README.md** (10 min) - Understand the vision
2. **Read ARCHITECTURE.md** (45 min) - Grasp the full design
3. **Skim DATABASE_SCHEMA.sql** (5 min) - See the data model visually
4. **Skim API_SPECIFICATION.md** (5 min) - Understand endpoints
5. **Read PROJECT_STRUCTURE.md** (20 min) - Know where files go
6. **Print IMPLEMENTATION_CHECKLIST.md** - Your roadmap for weeks 1-14

### If You're Joining Week 3 (Spaced Repetition)
1. **Read ARCHITECTURE.md** Section 3 (Spaced Repetition Engine) (15 min)
2. **Review DATABASE_SCHEMA.sql** tables 5-7 (SR tables) (5 min)
3. **Review API_SPECIFICATION.md** (Review endpoints) (10 min)
4. **Read IMPLEMENTATION_CHECKLIST.md** Week 3 (30 min)

### If You're Writing a Frontend Component
1. **Read ARCHITECTURE.md** Section 5 (Frontend Architecture)
2. **Review PROJECT_STRUCTURE.md** (frontend directory)
3. **Check API_SPECIFICATION.md** for endpoint details
4. **Build component following Tailwind + shadcn/ui patterns

### If You're Building an API Endpoint
1. **Find endpoint in API_SPECIFICATION.md** (copy JSON schema)
2. **Check DATABASE_SCHEMA.md** for relevant tables
3. **Implement in backend/src/routes/**
4. **Write unit + integration tests**
5. **Test with Postman/Insomnia**

---

## Key Facts at a Glance

### Timeline
- **MVP Launch:** 12-14 weeks
- **Per Week:** 40-60 hours (reasonable sprint pace)
- **Team Size:** 2-3 developers (1-2 backend, 1-2 frontend, 1 content creator)
- **Post-MVP:** 3-4 more iterations (conversation, real media, mobile, advanced)

### Technology Choices
- **Frontend:** React 18 + Next.js 14 (SSR, API routes)
- **Backend:** Node.js + Express.js (TypeScript)
- **Database:** PostgreSQL (ACID for SR state)
- **Cache:** Redis (sub-100ms lookups)
- **Audio:** Howler.js (frontend), S3 (storage)
- **Hosting:** Docker + Kubernetes (or Docker Compose for small scale)
- **Monitoring:** Prometheus, Grafana, Sentry

### Core Algorithms
- **Spaced Repetition:** SM-2 (Supermemo-2, proven)
- **State Machine:** new → learning → review → mastered
- **Intervals:** 1d → 3d → 7d → 14d → 30d → 60d
- **Target:** 20+ passive encounters before first active review

### Success Metrics (Not Engagement)
- Words recognized in listening (not "app opens")
- Words mastered via SR (not "daily streak")
- Listening hours accumulated (not "session duration")
- Lessons completed (not "points earned")
- Ability to understand Spanish (the goal!)

### Content Scope (MVP)
- 500 vocabulary entries (high-frequency Spanish)
- 40 listening lessons (1-3 min each)
- 10 short stories (2-5 min reading)
- 50 phonetic segments (foundation phase)
- 15+ hours total content

### Learning Progression
- **Month 1:** Phonetics + 100-150 words + listening comprehension
- **Month 2:** 300+ words + reading + blocked vocabulary practice
- **Month 3:** Conversation introduction (AI partner), 500+ words
- **Month 4+:** Real media (podcasts, YouTube) + advanced conversation

---

## What's NOT Included (By Design)

### MVP (Weeks 1-14)
- ❌ Conversation/speaking (requires speech-to-text + AI partner)
- ❌ Real media (requires massive content sourcing)
- ❌ Pronunciation scoring (complex audio analysis)
- ❌ Mobile app (React Native, separate codebase)
- ❌ Social features (intentional - no gamification)
- ❌ Multiplayer/group learning (deferred)

### Post-MVP (Deferred)
- MVP+1 (Weeks 15-18): Conversation + AI partner
- MVP+2 (Weeks 19-22): Real media integration
- MVP+3 (Weeks 23-26): Mobile app, personalization, multi-language

---

## File Locations

All files are in the repository root:

```
Language-App/
├── README.md                    ← Start here
├── ARCHITECTURE.md              ← Main design doc
├── DATABASE_SCHEMA.sql          ← PostgreSQL schema
├── PROJECT_STRUCTURE.md         ← Directory layout + setup
├── API_SPECIFICATION.md         ← REST API endpoints
├── IMPLEMENTATION_CHECKLIST.md  ← Week-by-week tasks
├── DELIVERABLES_SUMMARY.md      ← This file
└── .git/
```

---

## Next Actions

### For Product Managers / Stakeholders
1. Read **README.md** (10 min)
2. Read **ARCHITECTURE.md** Sections 1-2 & 8 (30 min)
3. Read **IMPLEMENTATION_CHECKLIST.md** (all 14 weeks) (45 min)
4. **Total: ~90 min** - Full understanding of timeline, scope, approach

### For Backend Developers
1. Read **ARCHITECTURE.md** Sections 2-4 (30 min)
2. Study **DATABASE_SCHEMA.sql** (20 min)
3. Review **API_SPECIFICATION.md** (20 min)
4. Follow **IMPLEMENTATION_CHECKLIST.md** Week 1 (40 hours)

### For Frontend Developers
1. Read **ARCHITECTURE.md** Sections 5-6 (20 min)
2. Review **PROJECT_STRUCTURE.md** (frontend section) (15 min)
3. Study **API_SPECIFICATION.md** (20 min)
4. Follow **IMPLEMENTATION_CHECKLIST.md** Week 5 (40 hours)

### For Content Creators / Linguists
1. Read **ARCHITECTURE.md** Sections 6-7 (20 min)
2. Review **PROJECT_STRUCTURE.md** (content section) (10 min)
3. Follow **IMPLEMENTATION_CHECKLIST.md** Week 10 (60 hours)

### For DevOps / SRE
1. Read **PROJECT_STRUCTURE.md** (infra section) (20 min)
2. Review **IMPLEMENTATION_CHECKLIST.md** Week 12 (40 hours)

---

## Quality Assurance Checklist

Use this to verify completeness of delivered architecture:

- ✅ Clear product philosophy (input-first, no gamification)
- ✅ Complete data model (13 entities, relationships defined)
- ✅ Spaced repetition algorithm documented (SM-2, state machine)
- ✅ Curriculum sequencing logic explained (4 phases, prerequisites)
- ✅ API design documented (40+ endpoints with examples)
- ✅ Frontend architecture designed (key screens, flows)
- ✅ Database schema executable (ready to `psql < ...`)
- ✅ Project structure defined (all directories, key files)
- ✅ Development setup documented (Docker, local environment)
- ✅ Implementation roadmap detailed (14 weeks, per-week tasks)
- ✅ Success criteria defined (measurable MVP launch goals)
- ✅ Risk mitigation strategies included
- ✅ Post-MVP roadmap sketched (conversation, real media, mobile)
- ✅ Technology choices justified (not just "we like this tool")
- ✅ Tradeoffs explained (why we chose A over B)

**Status:** All items complete ✅

---

## Contact & Support

**Questions about:**
- **Architecture/Design:** See ARCHITECTURE.md sections 1-12
- **API endpoints:** See API_SPECIFICATION.md
- **Database:** See DATABASE_SCHEMA.sql + ARCHITECTURE.md Section 2
- **Implementation:** See IMPLEMENTATION_CHECKLIST.md
- **Project setup:** See PROJECT_STRUCTURE.md
- **Quick answers:** See README.md FAQ section

---

## Final Notes

This architecture represents **best practices for language learning apps** based on:
- Second Language Acquisition research (Krashen, Hulstijn, Ebbinghaus)
- Spaced repetition evidence (Anki, Supermemo)
- Learning science (Interleaving, deliberate practice)
- Pragmatic engineering (proven tech stack, testable design)

The plan is **aggressive but achievable**:
- 14 weeks to MVP (core loop: input → recall → progress)
- 26 weeks to advanced features (conversation, real media, mobile)
- Designed for iteration (each week builds on prior weeks)
- Risk mitigation (beta testing, monitoring, rollback procedures)

**The goal is not to build Duolingo 2.0.** The goal is to build a tool that:
1. Helps learners acquire Spanish deeply (20+ encounters per word)
2. Transitions to authentic input (real Spanish, month 4)
3. Becomes replaceable (learner no longer needs app, speaks Spanish)

Good luck!

---

**Prepared by:** Architecture & Design Phase  
**Date:** July 19, 2026  
**Status:** Ready for implementation sprint  
**Next Milestone:** Week 1 Backend Foundation
