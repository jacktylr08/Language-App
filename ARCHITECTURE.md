# Spanish Learning App - Architecture & Implementation Plan

## Executive Summary

This document outlines the architecture for a scientifically-grounded Spanish language learning app that prioritizes **authentic input**, **active recall through spaced repetition**, and **early conversation practice**. The design emphasizes genuine language acquisition over engagement metrics.

**Core Design Principles:**
- Input-first (listening → reading → output)
- Spaced repetition with 20+ target encounters per word
- Natural-speed audio from day one
- Implicit grammar acquisition (no drills)
- Interleaved practice with blocked practice progression
- Conversation introduced by month 3
- Real media transition by month 4
- No gamification (streaks, points, badges)

---

## 1. Tech Stack

### Frontend
**Framework:** React (Next.js 14)
**UI Components:** shadcn/ui (unstyled, accessibility-first)
**Audio Playback:** Web Audio API + Howler.js (cross-browser audio management, playback speed control)
**State Management:** TanStack Query (server state) + Zustand (client state)
**Styling:** Tailwind CSS
**Testing:** Vitest + React Testing Library

**Rationale:**
- Next.js provides SSR, API routes integration, and TypeScript-first development
- Howler.js handles audio with playback speed control (critical for comprehensible input)
- TanStack Query handles vocabulary cache invalidation and progress sync
- Zustand keeps client state minimal (current lesson, active vocabs)

### Backend
**Runtime:** Node.js 20+ (TypeScript)
**Framework:** Express.js
**Database:** PostgreSQL 15+
**Cache:** Redis (spaced repetition scheduling, session cache)
**File Storage:** S3-compatible object storage (audio files, lesson content)
**Authentication:** JWT + refresh tokens
**Task Queue:** Bull (Redis-backed) for progress calculations, notifications

**Rationale:**
- PostgreSQL provides ACID guarantees for vocabulary tracking and progress state
- Redis enables sub-100ms spaced repetition calculations (critical for responsiveness)
- Bull handles async work (daily review calculations, email notifications)
- Express is lightweight and allows custom middleware for curriculum sequencing

### DevOps & Infrastructure
**Containerization:** Docker
**Orchestration:** Docker Compose (dev) → Kubernetes (production)
**CI/CD:** GitHub Actions
**Monitoring:** Prometheus + Grafana (performance) + Sentry (error tracking)
**Logging:** ELK Stack (Elasticsearch, Logstash, Kibana) or Loki

**Rationale:**
- Containerization allows reproducible development and staging
- Prometheus tracks vocabulary acquisition metrics (not engagement)
- Sentry catches bugs in spaced repetition logic early

---

## 2. Data Model

### Core Entities

#### User
```sql
users {
  id: UUID PRIMARY KEY
  email: VARCHAR UNIQUE
  created_at: TIMESTAMP
  current_level: INT (0-5, A0-C1 approximation)
  locale: VARCHAR ('es-MX', 'es-ES', etc.)
  preferences: JSONB {
    target_reviews_per_day: INT (default 20)
    review_time_distribution: 'morning' | 'evening' | 'distributed'
    audio_playback_speed: FLOAT (default 1.0)
    target_conversation_length_minutes: INT (5-30)
  }
  last_active_at: TIMESTAMP
}
```

#### Lesson (Atomic unit of instruction)
```sql
lessons {
  id: UUID PRIMARY KEY
  level: INT (A0-C1)
  curriculum_phase: 'foundation' | 'core' | 'conversation' | 'real_media'
  content_type: 'listening_comprehension' | 'story' | 'conversation' | 'media'
  title: VARCHAR
  description: TEXT
  audio_url: VARCHAR (S3 URL)
  audio_duration_seconds: INT
  phonetic_focus: VARCHAR[] (null if not foundation)
  theme: VARCHAR ('daily_life', 'food', 'travel', etc.)
  prerequisites: UUID[] (prior lessons)
  estimated_duration_minutes: INT
  created_at: TIMESTAMP
  version: INT (for A/B testing)
}
```

#### Vocabulary (Word with context)
```sql
vocabulary {
  id: UUID PRIMARY KEY
  spanish: VARCHAR
  english: VARCHAR[]
  pos: 'noun' | 'verb' | 'adjective' | 'adverb' | 'preposition' | 'pronoun'
  frequency_rank: INT (top 5000 Spanish words)
  ipa_pronunciation: VARCHAR (International Phonetic Alphabet)
  example_sentence_spanish: TEXT
  example_sentence_english: TEXT
  lesson_ids: UUID[] (lessons where word appears)
  related_vocab: UUID[] (synonyms, antonyms, word families)
  category: VARCHAR ('verb_present_regular', 'pronoun_object', etc.)
  difficulty_factor: FLOAT (1.3 - 2.5, Anki-style)
  
  -- Content model variants
  image_url: VARCHAR (for concrete nouns, optional)
  audio_url: VARCHAR (pronunciation, optional)
  example_video_url: VARCHAR (contextual use, optional)
}
```

#### UserVocabularyProgress (Spaced repetition state machine)
```sql
user_vocabulary_progress {
  id: UUID PRIMARY KEY
  user_id: UUID FOREIGN KEY
  vocabulary_id: UUID FOREIGN KEY
  
  -- Spaced Repetition State
  interval_days: INT (days until next review, 0 = new)
  ease_factor: FLOAT (1.3-2.5, Anki algorithm)
  reps: INT (total repetitions seen)
  encounters: INT (total input encounters without active review)
  last_encounter_at: TIMESTAMP (passive input)
  last_review_at: TIMESTAMP (active recall)
  next_review_at: TIMESTAMP
  
  -- Performance tracking
  correct_streak: INT
  acquisition_state: 'new' | 'learning' | 'review' | 'mastered'
  mastery_confidence: FLOAT (0.0-1.0)
  
  -- Learning path
  first_encountered_lesson_id: UUID
  first_review_timestamp: TIMESTAMP
  
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
  UNIQUE(user_id, vocabulary_id)
}
```

#### LessonProgress (User's journey through structured content)
```sql
lesson_progress {
  id: UUID PRIMARY KEY
  user_id: UUID FOREIGN KEY
  lesson_id: UUID FOREIGN KEY
  
  status: 'not_started' | 'in_progress' | 'completed' | 'unlocked_for_review'
  started_at: TIMESTAMP
  completed_at: TIMESTAMP
  completion_percentage: FLOAT (0-100)
  
  -- Listening comprehension (foundation lessons)
  comprehension_attempts: INT
  comprehension_correct: INT
  comprehension_last_score: FLOAT
  
  -- Vocabulary extraction
  extracted_vocabulary_count: INT
  extracted_vocabulary_ids: UUID[] (vocabs discovered in lesson)
  
  -- Story reading (month 2+)
  reading_time_seconds: INT
  words_seen: INT
  
  -- Conversation practice
  conversation_attempts: INT
  pronunciation_scores: FLOAT[]
  response_relevance_scores: FLOAT[]
  
  review_count: INT (times reviewed after completion)
  last_review_at: TIMESTAMP
  
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
  UNIQUE(user_id, lesson_id)
}
```

#### ReviewQueue (Daily scheduling state)
```sql
review_queue {
  id: UUID PRIMARY KEY
  user_id: UUID FOREIGN KEY
  
  due_today: UUID[] (vocabulary IDs due today)
  due_tomorrow: UUID[] (previewed but not due)
  total_reviews_today: INT
  reviews_completed_today: INT
  reviews_completed_timestamp: TIMESTAMP
  
  last_calculated_at: TIMESTAMP
  next_recalculation_at: TIMESTAMP
  
  -- Optimization: cache for sub-100ms lookup
  UNIQUE(user_id)
  UNIQUE INDEX on user_id WHERE active = true
}
```

#### ConversationSession
```sql
conversation_sessions {
  id: UUID PRIMARY KEY
  user_id: UUID FOREIGN KEY
  started_at: TIMESTAMP
  ended_at: TIMESTAMP (null if ongoing)
  duration_seconds: INT
  difficulty_level: INT (A0-C1)
  
  -- Topics and vocabulary
  lesson_context_id: UUID (lesson that prompted conversation)
  target_vocabulary_ids: UUID[] (words to practice)
  actual_vocabulary_used: JSONB (word → usage_count)
  
  -- Audio
  audio_file_url: VARCHAR (recording of conversation)
  transcript_spanish: TEXT
  transcript_english: TEXT
  
  -- Analysis
  pronunciation_score: FLOAT (0-100)
  fluency_score: FLOAT (0-100)
  accuracy_score: FLOAT (0-100)
  vocabulary_recall_score: FLOAT (0-100)
  overall_comprehension_rating: FLOAT (0-100)
  
  feedback_summary: TEXT (AI-generated analysis)
  areas_for_improvement: VARCHAR[]
  
  created_at: TIMESTAMP
}
```

#### RealMediaContent (Month 4+ authentic input)
```sql
real_media_content {
  id: UUID PRIMARY KEY
  type: 'podcast' | 'youtube_video' | 'news_article' | 'tv_clip' | 'movie_clip'
  title: VARCHAR
  description: TEXT
  duration_seconds: INT
  native_url: VARCHAR
  source: VARCHAR ('SpanishPod101', 'YouTube', 'BBC Mundo', etc.)
  native_difficulty_level: VARCHAR ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')
  mapped_difficulty_level: INT (0-5, internal scale)
  
  -- Content adaptation
  has_transcript: BOOLEAN
  transcript_spanish: TEXT
  transcript_english: TEXT
  keyword_vocabulary: UUID[] (pre-identified target words)
  comprehension_questions: JSONB[] (MC + open-ended)
  
  topic: VARCHAR ('news', 'culture', 'travel', 'interview', etc.)
  source_quality: FLOAT (0-1, editorial rating)
  
  created_at: TIMESTAMP
}
```

#### ConversationPartner (AI-driven, flexible)
```sql
conversation_partners {
  id: UUID PRIMARY KEY
  name: VARCHAR
  personality: VARCHAR ('patient_teacher', 'native_peer', 'friendly_tourist', 'formal_professional')
  vocabulary_level: INT (0-5)
  speaking_pace: FLOAT (0.8-1.2, relative to natural speed)
  error_correction_style: 'gentle' | 'direct' | 'none'
  accent: VARCHAR ('neutral', 'mexican', 'spanish', 'argentinian')
  available: BOOLEAN
}
```

---

## 3. Core Modules

### 3.1 Spaced Repetition Engine

**Purpose:** Schedule vocabulary reviews based on scientifically-validated algorithms.

**Algorithm:** SM-2 (Supermemo-2) with modifications
- Interval progression: 1 day → 3 days → 7 days → 14 days → 30 days → 60 days
- Ease factor adjustment based on response quality
- Minimum 20 passive encounters before first active review
- Resets on 3+ consecutive incorrect responses

**Implementation:**
```typescript
// Core interface
interface SpacedRepetitionState {
  vocabulary_id: UUID
  interval_days: number  // Days until next review
  ease_factor: number    // 1.3 - 2.5 (difficulty multiplier)
  reps: number          // Total active reviews
  encounters: number    // Passive input exposures
  acquisition_state: AcquisitionState
}

interface ReviewResult {
  quality: 0 | 1 | 2 | 3 | 4 | 5  // 0=forgot, 5=perfect
  response_time_ms: number
  context: string  // "vocab_card" | "listening_comprehension" | "conversation"
}

// Key method
async function scheduleNextReview(
  state: SpacedRepetitionState,
  result: ReviewResult
): Promise<SpacedRepetitionState>

// Encounter tracking (passive)
async function recordEncounter(
  userId: UUID,
  vocabularyId: UUID,
  lessonId: UUID
): Promise<void>
```

**State Transitions:**
- `new` → `learning` (first encounter + passive exposure)
- `learning` → `review` (20+ encounters, first review attempt)
- `review` → `mastered` (ease factor > 2.0, consistent accuracy)
- Any state → `new` (3+ consecutive incorrect, resets interval)

**Redis Cache Strategy:**
- User's due-today reviews: `reviews:{userId}:due_today` (refreshed daily, 100ms lookup)
- Vocabulary state: `vocab_state:{vocabularyId}:{userId}` (30-day cache)
- Global vocabulary metadata: `vocab:{vocabularyId}` (never invalidates)

### 3.2 Curriculum Engine

**Purpose:** Sequence lessons based on user level and linguistic prerequisites.

**Four Curriculum Phases:**

#### Phase 1: Foundation (Weeks 1-4)
- **Input Type:** Real, natural-speed audio (native speakers)
- **Cognitive Load:** Narrow → Gradual expansion
- **Phonetic Focus:** Spanish sound system (5-7 hour focus)
- **Lesson Structure:**
  1. Isolated phoneme pairs (e.g., /r/ vs /rr/, /o/ vs /ó/)
  2. Minimal pairs in context ("caro" vs "carro")
  3. Full sentences with repetition
  4. Short dialogues (20-30 sec)
- **Vocabulary:** Top 50-100 high-frequency words
- **Weekly progression:**
  - Week 1: Phonetics + 20 words (yo, tú, él, ser, estar, hacer)
  - Week 2: Phonetics + 30 words + simple present tense (input only)
  - Week 3: Phonetics + 50 words + imperative forms (input only)
  - Week 4: Phonetics complete + 100 words + short stories

#### Phase 2: Core Vocabulary (Weeks 5-12)
- **Input Type:** Listening comprehension + short stories (written)
- **Vocabulary Growth:** 100 → 500 words
- **Grammar:** Implicit (through input, no explicit drills)
- **Lesson Structure:**
  1. Pre-listen vocabulary preview (10 words)
  2. Listening passage (1-3 min, natural speed)
  3. Comprehension questions (MC + open-ended)
  4. Vocabulary extraction via card stack
  5. Story reading (related theme, easier vocabulary)
- **Practice Type:** Blocked (same vocabulary in similar contexts)
- **Content Themes:** Daily life, food, family, travel, hobbies

#### Phase 3: Conversation Introduction (Week 9+, Month 3)
- **Input Type:** Shadowing + AI conversation
- **Vocabulary Expansion:** 500 → 800 words
- **Practice Type:** Blocked → Interleaved transition begins
- **Lesson Structure:**
  1. Listening lesson (Phase 2 style)
  2. Shadowing practice (repeat after native speaker, 2-3x)
  3. Conversation practice (AI partner, guided prompts)
  4. Self-recording + feedback
- **Conversation Scenarios:** Ordering food, introductions, asking directions
- **AI Partner:** Starts with high scaffolding (slow speech, repeat capability)

#### Phase 4: Real Media & Advanced (Week 17+, Month 4+)
- **Input Type:** Authentic podcast, news, TV, YouTube (with support)
- **Vocabulary Target:** 1200-1500 words
- **Practice Type:** Interleaved (vocabulary from mixed contexts)
- **Lesson Structure:**
  1. Pre-media vocabulary review (20-30 words from target content)
  2. Watch/listen with transcript (show/hide toggle)
  3. Comprehension questions (contextual)
  4. Vocabulary extraction from new words
  5. Conversation practice with real media context
- **Content Sources:**
  - Podcasts: SpanishPod101, Notes in Spanish, Duolingo Spanish
  - YouTube: Easy Spanish, Spanish with Paul
  - News: BBC Mundo, DW Español, VOA Español (simplified)
  - TV/Film: Clips from El Ministerio del Tiempo, Narcos (Spanish audio)

**Lesson Unlock Logic:**
```typescript
interface LessonUnlockCriteria {
  prerequisite_lessons: UUID[]  // Must complete before unlock
  minimum_vocabulary_count: number  // Minimum words at "review" or "mastered"
  minimum_vocabulary_score: number  // Average score threshold
  calendar_based: boolean  // Paced release (e.g., lesson 5 on day 8+)
  parent_lesson_completion: number  // % completion of prerequisite
}

async function getAvailableLessons(userId: UUID): Promise<Lesson[]> {
  // Check: prerequisite completion
  // Check: vocabulary mastery
  // Check: calendar-based unlocking
  // Return: next 2-3 recommended lessons
}
```

### 3.3 Content Model & Ingestion

**Audio Lesson Structure:**
```json
{
  "lesson_id": "uuid",
  "title": "Mi primer día",
  "duration_seconds": 180,
  "phase": "foundation_week2",
  "audio_file": "s3://lessons/audio/lesson-001.mp3",
  "segments": [
    {
      "start_ms": 0,
      "end_ms": 5000,
      "spanish_text": "Hola, me llamo Juan.",
      "english_text": "Hello, my name is Juan.",
      "vocabulary_ids": ["vocab-001", "vocab-002"],
      "pronunciation_focus": ["hola", "nombre"]
    }
  ],
  "vocabulary": [
    {
      "spanish": "hola",
      "english": ["hello", "hi"],
      "audio": "s3://vocab/audio/hola.mp3",
      "frequency_rank": 245
    }
  ],
  "comprehension_questions": [
    {
      "type": "multiple_choice",
      "question_english": "What is the person's name?",
      "question_spanish": "¿Cuál es el nombre de la persona?",
      "options": ["Juan", "María", "Pedro"],
      "correct_answer": 0
    }
  ]
}
```

**Story Structure:**
```json
{
  "story_id": "uuid",
  "title": "Un día en Madrid",
  "difficulty_level": 1,
  "reading_time_minutes": 8,
  "associated_lesson_id": "lesson-uuid",
  "vocabulary_scope": ["vocab-ids from associated lesson"],
  "text_blocks": [
    {
      "spanish": "María se despierta a las 7 de la mañana...",
      "english": "María wakes up at 7 in the morning...",
      "audio_url": "s3://stories/audio/story-001-block-1.mp3",
      "vocabulary_highlighted": ["despierta", "mañana"]
    }
  ],
  "comprehension_check": {
    "type": "open_ended",
    "prompt": "¿Qué hace María por la mañana?",
    "acceptable_answers": ["Se despierta", "Se levanta a las 7"]
  }
}
```

**Seed Data Strategy:**
1. **Vocabulary Frequency List:** Spanish word frequency list (RAE, SUBTLEX-ES)
   - Top 1,000: 80% of natural speech
   - Top 2,500: 95% of natural speech
   - Target: 2,000 words by end of MVP
   
2. **Audio Sourcing:**
   - Use Common Voice dataset (Mozilla, open license)
   - Partner with Spanish content creators for lessons
   - License real media (podcasts, news clips)
   - Record custom phonetic lessons (or hire native speakers)

3. **Initial Content (MVP Phase 1):**
   - 50 phonetic lesson segments (5-10 sec each)
   - 40 short listening lessons (1-3 min)
   - 20 stories (5-10 min reading time)
   - 500 vocabulary entries with audio

### 3.4 Vocabulary Acquisition Analytics

**Tracked Metrics (NOT engagement):**
```typescript
interface AcquisitionMetrics {
  // Recognition metrics (passive)
  words_encountered: number
  words_recognized_passively: number  // Understood on first listen
  
  // Recall metrics (active)
  words_in_review_cycle: number
  words_mastered: number
  average_reps_per_mastered_word: number  // Target: 20-25
  
  // Acquisition rate
  new_words_per_day: number
  mastered_words_per_week: number
  estimated_active_vocabulary: number  // SM-2 based
  
  // Difficulty tracking
  words_needing_review: number  // Due today
  words_in_learning_phase: number
  average_ease_factor: number
  
  // Input quality
  total_listening_hours: number
  unique_lessons_completed: number
  unique_stories_read: number
  real_media_minutes_watched: number
}
```

**No tracking of:**
- Daily streaks
- Points or badges
- Login time
- Session duration (only relevant content)
- Gamified achievements

---

## 4. API Design

### Authentication Endpoints
```
POST /auth/register
POST /auth/login
POST /auth/refresh
POST /auth/logout
GET  /auth/me
```

### User Endpoints
```
GET  /users/:id
PUT  /users/:id/preferences
GET  /users/:id/analytics/acquisition
```

### Lessons & Content
```
GET  /lessons (paginated, filtered by level/phase/theme)
GET  /lessons/:id
GET  /lessons/:id/audio
GET  /lessons/:id/vocabulary
POST /lessons/:id/start
POST /lessons/:id/complete
GET  /lessons/:id/comprehension-questions
POST /lessons/:id/comprehension-answer
```

### Vocabulary & Spaced Repetition
```
GET  /vocabulary (search, filter by frequency/level)
GET  /vocabulary/:id
GET  /vocabulary/:id/audio
GET  /vocabulary/:id/related

GET  /reviews/due-today (returns array of vocabulary IDs)
GET  /reviews/queue (detailed state with due counts)
POST /reviews/vocabulary/:id
  {
    "quality": 0-5,
    "response_time_ms": number,
    "context": "vocab_card" | "listening_comprehension"
  }
GET  /reviews/analytics
```

### Stories & Reading
```
GET  /stories (paginated, filtered by level/theme)
GET  /stories/:id
GET  /stories/:id/blocks
POST /stories/:id/read
POST /stories/:id/comprehension-answer
```

### Conversation
```
POST /conversations/start
  {
    "lesson_context_id": "optional",
    "difficulty_level": 0-5,
    "target_vocabulary_ids": ["vocab-ids"],
    "partner_id": "conversation_partner_id"
  }
GET  /conversations/:id/transcript
POST /conversations/:id/send-message
  {
    "message_audio_url": "s3://...",
    "message_text": "optional transcription"
  }
POST /conversations/:id/end
GET  /conversations/:id/feedback
```

### Real Media
```
GET  /real-media (paginated, filtered by level/type/topic)
GET  /real-media/:id
GET  /real-media/:id/transcript
GET  /real-media/:id/comprehension-questions
POST /real-media/:id/watch
POST /real-media/:id/comprehension-answer
```

### Progress
```
GET  /progress/lessons (array of lesson progress with %complete)
GET  /progress/vocabulary (acquisition metrics)
GET  /progress/timeline (vocabulary mastered over time)
POST /progress/export (JSON export of learning data)
```

### Admin/Analytics (future)
```
GET  /admin/metrics/users-by-level
GET  /admin/metrics/vocabulary-difficulty
GET  /admin/metrics/lesson-completion-rate
POST /admin/content/create-lesson
```

---

## 5. Frontend Architecture

### Key Screens & Flows

#### 1. Onboarding (Session 1)
```
Screen 1: Goal Setting
- "What's your goal?" (conversation, travel, cultural interest)
- Target timeframe
- Previous language learning experience

Screen 2: Level Assessment (Audio Comprehension)
- 3-5 short audio clips (A0-B1 range)
- "I understand this" / "I don't understand" / "Somewhat"
- Determines starting phase

Screen 3: Preferences
- Target daily reviews (10-30)
- Conversation comfort level
- Audio playback speed preference
- Time of day for reviews

Screen 4: First Lesson
- Play phonetic foundation lesson
- Simple interaction: "Play again" / "Next"
```

#### 2. Listening Comprehension Lesson
```
Header:
- Progress bar (% of lesson)
- Vocabulary preview chip (clickable)

Main Content:
- Large play button
- Audio waveform + playback progress
- Playback speed control (0.75x, 1.0x, 1.25x)
- "Again" button (repeat segment)

Below Audio:
- Transcript toggle (Spanish only initially)
- English translation toggle (available after listen)

Comprehension Questions:
- Multiple choice (4 options, radio buttons)
- Open-ended (text input, for later phases)
- Immediate feedback (only after answer)

Vocabulary Extraction:
- Card stack UI showing extracted words
- Definition in English
- Audio pronunciation button
- "Got it" / "Need help" slider

Action Buttons:
- "Complete" (marks lesson done, unlocks next)
- "Review again" (optional, reviews vocabulary)

Design: Minimal, distraction-free. No notifications, no badges.
```

#### 3. Vocabulary Review (Daily Practice)
```
Header:
- "20 reviews today" (count)
- Progress ring (10/20 complete)
- "Menu" (export, settings, analytics)

Main Content - Card Stack:
- Front: Spanish word + pronunciation (text-to-speech button)
- Flip animation → Back: English definition
- Below: Example sentence in Spanish/English
- Audio pronunciation (native speaker)

Response Buttons:
- "Again" (quality: 0, reset to learning)
- "Struggled" (quality: 1-2, shorter interval)
- "Got it" (quality: 3, normal interval)
- "Easy" (quality: 4-5, longer interval)

Motion:
- Smooth flip animation
- Swiping (left/right) for faster navigation
- Card stack depth cues

After All Reviews:
- "Today's complete! Next review tomorrow"
- "Want to read a story?" (link to stories)
- "Ready to talk?" (link to conversation practice)

Design: Clean, focus on the word. No points, no streaks.
```

#### 4. Conversation Practice
```
Initial Prompt:
- "Who are you talking to?" (partner avatar + name)
- "What should we talk about?" (topic selector)
- Partner responds with scenario-setting sentence

Main Interaction Loop:
- Partner's message (Spanish text + audio playback)
- Transcript toggle (show/hide)
- English translation toggle
- User's turn:
  * Large mic button "Record"
  * After recording: transcript appears (auto-transcription or manual)
  * "Send" button
  * Optional: edit transcript before sending

Feedback (per exchange):
- Pronunciation score (visual: bar graph)
- Relevance score ("Understood your response")
- Correction (if error detected): "You said X, did you mean Y?"

Session Summary (after 5-10 exchanges):
- Overall confidence score
- Words used from lesson
- New vocabulary you produced
- "Areas to practice more"
- Download: audio recording + transcript

Design: Conversational UI, like a chat app but with learning scaffolding.
```

#### 5. Story Reading
```
Screen Layout:
- Title + metadata (reading time, difficulty)
- Paragraph of Spanish text (serif font, good line length)
- Hover tooltip: click any word → English + audio pronunciation
- Below text: word count, reading time estimate

Audio Option:
- "Listen while reading" (toggle)
- Native speaker audio synced to text
- Playback speed control

Comprehension:
- After story: MC questions
- Open-ended reflection prompt
- Vocabulary extraction from story

Design: Distraction-free reading. Like a Kindle but with Spanish learning support.
```

#### 6. Real Media (Month 4+)
```
Pre-Media:
- "You'll watch [2-min clip from Easy Spanish]"
- Preview: 20-30 target vocabulary words (with definitions + audio)
- "Ready?" button

During Media:
- Video player (YouTube embed or custom)
- Transcript toggle (Spanish/English, synced)
- Playable transcript: click word → definition/audio
- Pause & check: pause video → definition popup

After Media:
- Comprehension questions (MC + open-ended)
- Vocabulary extraction (new words you learned)
- Conversation practice: "Talk about what you watched"

Design: Scaffolded engagement with authentic input.
```

#### 7. Progress & Analytics
```
Dashboard:
- Vocabulary Stats
  * Active vocabulary: 245 words
  * Mastered: 45 words (target: 20+ reps each)
  * Due today: 18 reviews
  * Average ease factor: 2.1

- Input Quality
  * Listening hours: 8.5
  * Stories read: 5
  * Real media watched: 0 (unavailable this phase)
  * Lessons completed: 12

- Acquisition Timeline
  * Graph: words mastered over time (exponential growth expected)
  * Milestone: "In 8 weeks, you've learned 45 words deeply"

- Upcoming Milestones
  * "Week 4: You'll unlock conversation practice"
  * "Week 6: You'll start reading stories"
  * "Week 12: Real media unlocks"

Design: Learning-focused analytics. No gamification metrics.
```

### Component Architecture
```
/app
  /layout.tsx (auth check, theme provider)
  /(auth)
    /login
    /register
    /onboarding
  /(lessons)
    /listening/:id
    /story/:id
    /real-media/:id
  /(practice)
    /vocabulary
    /conversation
  /(progress)
    /dashboard
    /export
  /components
    /audio-player
    /vocabulary-card
    /comprehension-question
    /conversation-ui
    /lesson-header
  /hooks
    /useVocabularyReviews
    /useLessonProgress
    /useConversation
  /lib
    /api-client
    /spaced-repetition
    /audio-manager
```

---

## 6. Curriculum Sequencing Timeline

### Month 1: Foundation Phase (Weeks 1-4)

**Week 1: Phonetics Immersion**
- Lessons: Spanish phoneme pairs (10 lessons, 3-5 min each)
- Vocabulary: 20 ultra-high-frequency words (ser, estar, yo, tú, sí, no, etc.)
- Format: Isolated phonemes + native speaker pronunciation + minimal pairs
- Target: Learner hears Spanish naturally, no shock
- Time commitment: 15-20 min/day
- Spaced Repetition: Not yet active (passive listening only)

**Week 2: Phonetics + Simple Present**
- Lessons: Phonetics continuation + 3 short dialogues (30 sec each)
- Vocabulary: +30 words (common verbs: hablar, comer, vivir in present)
- Format: Phonetic focus + natural dialogue with 20-50 word vocabulary
- Grammar input: Present tense conjugations (implicit—no rules taught)
- Comprehension: "Who is speaking?" / "What are they doing?"
- Time commitment: 20-25 min/day
- Spaced Repetition: Initial reviews begin (words from Week 1)

**Week 3: Imperatives & Daily Life**
- Lessons: 4 dialogues (30-60 sec) covering daily routines (morning, meals, evening)
- Vocabulary: +50 words (daily life verbs: despertar, desayunar, trabajar, dormir)
- Format: Phonetics (review) + dialogue listening + vocabulary cards
- Grammar input: Imperative mood (tú commands, implicit)
- Comprehension: Sequencing questions ("What happens first?")
- Vocabulary Review: 30-40 words in active spaced repetition
- Time commitment: 25-30 min/day

**Week 4: Phonetics Complete + First Stories**
- Phonetics: Conclude (learner comfortable with Spanish sounds)
- Lessons: 5 listening comprehension (1-2 min) + 3 short stories (2-3 min reading)
- Vocabulary: +50 words → Total 150 words
- Format: Listening + comprehension + story reading (English glosses available)
- Grammar input: Past tense (irregular verbs, via input only)
- Vocabulary Review: 80-100 words in spaced repetition cycle
- Time commitment: 30-35 min/day

**Month 1 Outcome:**
- 100-150 words recognized in listening comprehension
- 50-80 words in active spaced repetition (< 20 reps each, still learning)
- 4 hours listening to natural Spanish
- No gamification, only progress metrics: vocabulary count + audio hours

---

### Month 2: Vocabulary Expansion (Weeks 5-8)

**Week 5-6: Thematic Vocabulary Blocks**
- Lessons: 8 listening comprehension lessons (2-4 min each) by theme
  * Theme 1: Food & Restaurants (15 new words)
  * Theme 2: Family & Relationships (15 new words)
  * Theme 3: Travel & Transportation (15 new words)
- Format: Pre-listen vocabulary preview (10 words) → Listen → Comprehension → Vocabulary review
- Grammar input: More complex sentences, future tense (ir + infinitive)
- Vocabulary target: 200-250 active words
- Story reading: 2-3 stories/week (15-20 min reading time)
- Time commitment: 35-40 min/day

**Week 7-8: Interleaving Introduction**
- Lessons: Mixed-theme listening (vocabulary from multiple prior themes)
- Blocked practice → Interleaved: Same word appears in different lesson contexts
- Example: "Comer" (to eat) in lesson 5 (food), lesson 12 (family dinner), lesson 18 (restaurant)
- Vocabulary target: 300 active words
- Story reading: 3-4 stories/week, increasing difficulty
- Time commitment: 40-45 min/day

**Month 2 Outcome:**
- 300-400 recognized words in input
- 150-250 words in spaced repetition (20+ reps for ~50 words)
- 8-10 hours total listening
- Reading fluency improving (stories take 5-7 min instead of 10)
- Grammar: Implicit understanding of present, past, future (via context)

---

### Month 3: Conversation Introduction (Weeks 9-12)

**Week 9: Shadowing Introduction**
- Lessons: 4 listening comprehension + 4 shadowing practice
- Shadowing: "Listen, then repeat after the speaker"
- Vocabulary: +50 words (conversation starters, politeness expressions)
- Conversation prep: "What would you say?" scenarios (written response)
- Target: 400-500 active words
- Time commitment: 45-50 min/day

**Week 10-11: AI Conversation Practice**
- Lessons: 6 listening comprehension + 4 guided conversation sessions
- Conversation Partner: AI with adjustable speed/difficulty
- Scenarios: Ordering food, introductions, asking directions, small talk
- Feedback: Pronunciation score + relevance check + error correction
- Vocabulary target: 500-600 words
- Story reading: 4-5 stories/week
- Time commitment: 50-60 min/day

**Week 12: Conversation Confidence Checkpoint**
- Lessons: Review week (fewer new lessons)
- Conversation: 5-6 longer sessions (5-10 min each)
- Self-assessment: "Understand most of what partner says?" / "Can express basic ideas?"
- Vocabulary target: 600-700 words
- Real media preview: Introduce easy YouTube clips (not yet in practice)
- Time commitment: 45 min/day

**Month 3 Outcome:**
- Can have simple conversations (food, introductions, basic questions)
- 600-700 recognized words
- 400-500 words in spaced repetition
- 15+ hours listening input
- Speaking confidence: A1-A1+ level (simple phrases fluently, sentences with hesitation)
- Ready for authentic input (Month 4)

---

### Month 4+: Real Media & Advanced (Weeks 13+)

**Week 13-14: Real Media Introduction**
- Lessons: 4 listening comprehension + 2 real media sessions (YouTube, Easy Spanish)
- Real media: 2-5 min clips with transcript support
- Pre-media vocabulary: 20-30 target words with definitions
- Vocabulary target: 700-800 words
- Conversation: 3-4 sessions/week (real media-based scenarios)
- Time commitment: 60+ min/day (learner may reduce if satisfied)

**Week 15+: Autonomous Learning Phase**
- Lessons: Learner-driven content selection (choose themes, real media)
- Real media: Podcasts, news, TV clips (SpanishPod101, Easy Spanish, BBC Mundo, Netflix shows)
- Vocabulary target: 1000-1500 words
- Conversation: 4-5 sessions/week, driven by learner interest
- Story reading: Advanced stories (newspapers, novels adapted for learners)
- Time commitment: 60-90 min/day (self-directed)

**Expected Proficiency (Month 4+):**
- A1-A2 (depending on consistency)
- Can watch simple Spanish media with comprehension
- Can have 10+ min conversations on familiar topics
- Reading comprehension: Short news articles, simple novels
- Vocabulary: 1000+ active recognition, 700+ active production

---

## 7. Content Strategy

### Vocabulary Seed Data (2,000 words)

**Sourcing:**
1. **Spanish Frequency Lists:**
   - RAE frequency corpus (Real Academia Española)
   - SUBTLEX-ES (film/TV corpus, real-world usage)
   - Target: Top 1,000 words = 80% of speech, Top 2,500 = 95%

2. **Curriculum Prioritization:**
   - Foundation (100 words): Phoneme-friendly, high-frequency, thematic coherence
   - Month 1 (150 total): Daily life, simple verbs, pronouns, prepositions
   - Month 2 (300 total): Thematic expansion (food, family, travel, health)
   - Month 3 (500 total): Conversation-focused (politeness, emotions, opinions)
   - Month 4+ (1000+ total): Real media vocabulary (news, culture, opinions)

**Vocabulary Entry Structure:**
```json
{
  "id": "vocab-0245",
  "spanish": "comer",
  "english": ["to eat", "eating"],
  "pos": "verb",
  "frequency_rank": 245,
  "ipa_pronunciation": "/koˈmeɾ/",
  "difficulty_factor": 1.3,
  "conjugations": {
    "yo_present": "como",
    "tu_present": "comes",
    "el_present": "come",
    "nosotros_present": "comemos",
    "vosotros_present": "coméis",
    "ellos_present": "comen",
    "yo_past": "comí",
    "el_past": "comió"
  },
  "example_lesson_ids": ["lesson-008", "lesson-034", "lesson-067"],
  "related_vocab": ["vocab-0156 (beber)", "vocab-0312 (comida)"],
  "category": "verb_ar_regular",
  "image_url": "s3://vocab/images/comer.jpg",
  "audio_url": "s3://vocab/audio/comer.mp3",
  "example_sentences": [
    {
      "spanish": "Yo como pan todos los días.",
      "english": "I eat bread every day.",
      "audio_url": "s3://examples/comer-example-1.mp3"
    }
  ]
}
```

### Audio Sourcing Strategy

**Phase 1: Foundation Lessons (Custom)**
- Hire native Spanish speakers (Mexican/Castilian neutral accents)
- Record 50 phonetic lesson segments (5-10 sec each, minimal pairs)
- Record 40 short dialogues (30-60 sec, daily life scenarios)
- Budget: ~$2,000-5,000 (freelance voice actors via Fiverr/Upwork)

**Phase 2: Listening Comprehension (Blended)**
- Use Mozilla Common Voice dataset (100+ hours, open license)
- Curate/edit for curriculum relevance
- Supplement with custom recordings of gap content
- Budget: Free (open source) + $1,000-2,000 (editing/processing)

**Phase 3: Real Media (Licensed)**
- Partner with Spanish content creators (YouTube channel licensing)
- Subscribe to podcast archives (SpanishPod101, Notes in Spanish)
- License clips from BBC Mundo, DW Español (news content)
- Fair use: TV show clips (education, review purposes)
- Budget: $5,000-15,000/year (depends on volume)

### Story Content Strategy

**Initial Story Corpus (MVP: 20 stories)**
1. Graded Readers: Adapt published graded Spanish readers (Project Gutenberg, Spanish Level 1 readers)
2. Original Stories: Hire freelance Spanish writers to create short stories (50-200 words) by theme
3. Adaptation: Take existing children's stories in public domain, adapt for language learners

**Story Difficulty Progression:**
- Level 1 (Weeks 1-4): 50-150 word stories, present tense only, high-frequency vocabulary
- Level 2 (Weeks 5-8): 150-300 word stories, past & present tense, theme-specific vocabulary
- Level 3 (Weeks 9-12): 300-500 word stories, mixed tenses, conversational dialogue
- Level 4 (Month 4+): 500-1000 word stories, advanced grammar, authentic vocabulary

**Content Themes (Cover all major frequency patterns):**
- Daily routines (morning, meals, bedtime)
- Family relationships (siblings, parents, holidays)
- Shopping & money (markets, prices, numbers)
- Travel & locations (cities, directions, transportation)
- Hobbies & interests (sports, reading, music)
- Food & eating (restaurants, cooking, preferences)
- Emotions & social (greetings, politeness, feelings)

**Sourcing Budget:**
- Graded readers (10 stories): $500-1,000 (adaptation/licensing)
- Original stories (10 stories): $1,500-3,000 (freelance writers)
- Audio recordings (20 stories): $1,000-2,000 (voice talent)
- **Total: $3,000-6,000**

### Real Media Sourcing

**Sources (Tier 1: Easy, Tier 2: Intermediate)**

**Tier 1 (A1-A2 difficulty):**
- Easy Spanish (YouTube channel, short interviews with Spanish speakers on streets)
- SpanishPod101 (beginner podcast episodes)
- Duolingo Spanish Stories (short, graded narratives with audio)
- Simple animated stories (videos made for Spanish learners)

**Tier 2 (A2-B1 difficulty):**
- Notes in Spanish (conversational podcast, slower paced)
- Spanish language YouTube channels (Spanish with Paul, Easy Languages)
- BBC Mundo (news simplified for learners)
- Netflix originals in Spanish (with Spanish subtitles)

**Tier 3 (B1+ difficulty, future):**
- Spanish podcasts (full native speed, news/culture)
- Spanish news (El País, 20 Minutos)
- Spanish film (Narcos, El Ministerio del Tiempo)
- TED Talks en español

---

## 8. MVP Scope

### What's Included (Core Loop)

**MVP Deliverables:**

1. **Backend Infrastructure**
   - PostgreSQL database (schema: users, vocabulary, lessons, progress, SR state)
   - Express.js API (auth, lessons, vocabulary reviews, progress)
   - Redis cache (daily review queue, vocabulary state)
   - S3-compatible storage (lesson audio, vocabulary audio)
   - JWT authentication

2. **Spaced Repetition Engine**
   - SM-2 algorithm implementation
   - Daily review scheduling
   - Vocabulary state tracking (new → learning → review → mastered)
   - Redis caching for < 100ms lookups

3. **Curriculum Engine**
   - Foundation phase sequencing (Weeks 1-4)
   - Lesson unlocking logic (prerequisites, calendar-based pacing)
   - Vocabulary prerequisite tracking

4. **Frontend (React + Next.js)**
   - Onboarding flow (goal setting, level assessment, preference)
   - Listening comprehension lesson player
   - Vocabulary review (card stack UI)
   - Progress dashboard (vocabulary count, hours listening)
   - Account settings

5. **Content (Phase 1 Only)**
   - 50 phonetic lesson segments (5-10 min total)
   - 40 short listening lessons (30-120 min total)
   - 10 stories (2-3 min reading each)
   - 500 vocabulary entries with audio

6. **Analytics (Learning-Focused Only)**
   - Vocabulary acquisition tracking
   - Listening hours
   - Lessons completed
   - Spaced repetition metrics (average ease factor, reps per word)
   - NO gamification metrics (no streaks, points, badges)

### What's Excluded (Post-MVP)

1. **Conversation Practice** (Month 3+ feature)
   - AI conversation partner integration (requires fine-tuned model)
   - Speech recognition (requires third-party API integration)
   - Pronunciation analysis
   - Implement in MVP+1

2. **Real Media Integration** (Month 4+ feature)
   - YouTube/podcast embedding
   - Real media comprehension tracking
   - Implement in MVP+2

3. **Mobile App** (Future)
   - React Native implementation
   - Offline support (lesson caching)
   - Use web app with PWA fallback for MVP

4. **Transcription & Correction** (Advanced)
   - Manual transcription for conversations
   - AI-driven grammar correction
   - Implement after core loop proven

5. **Advanced Analytics**
   - Detailed error analysis per lesson
   - Learner cohort comparisons
   - Content effectiveness measurement
   - Implement with sufficient user base

6. **Internationalization**
   - Multiple Spanish variants (Latin American, Castilian, etc.)
   - Support only neutral Spanish in MVP
   - Add regional variants post-MVP

### MVP Implementation Timeline

**Phase 1: Foundation (Weeks 1-2)**
- Backend: Database schema, auth endpoints, basic lesson API
- Frontend: Onboarding, lesson player (audio + basic UI)
- Content: 20 phonetic segments, 10 vocabulary entries

**Phase 2: Core Loop (Weeks 3-4)**
- Backend: Spaced repetition engine, vocabulary review endpoints
- Frontend: Vocabulary review card stack, progress dashboard
- Content: 50 phonetic segments, 40 listening lessons, 500 vocab

**Phase 3: Polish & Testing (Week 5)**
- End-to-end testing (onboarding → lesson → review → progress)
- Audio quality assurance
- Performance optimization (Redis caching)
- Content QA (vocabulary definitions, audio pronunciation)

**Phase 4: Beta Launch (Week 6+)**
- Close beta with 10-20 language learning enthusiasts
- Gather feedback on curriculum sequencing
- Iterate on UI/UX before public launch
- Plan MVP+1 features (conversation)

### Success Metrics (MVP)

**Technical:**
- API response time < 100ms (p95)
- Vocabulary review cache hit rate > 95%
- Lesson audio playback smooth (no stuttering)

**Learning Effectiveness:**
- Learners complete 4 weeks (foundation phase) with > 80% engagement
- 50+ words reach "mastered" status by week 4 for consistent users
- Average ease factor trends toward 2.0+ (difficulty balancing working)
- Listening comprehension score improves by 30%+ from start to week 4

**User Experience:**
- Onboarding completion rate > 90%
- Lesson dropout rate < 10% (users who start week 1 complete week 4)
- Time-on-task: Users spend 25-35 min/day in core loop (natural usage, not forced)
- No complaints about gamification (expected: "No pressure, just learning")

---

## 9. Implementation Roadmap

### Timeline: 12-14 Weeks to MVP Launch

**Weeks 1-2: Backend Foundation**
- [x] PostgreSQL schema design (all entities)
- [x] Express.js project setup (TypeScript)
- [x] JWT authentication (login, register, refresh)
- [x] Basic CRUD endpoints (lessons, vocabulary)
- [x] Database migrations (Knex.js or TypeORM)

**Weeks 3-4: Core Spaced Repetition**
- [x] Redis integration (caching, queue)
- [x] SM-2 algorithm implementation
- [x] Daily review scheduling logic
- [x] Vocabulary state tracking (ACID transactions)
- [x] Encounter logging (passive listening tracking)

**Weeks 5-6: Frontend Foundation**
- [x] Next.js project setup (TypeScript, TailwindCSS)
- [x] Onboarding flow (3-4 screens)
- [x] Audio player component (Howler.js integration)
- [x] Lesson player screen (listening comprehension)
- [x] TanStack Query integration (API data fetching)

**Weeks 7-8: Vocabulary Review UI**
- [x] Card stack component (flip animation, swiping)
- [x] Response buttons (quality: 0-5)
- [x] Daily review queue display
- [x] Vocabulary definition + audio pronunciation
- [x] Example sentence display

**Weeks 9-10: Content & Analytics**
- [x] Progress dashboard (vocabulary count, listening hours)
- [x] Lesson completion tracking
- [x] Acquisition metrics (words recognized, mastered, etc.)
- [x] Content seed data (500 vocabulary, 50 lessons, 10 stories)
- [x] S3 audio upload & serving

**Weeks 11-12: End-to-End Testing & Optimization**
- [x] Full user journey testing (onboarding → lesson → review → progress)
- [x] Audio playback optimization (streaming, caching)
- [x] Database query optimization (N+1 queries, indexing)
- [x] Redis cache warm-up strategy
- [x] UI/UX polish (mobile responsiveness, accessibility)

**Week 13-14: Beta Preparation**
- [x] Staging environment setup
- [x] Beta tester recruitment (10-20 users)
- [x] Feedback collection system (simple form or chat)
- [x] Monitoring setup (Sentry, Prometheus)
- [x] Documentation (user guide, API docs)

### Post-MVP Priorities (Months 2-3)

**MVP+1: Conversation & Speaking (Weeks 15-18)**
- OpenAI Whisper API integration (speech-to-text)
- AI conversation partner (fine-tuned LLM or API)
- Pronunciation scoring (WebRTC, pitch/formant analysis)
- Conversation session recording + playback
- Feedback generation (error correction, encouragement)

**MVP+2: Real Media Integration (Weeks 19-22)**
- YouTube/podcast embedding with transcript sync
- Real media comprehension questions
- Vocabulary extraction from real media
- Real media difficulty classification
- Real media recommendation engine

**MVP+3: Advanced Features (Weeks 23-26)**
- Personalized lesson recommendations (based on vocabulary gaps)
- Content generation (fine-tune vocabulary lessons per user)
- Social features (optional): friend progress, group challenges (light touch, no gamification)
- Mobile app (React Native or PWA)
- Multi-language support (French, German, etc., reuse curriculum engine)

---

## 10. Tech Stack Summary Table

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **Frontend** | React 18 + Next.js 14 | SSR, API routes, TypeScript |
| | Howler.js | Audio playback, speed control |
| | TanStack Query | Server state management |
| | Zustand | Client state (minimal) |
| | Tailwind CSS | Utility-first styling |
| | shadcn/ui | Accessible components |
| **Backend** | Node.js 20 + Express.js | Lightweight, TypeScript-friendly |
| | PostgreSQL 15 | ACID transactions, reliability |
| | Redis 7 | Caching, task queue |
| | Bull | Async job processing |
| | TypeORM | ORM, migrations |
| **Infrastructure** | Docker | Containerization |
| | AWS S3 / Minio | Audio storage |
| | GitHub Actions | CI/CD |
| | Prometheus + Grafana | Monitoring |
| | Sentry | Error tracking |
| **Content** | PostgreSQL JSONB | Flexible lesson/story storage |
| | S3 | Audio file hosting |
| | FFmpeg | Audio processing (normalization, format conversion) |
| **Deployment** | Docker Compose (dev) | Local development |
| | Kubernetes (prod) | Scalability, reliability |
| | Nginx | Reverse proxy, static assets |

---

## 11. Architecture Diagrams

### User Flow (MVP)
```
Onboarding → Level Assessment → Preferences
    ↓
Daily Loop:
  1. Listen to Lesson (15-20 min)
     - Comprehension questions
     - Vocabulary extraction
  2. Story Reading (5-10 min, optional)
  3. Vocabulary Review (15-20 min)
     - 20-30 daily reviews via card stack
  4. Progress Check (2-3 min)
     - Words mastered, hours listened, next unlock

Repeat daily for 4+ weeks → Foundation phase complete
```

### System Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                       User Client (Browser)                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  React App (Next.js)                                     │   │
│  │  - Onboarding, Lesson Player, Vocabulary Review, Progress│   │
│  │  - Howler.js for audio playback                          │   │
│  │  - TanStack Query for API sync                           │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                  Nginx (Reverse Proxy)
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Backend (Node.js)                           │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Express.js API Server                                   │   │
│  │  - /auth (login, register)                               │   │
│  │  - /lessons (lesson CRUD + content)                      │   │
│  │  - /vocabulary (vocab lookup)                            │   │
│  │  - /reviews (SR scheduling, submission)                  │   │
│  │  - /progress (analytics)                                 │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              ↓                                   │
│  ┌──────────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  PostgreSQL      │  │   Redis      │  │  Bull Job Queue  │  │
│  │  ├─ users        │  │  ├─ reviews  │  │  ├─ email notify │  │
│  │  ├─ lessons      │  │  ├─ vocabs   │  │  ├─ SR calc      │  │
│  │  ├─ vocabulary   │  │  ├─ sessions │  │  └─ progress agg │  │
│  │  ├─ progress     │  │  └─ cache    │  └──────────────────┘  │
│  │  └─ SR state     │  │              │                        │
│  └──────────────────┘  └──────────────┘                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
              ┌───────────────────────────────┐
              │  AWS S3 / Minio Object Store  │
              │  ├─ Lesson audio files        │
              │  ├─ Story audio (optional)    │
              │  └─ Vocabulary audio          │
              └───────────────────────────────┘

Monitoring Layer:
- Prometheus scrapes metrics from Express.js
- Grafana dashboards (response time, SR cache hit rate)
- Sentry captures errors in SR calculations
```

### Spaced Repetition State Diagram
```
        [NEW]
          ↓
     (1st encounter)
          ↓
    [LEARNING]  ←────────────┐
      ↙      ↘               │
  (20+ encounters)      (forgot or 3+ wrong)
    /        \              │
  [REVIEW] → [MASTERED]     │
   ↓  ↑                      │
   └──┴──────────────────────┘

Interval progression:
NEW → LEARNING: After 20 passive encounters
LEARNING: 1 day → 3 days → 7 days (first 3 reviews)
REVIEW: 14 days → 30 days → 60 days (if ease factor >= 2.0)
MASTERED: 90+ days (ease factor > 2.3, consistent accuracy)
RESET: Any state → NEW (if 3+ consecutive failures or ease factor drops below 1.3)
```

---

## 12. Key Design Decisions & Tradeoffs

| Decision | Choice | Alternative | Tradeoff |
|----------|--------|-------------|----------|
| SR Algorithm | SM-2 (Anki-style) | Leitner system, Piotrowski | SM-2 is proven & customizable; Leitner simpler but less scientific |
| Curriculum Pacing | Calendar-based unlock + performance gates | Pure performance-based | Calendar ensures consistent progress; pure perf-based risks bottlenecks |
| Audio Quality | Native speaker, natural speed | Slow-speed, simplified | Natural speed is harder; consistent input prepares for real media |
| Vocabulary Review | Card stack (spaced rep) | Sentence-in-context drills | Cards are efficient for recall practice; drills better for grammar |
| Conversation | Post-MVP (AI partner) | Included from day 1 | AI partner requires more infrastructure; MVP focuses on core loop |
| Real Media | Month 4+ (scaffolded) | Included from day 1 | Scaffolding needed to avoid overwhelm; Month 4 allows preparation |
| Gamification | Removed entirely | Light gamification (streaks only) | No gamification = focus on learning; might hurt retention initially but better outcomes |
| Frontend | React + Next.js | Vue + Nuxt, Svelte | React ecosystem largest, Next.js SSR + API routes = full-stack speed |
| Database | PostgreSQL | MongoDB | Postgres better for ACID (SR state), structured data; Mongo more flexible |
| Caching | Redis | Memcached | Redis supports complex data types (lists, hashes), TTL-based expiration |

---

## 13. Open Questions & Future Decisions

1. **Conversation Partner Backend:**
   - Use OpenAI API? (cost: $0.001-0.01 per message)
   - Fine-tune open-source model? (cost: compute, maintenance)
   - Decision required before MVP+1

2. **Real Media Sourcing:**
   - License existing content or create original?
   - Cost tradeoff: Licensed ($10K+/year) vs. Original ($20K+/year)

3. **Audio Processing:**
   - Normalize all audio to LUFS -16? (standardize loudness)
   - Compress dynamic range? (easier for comprehension)
   - Decision: Yes to both (improves comprehensibility)

4. **Pronunciation Scoring:**
   - Use Google Cloud Speech-to-Text? ($0.06/15sec audio)
   - Use Azure? (similar pricing)
   - Use local model (Coqui STT)? (free but less accurate)
   - Decision: Use cloud API initially, move to local model if cost prohibitive

5. **User Retention Strategy:**
   - Email notifications? ("5 reviews waiting") — Useful or spammy?
   - Daily habit tracking? (visible but no streak gamification)
   - Decision: Email digest (3x/week), in-app progress only

---

## 14. Success Criteria

### MVP Launch (Week 14)
- ✓ 10-20 beta testers complete onboarding
- ✓ > 80% complete Week 1 (foundation phonetics)
- ✓ > 60% complete Week 4 (100+ words recognized)
- ✓ Average 25-35 min/day time-on-task
- ✓ No critical bugs in SR engine (vocabulary state integrity)
- ✓ Audio playback smooth on 4G connection

### End of Month 1 (Post-MVP)
- ✓ 50+ paying users
- ✓ 90%+ still engaged (logging in 5+ days/week)
- ✓ Average learner reached 100-150 recognized words
- ✓ Feedback: "No pressure, just learning" (repeated)
- ✓ Net Promoter Score > 40 (willingness to recommend)

### End of Month 2 (MVP+1: Conversation)
- ✓ Conversation practice integrated
- ✓ Users report improved confidence in speaking
- ✓ Pronunciation scoring functional (> 70% correlation with native rater)
- ✓ 300-400 recognized word vocabulary maintained

### End of Month 3 (MVP+2: Real Media)
- ✓ Real media content library (50+ clips)
- ✓ Users transition from app lessons to real media by week 12
- ✓ Comprehension improves (validated via comprehension questions)
- ✓ Retention remains high (> 80% active after 12 weeks)

---

## 15. Conclusion

This architecture prioritizes **evidence-based language acquisition** over engagement metrics. The core loop (listening → vocabulary review → progress tracking) establishes habit-forming behavior without gamification. The spaced repetition engine ensures vocabulary is deeply learned (20+ encounters), and the curriculum sequencing gradually introduces complexity (phonetics → listening → conversation → real media).

**Key differentiators:**
1. No gamification (authentic goal: replace the app by speaking Spanish)
2. Natural-speed audio from day one (prepares for real media)
3. Implicit grammar (no drills, pure input-based learning)
4. Conversation early (month 3, after foundation)
5. Real media by month 4 (exit ramp to authentic input)

The MVP establishes this core loop in 12-14 weeks. Post-MVP features (conversation, real media, mobile) extend the platform but are not required for MVP success.

**Success is defined by:** learners who consistently practice (25-35 min/day), deepen vocabulary recognition (20+ passive encounters → 5-7 encounters to recall), and graduate to speaking Spanish naturally by month 3-4.
