# Spanish Learning App - Complete Architecture & Implementation Plan

## Overview

This repository contains a **complete architecture and implementation plan** for a scientifically-grounded Spanish language learning app designed around evidence-based language acquisition principles.

**Key Philosophy:**
- Input-first approach (listening → reading → speaking)
- Authentic, natural-speed audio from day one
- Spaced repetition with 20+ target encounters per word
- Implicit grammar (no drills, pure input-based learning)
- Early conversation practice (month 3)
- Real media transition by month 4
- **No gamification** (streaks, points, badges) — goal is to make the app replaceable

---

## Documentation Structure

### For Architecture & Design Decisions
**→ Start here:** [`ARCHITECTURE.md`](./ARCHITECTURE.md)

Comprehensive 15-section design document covering:
1. **Tech Stack** - Frontend, backend, database, infrastructure choices with rationale
2. **Data Model** - Complete entity definitions (users, lessons, vocabulary, spaced repetition state, progress)
3. **Core Modules** - Detailed design of:
   - Spaced Repetition Engine (SM-2 algorithm, Redis caching)
   - Curriculum Engine (lesson sequencing, prerequisites, unlocking logic)
   - Content Model (lesson structure, vocabulary, stories, real media)
   - Analytics (acquisition metrics, no engagement tracking)
4. **API Design** - 15+ endpoint categories with request/response examples
5. **Frontend Architecture** - Key screens, component structure, flows
6. **Curriculum Sequencing** - Month-by-month progression (phonetics → vocabulary → conversation → real media)
7. **Content Strategy** - Vocabulary sourcing, audio, stories, real media
8. **MVP Scope** - What's included (core loop) vs. post-MVP
9. **Implementation Roadmap** - 12-14 week timeline
10. **Tech Stack Summary** - Quick reference table
11. **Architecture Diagrams** - User flows, system architecture, SR state machine
12. **Design Decisions & Tradeoffs** - Why we chose what we did
13. **Success Criteria** - Measurable launch goals

**Read time:** 30-45 minutes

---

### For Database Schema
**→ Next:** [`DATABASE_SCHEMA.sql`](./DATABASE_SCHEMA.sql)

Complete PostgreSQL schema (15+ tables) with:
- All entity definitions from ARCHITECTURE.md
- Proper indexes for performance (< 100ms lookups)
- ACID transaction support for spaced repetition state
- Denormalized metrics table for analytics queries
- Foreign keys and referential integrity
- PostgreSQL-specific features (JSONB preferences, UUID PKs, triggers)

**Ready to execute:** `psql < DATABASE_SCHEMA.sql`

---

### For Project Structure & Setup
**→ Then:** [`PROJECT_STRUCTURE.md`](./PROJECT_STRUCTURE.md)

Directory layout and development environment setup:
- Complete directory tree (backend, frontend, content, infra)
- Local development setup (Docker Compose, migration, seeding)
- Entry points and key files for each component
- Content management (JSON formats for lessons, vocabulary, stories)
- Testing strategy (unit, integration, E2E)
- Deployment procedures
- Performance & monitoring setup
- Troubleshooting guide

**Covers:** Backend, frontend, content management, DevOps, testing

---

### For API Endpoints
**→ Reference:** [`API_SPECIFICATION.md`](./API_SPECIFICATION.md)

Complete REST API specification (40+ endpoints):
- **Auth** (register, login, refresh, logout, me)
- **Lessons & Content** (list, detail, audio, start, complete, comprehension)
- **Vocabulary** (search, detail, audio, related words)
- **Spaced Repetition** (due-today, queue, submit review, analytics)
- **Stories** (list, detail, read, comprehension)
- **Progress & Analytics** (lessons, vocabulary, timeline, export)
- **Conversation** (post-MVP, start, send message, feedback)
- **Real Media** (post-MVP, list, detail, transcript, comprehension)

Every endpoint includes:
- Request/response JSON examples
- Query parameters & filters
- Error handling
- Side effects & async jobs

---

### For Week-by-Week Implementation
**→ Management:** [`IMPLEMENTATION_CHECKLIST.md`](./IMPLEMENTATION_CHECKLIST.md)

Detailed 14-week sprint plan with:
- **Week 1:** Backend foundation (DB, Redis, S3)
- **Week 2:** Authentication & basic APIs
- **Week 3:** Spaced Repetition Engine (SM-2, Redis cache)
- **Week 4:** Lesson progress & vocabulary acquisition
- **Week 5:** Frontend foundation (Next.js, auth UI, onboarding)
- **Week 6:** Audio player & lesson UI
- **Week 7:** Vocabulary review card stack
- **Week 8:** Story reading & integration
- **Week 9:** Curriculum sequencing & unlocking
- **Week 10:** Content creation & seed data
- **Week 11:** End-to-end testing & performance
- **Week 12:** Monitoring & DevOps setup
- **Week 13:** Beta testing & feedback
- **Week 14:** Polish & launch preparation

Each week includes:
- Specific tasks with checkboxes
- Deliverables
- Estimated time (40-60 hours/week)
- Success criteria

**Also includes:**
- Post-MVP roadmap (MVP+1, MVP+2, MVP+3)
- Risk mitigation strategies
- Development metrics & success criteria
- Rollback procedures

---

## Quick Start

### 1. Review Architecture (30 min)
```bash
# Read the main design document
cat ARCHITECTURE.md
```

### 2. Set Up Database (10 min)
```bash
# Create PostgreSQL database
createdb language_app
psql language_app < DATABASE_SCHEMA.sql
```

### 3. Set Up Backend (15 min)
```bash
cd backend
npm install
npm run db:migrate
npm run db:seed
npm run dev  # http://localhost:3001
```

### 4. Set Up Frontend (15 min)
```bash
cd frontend
npm install
npm run dev  # http://localhost:3000
```

### 5. Start Development
Follow [`IMPLEMENTATION_CHECKLIST.md`](./IMPLEMENTATION_CHECKLIST.md) **Week 1**, starting with backend infrastructure.

---

## Core Concepts

### Spaced Repetition Engine
- **Algorithm:** SM-2 (Supermemo-2, proven, customizable)
- **Intervals:** 1 day → 3 days → 7 days → 14 days → 30 days → 60 days
- **Target:** 20+ passive encounters before first active review
- **Reset:** 3+ consecutive failures reset to learning
- **State:** new → learning → review → mastered

### Curriculum Phases
1. **Foundation (Weeks 1-4):** Phonetics + 100-150 words + natural-speed audio
2. **Core Vocabulary (Weeks 5-12):** 300-500 words + listening + reading + blocked practice
3. **Conversation (Month 3+):** AI partner + shadowing + interleaved practice
4. **Real Media (Month 4+):** Podcasts, YouTube, news with scaffolding

### Key Metrics (Learning-Focused)
- Vocabulary recognized (passive)
- Vocabulary mastered (active recall, 20+ reps)
- Listening hours
- Lessons completed
- SR algorithm effectiveness (ease factor trending)

**NOT tracked:**
- Daily streaks
- Points or badges
- Login duration
- Session counts

---

## Tech Stack

| Component | Technology | Why |
|-----------|-----------|-----|
| **Frontend** | React 18 + Next.js 14 | SSR, API routes, TypeScript |
| | Howler.js | Audio playback with speed control |
| | TanStack Query | Server state (vocabulary cache) |
| | Tailwind CSS + shadcn/ui | Accessible, minimal design |
| **Backend** | Node.js 20 + Express.js | Lightweight, TypeScript-first |
| | PostgreSQL 15 | ACID for SR state integrity |
| | Redis 7 | Sub-100ms SR lookups, cache |
| | Bull | Async jobs (daily recalc, emails) |
| **Infrastructure** | Docker | Reproducible dev & prod |
| | GitHub Actions | CI/CD pipelines |
| | AWS S3 / Minio | Audio file storage |
| **Monitoring** | Prometheus + Grafana | Metrics & dashboards |
| | Sentry | Error tracking |
| | ELK / Loki | Centralized logging |

---

## Key Files

| File | Purpose |
|------|---------|
| `ARCHITECTURE.md` | Main design document (15 sections, everything) |
| `DATABASE_SCHEMA.sql` | PostgreSQL schema ready to execute |
| `PROJECT_STRUCTURE.md` | Directory layout, setup, development guide |
| `API_SPECIFICATION.md` | 40+ endpoints with full documentation |
| `IMPLEMENTATION_CHECKLIST.md` | 14-week sprint plan with tasks |
| `README.md` | This file — quick overview |

---

## Success Criteria (MVP Launch)

### User Experience
- Onboarding completion: > 90%
- Week 1 completion: > 80%
- Week 4 completion: > 60%
- Daily active users: > 70% (repeating usage)

### Learning Outcomes
- Week 4: Learner recognizes 100+ words in listening
- Week 4: 50+ words in spaced repetition cycle
- Month 2: 300+ recognized words
- Month 3: Conversational confidence A1-A1+
- Month 4: Can watch Spanish media with comprehension

### Technical Performance
- API latency: < 100ms (p95)
- SR cache hit rate: > 95%
- Audio playback: smooth, no buffering
- Uptime: 99.5%+

### Quality
- Test coverage: > 80%
- Zero TypeScript errors
- Zero critical bugs in SR calculations
- Lighthouse scores: > 90

---

## MVP Scope (Weeks 1-14)

### Included (Core Loop)
- ✅ Backend: PostgreSQL, Redis, Express.js APIs
- ✅ Spaced Repetition Engine (SM-2, Redis cache)
- ✅ Curriculum Engine (prerequisites, unlocking, pacing)
- ✅ Frontend: React, audio player, lesson UI, vocabulary review
- ✅ Listening Comprehension (foundation phase)
- ✅ Story Reading
- ✅ Vocabulary Spaced Repetition
- ✅ Progress Dashboard (learning metrics)
- ✅ 500+ vocabulary entries + 40+ lessons + 10+ stories
- ✅ Authentication & onboarding flow

### Excluded (Post-MVP)
- ❌ Conversation Practice (MVP+1, weeks 15-18)
- ❌ Speech-to-Text (requires third-party API)
- ❌ Real Media Integration (MVP+2, weeks 19-22)
- ❌ Mobile App (MVP+3)
- ❌ Pronunciation Scoring (requires complex audio analysis)
- ❌ Social Features (intentionally excluded per philosophy)

---

## Development Workflow

### Before Starting
1. Read `ARCHITECTURE.md` (understand the big picture)
2. Review `DATABASE_SCHEMA.sql` (understand data model)
3. Skim `API_SPECIFICATION.md` (know what endpoints you're building)

### During Development
1. Follow `IMPLEMENTATION_CHECKLIST.md` week by week
2. Reference `PROJECT_STRUCTURE.md` for where files go
3. Use `API_SPECIFICATION.md` for endpoint details
4. Update README.md with new features/changes

### Before Launching
1. Complete all items in Week 14 (Polish & Launch)
2. Run full `IMPLEMENTATION_CHECKLIST.md` end-to-end verification
3. Execute beta testing plan
4. Deploy to staging, then production

---

## Common Questions

### Q: Why no gamification?
**A:** Gamification (streaks, points, badges) increases short-term engagement but hurts long-term learning. Users stop when external rewards stop. This app's goal is to replace itself (learner no longer needs it, speaks Spanish naturally).

### Q: Why natural-speed audio from day one?
**A:** Learners must adapt to native speed eventually. Slow/simplified audio creates false comprehension. Real input from day one (with comprehension support) prepares the brain for authentic listening and reduces future shock.

### Q: Why SM-2 (Anki-style) spaced repetition?
**A:** Proven algorithm with decades of validation. Customizable (ease factor, intervals). Simple to implement and debug. Enables 20+ encounter targets with efficiency.

### Q: Why is conversation delayed until month 3?
**A:** Cognitive load. Input (listening/reading) must come first to build comprehension and vocabulary. Adding speaking early overloads learners. Month 3 (500+ word foundation) allows meaningful conversation.

### Q: How long to build the MVP?
**A:** 12-14 weeks with a small team (1-2 backend, 1-2 frontend, 1 content creator). See `IMPLEMENTATION_CHECKLIST.md` for detailed breakdown.

### Q: What's the cost to host?
**A:** Estimated ~$500-1000/month for MVP (single server, small user base). Scales with users. AWS S3 audio storage ~$50/month (depends on number of lessons).

### Q: Can I start with a different tech stack?
**A:** Yes. The architecture principles apply regardless. The tech choices here are pragmatic (proven tools, good community, TypeScript support). See "Tech Stack" section in `ARCHITECTURE.md` for rationale on each choice.

---

## Next Steps

1. **Week 0 (Now):** You are here. Read `ARCHITECTURE.md`, understand the vision.
2. **Week 1:** Start backend setup (follow `IMPLEMENTATION_CHECKLIST.md` Week 1)
3. **Weeks 2-14:** Follow the checklist week-by-week
4. **Ongoing:** Reference `API_SPECIFICATION.md` for endpoint details, `DATABASE_SCHEMA.sql` for data model

---

## Additional Resources

### Learning & Research
- Krashen's Input Hypothesis (comprehensible input)
- Ebbinghaus Forgetting Curve (spaced repetition basis)
- Bozarth (2017): "The New Landscape of Mobile Learning" (mobile-first design)
- Hulstijn (1992): Retention of inferred and given word meanings (20+ encounters target)

### Tools & Services
- **Audio Sourcing:** Mozilla Common Voice (open source), Fiverr/Upwork (voice talent)
- **Media Hosting:** AWS S3, Minio (self-hosted S3-compatible)
- **Transcription:** OpenAI Whisper, Google Cloud Speech-to-Text
- **Monitoring:** Prometheus, Grafana, Sentry (all self-hostable)

### Similar (Non-Competitors)
- Duolingo (gamified, less focus on authentic input)
- Pimsleur (audio-first, expensive, less tech-forward)
- SpanishPod101 (excellent content, less app structure)
- Anki (pure flashcards, no curriculum)

---

## Contributing

This is a design and planning document. Implementation happens in feature branches following `IMPLEMENTATION_CHECKLIST.md`.

**To contribute:**
1. Review your assigned week in the checklist
2. Complete tasks in order (dependencies matter)
3. Test thoroughly (unit + integration + E2E)
4. Submit PR with reference to completed checklist items

---

## License

[Choose appropriate license for your use case]

---

## Contact & Support

For questions about architecture, reach out with:
- Specific section from `ARCHITECTURE.md` you're confused about
- Endpoint reference from `API_SPECIFICATION.md`
- Week/task from `IMPLEMENTATION_CHECKLIST.md`

---

**Last Updated:** July 19, 2026  
**Status:** Ready for implementation  
**Next Phase:** Week 1 Backend Foundation
