# Fluenta — a language app built around a tutor you can talk to

## Overview

Fluenta is a working language-learning app: a Next.js frontend, an
Express/Postgres backend, a 50+ lesson Spanish course, spaced repetition, and
a live voice tutor ("Profe") running on the OpenAI Realtime API.

**The product in one sentence:** a structured course where every lesson feeds
into a real spoken conversation with a tutor who remembers what you found
hard.

**What it actually does today:**
- A sequenced course — phonetics → core vocabulary → grammar → conversation
- **FSRS** spaced repetition (`ts-fsrs`), scheduling reviews per word
- A live voice tutor over WebRTC, level-aware and with persistent memory of
  past sessions and mistakes
- Extensive reading passages, an eyes-free listen-and-repeat mode, and
  pronunciation scoring via Azure
- Guest mode (two lessons before an account is needed), offline support via a
  service worker, and progress synced server-side across devices
- Light habit mechanics: a day streak and a shareable progress card

### A note on the other documents in this repo

`ARCHITECTURE.md`, `PEDAGOGICAL_PLAN.md`, `IMPLEMENTATION_CHECKLIST.md` and
the rest are the **original planning documents**, written before the app was
built. They are kept for the reasoning behind the design, but they are not a
description of what shipped, and the build has deliberately diverged from
them in several places:

| The plan said | What was built | Why |
|---|---|---|
| SM-2 spaced repetition | FSRS (`ts-fsrs`) | Better-fitting scheduler; SM-2's ease-factor model is superseded |
| No gamification; streaks explicitly not tracked | A day streak, best streak, and a shareable card | Reversed on purpose. The "no gamification" position assumed streaks are purely extrinsic. In practice the thing that kills a self-directed course is not returning at all, and a streak is a cheap, honest record of returning. It is never used to punish a missed day and nothing is locked behind it. |
| Conversation delayed to month 3 | The tutor is available from day one | The tutor constrains itself to the learner's known vocabulary, so a beginner gets a beginner's conversation rather than being overloaded. Withholding the single most distinctive part of the app for eight weeks also meant nobody ever saw it. |
| Conversation was post-MVP | Conversation is the core of the product | It's the reason to use this over Duolingo |

Where those documents and this README disagree, this README is right.

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
- **Algorithm:** FSRS via `ts-fsrs` (the plan below called for SM-2; FSRS
  replaced it — see the divergence table at the top)
- **Ratings:** Again / Hard / Good / Easy, chosen from the exercise type and
  the learner's answer rather than a single correct/incorrect bit
- **State:** new → learning → review → relearning, with per-word `stability`
- **Mastery:** FSRS stability ≥ 21 days, or the legacy strength path with a
  minimum of 8 real attempts behind it

### Curriculum Phases
1. **Foundation (Weeks 1-4):** Phonetics + 100-150 words + natural-speed audio
2. **Core Vocabulary (Weeks 5-12):** 300-500 words + listening + reading + blocked practice
3. **Conversation (Month 3+):** AI partner + shadowing + interleaved practice
4. **Real Media (Month 4+):** Podcasts, YouTube, news with scaffolding

### Key Metrics (Learning-Focused)
- Words met, and words learned (FSRS review/relearning state)
- Words mastered (stability ≥ 21 days)
- Lessons completed — kept separate from lessons placed out of at signup, and
  never added together into a single "progress" figure
- Can-do abilities (see `lib/abilities.ts`)
- Day streak

**Deliberately NOT tracked or shown:** points, badges, leagues, leaderboards,
login duration. The streak is the one habit mechanic, it is never used to
punish a missed day, and nothing in the course is locked behind it.

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

### Q: Why a streak, when the plan said no gamification?
**A:** The original position — that streaks, points and badges hurt long-term
learning because users stop when the external reward stops — is right about
points, badges and leagues, and those are all still absent. It was wrong about
streaks specifically. The failure mode of a self-directed course isn't
over-motivation, it's never coming back; a streak is an honest record of
having come back, costs nothing, and is the number learners actually want to
show people. It never punishes a missed day and never gates content. Points,
badges, leagues and leaderboards remain off the table.

### Q: Why natural-speed audio from day one?
**A:** Learners must adapt to native speed eventually. Slow/simplified audio creates false comprehension. Real input from day one (with comprehension support) prepares the brain for authentic listening and reduces future shock.

### Q: Why FSRS rather than SM-2?
**A:** The plan called for SM-2 and the build uses FSRS (`ts-fsrs`). SM-2's
ease-factor model is a hand-tuned heuristic from 1987; FSRS fits a memory
model to review history and schedules from predicted recall probability,
which is both more accurate and gives a real `stability` figure — the app uses
that directly as the mastery signal rather than inventing a proxy.

### Q: Why is conversation available from day one, not month 3?
**A:** The month-3 rule was protecting against cognitive overload, which is a
real risk — but the fix is constraining the tutor, not withholding it. Profe
stays inside the learner's known vocabulary unless explicitly asked to
stretch, so a week-one beginner gets a week-one conversation. Delaying the
single most distinctive thing the app does by eight weeks meant, in practice,
that nobody ever reached it.

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
