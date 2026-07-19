# Spanish Learning App: Comprehensive Pedagogical Plan
## From Day 1 to Fluency | Evidence-Based Curriculum Design

**Last Updated:** 2026-07-19  
**Status:** Planning Phase (Do Not Build Yet)  
**Foundation:** 40+ years of peer-reviewed second language acquisition research

---

## EXECUTIVE SUMMARY

The current app has **solid technical infrastructure** but the **lesson content violates evidence-based language acquisition principles**. Current lessons ask "What is X in Spanish?" when users have zero comprehensible input—this causes frustration and failure.

**Our Fix:** Redesign the entire curriculum around **Krashen's Input Hypothesis** and **Cognitive Load Theory**:
- Phase 1 (Weeks 1-4): Phonetics + 100 high-frequency words via native-speed listening
- Phase 2 (Weeks 5-12): Thematic vocabulary + story reading via comprehensible listening
- Phase 3 (Weeks 9-12, Month 3): Conversation introduction with scaffolding
- Phase 4 (Month 4+): Real media (podcasts, YouTube, news) with light support

**Key Differentiation:**
- ✅ NO gamification (streaks/points undermine intrinsic motivation)
- ✅ NO explicit grammar rules (grammar emerges from listening context)
- ✅ NO simplified/slow audio (learners habituate to native speed from Day 1)
- ✅ NO output pressure early (speaking waits until 500+ recognized words)
- ✅ YES comprehensible input (Spanish + translations as scaffolding)
- ✅ YES spaced repetition (SM-2 algorithm with 20+ passive encounters first)
- ✅ YES progressive scaffolding (high support Month 1 → low support Month 4)

---

## SECTION 1: CORE PEDAGOGICAL PRINCIPLES

### 1.1 Krashen's Input Hypothesis (The Foundation)

**Core Insight:** Language acquisition happens through **comprehensible input** (i + 1), not through rules and exercises.

```
i = Current competence (what learner already knows)
i + 1 = Slightly above current level (just comprehensible with context clues)
```

**Applied to Our App:**
1. **Natural-speed audio from Day 1** (no slow-motion speech)
   - Learners' auditory system adapts to native speed
   - Slow audio creates false comprehension; learners can't listen to real Spanish later
   - By Month 2, native speed feels normal

2. **Explicit vocabulary preview BEFORE listening**
   - Show 10 target words + English definitions + pronunciations
   - Learner primes their brain; listening becomes comprehensible (priming effect)
   - Prevents cognitive overload during listening

3. **Zero explicit grammar teaching**
   - Grammar emerges from repeated listening (implicit acquisition)
   - Learners never see verb conjugation tables
   - Instead: Hear "yo voy, tú vas, él va" repeated in stories 10+ times across lessons
   - Brain infers the pattern without conscious analysis

4. **English translations provided as scaffolding**
   - Spanish-only immersion overwhelms beginners
   - Strategic translation ensures comprehension without fostering dependency
   - Translations shown AFTER first listening attempt (respects input-first)

### 1.2 Cognitive Load Theory (Why Simplicity Matters)

**Core Insight:** Learner's working memory has fixed capacity (~7±2 units of information).  
Overload it → Learning stops.

**Applied to Our App:**

#### Month 1: Minimal Cognitive Load
- **Audio Lesson Length:** 1-3 minutes (not 15 minutes)
- **Vocabulary Per Lesson:** 5-10 NEW words (not 30)
- **Grammar Scope:** Present tense only (not past, conditional, subjunctive)
- **Task Complexity:** Binary choices ("Who is speaking?" / "Are they happy?")

#### Why This Works:
- Learner focuses on SOUND PATTERNS first (phonetics)
- Vocabulary load is manageable (5-10 items = ~5 units of working memory)
- Grammar is implicit (heard but not analyzed = no cognitive load)
- Success builds confidence (Month 1 learners recognize 100+ words they hear ✓)

#### Month 2-3: Gradual Complexity Increase
- Vocabulary: 20-50 per lesson (learner's capacity has expanded)
- Grammar scope: Past tense introduced via listening
- Task complexity: Inference ("Why did she leave?" = hypothesis testing)
- Lesson length: 3-5 minutes (still manageable)

### 1.3 Spaced Repetition & Forgetting Curves (Retention)

**Core Insight:** Memory decays exponentially (Ebbinghaus, 1885).  
Optimal review timing follows the **SM-2 algorithm** (Wozniak, 1990).

**Applied to Our App:**

```
Forgetting Curve:
- Without review: 50% forgotten after 1 day
- With review at optimal time: Memory doubles each review

SM-2 Interval Progression:
1st review: 1 day later
2nd review: 3 days later
3rd review: 7 days later
4th+ review: Ease Factor × previous interval (typically 2.0x = 14, 28, 56 days)

Example trajectory for one word:
Day 1: Learn (hear "gato" in a story)
Day 2: Review (see flashcard, recall "cat")
Day 4: Review (see flashcard, recall "cat")
Day 10: Review (see flashcard, recall "cat")
Day 20+: Review (maintenance only, ~60-90 day intervals)
```

**Critical Detail: 20+ Passive Encounters Before Active Review**

Research (Hulstijn 1992) shows 20+ exposures needed for initial word acquisition.

**Our Strategy:**
1. Learner hears/reads word in lessons (passive encounter, logged)
2. After 20+ passive encounters, word auto-adds to spaced repetition deck
3. Active review begins (flashcard spaced repetition)
4. This prevents cognitive overload from too many new cards too fast

**Example Timeline:**
```
Week 1: "gato" appears in 3 lessons (3 passive encounters)
Week 2: "gato" appears in 2 lessons + story (5 total)
Week 3: "gato" appears in 2 new lessons + appears in review card (7 total)
Week 4: "gato" hits 20+ passive encounters → Auto-added to active review deck
Week 5: Learner actively reviews "gato" via spaced repetition
```

### 1.4 Input Before Output (Why Speaking Waits)

**Core Insight:** Production capacity lags comprehension by ~3-6 months in real second language acquisition.

**Research Evidence:**
- Krashen (1982): "We do not learn to speak by speaking; we learn to speak by listening"
- MacIntyre & Legatto (2010): Anxiety from early speaking production impairs acquisition
- Cognitive load perspective: Speaking REQUIRES attention to pronunciation + word choice + grammar simultaneously; learner has no working memory left for listening input

**Our Timeline:**
```
Month 1: Listening only (phonetics + 100 words)
Month 2: Listening + Reading (thematic stories)
Month 3: Listening + Reading + Shadowing (shadow native speaker, no real-time pressure)
Month 3+: AI Conversation with HIGH scaffolding
Month 4+: Conversation with reduced scaffolding
```

**Why This Works:**
- Month 1 learner has heard 100+ hours of native Spanish
- Brain has adapted to sound patterns, internalized common phrases
- Speaking is now approximately "retrieving from memory" not "generating from scratch"
- Anxiety is lower (learner has heard the sounds/words 100+ times)

---

## SECTION 2: CURRICULUM DESIGN BY PHASE

### Phase 1: Foundation (Weeks 1-4)

**Goal:** Learner recognizes 100 high-frequency words in listening; sound patterns habituated to native speed.

**Week 1: Phonetics Focus**
- **Content:** Minimal pairs + native speed exposure
  - Spanish /r/ (alveolar) vs /rr/ (trill) → "caro" vs "carro"
  - Spanish /ó/ (stressed) vs /o/ (unstressed) → "pó-lo" vs "po-lo"
  - Vowel quality: Spanish /e/ (closed) vs English /ɛ/ (open)

- **Lessons (5-7):**
  1. "Introduction & Greetings" (Hola, Me llamo, Mucho gusto)
  2. "Phonetic Pairs: R sounds" (Repeat after native speaker)
  3. "Phonetic Pairs: Vowels" (Listen and distinguish)
  4. "First Words: Family" (padre, madre, hermano, hermana)
  5. "First Phrases: Greetings in Context" (Listen to 2-min dialogue, repeat)

- **Vocabulary Target:** 20-30 words (Hola, sí, no, yo, tú, él, ella, padre, madre, hermano, hermana, etc.)

- **UI Pattern:** One word at a time; no lists
  - Show: Spanish word + pronunciation button + picture/emoji
  - Action: "Tap to hear audio (native speed)" → Learner taps multiple times
  - Never show English until learner requests it

- **Cognitive Load:** Minimal (phonetics focus, narrow word scope)

---

**Week 2-4: High-Frequency Words (Comprehension Focus)**

- **Content Structure (repeats for Weeks 2-4):**
  1. Pre-lesson vocabulary preview (10 target words, audio + English, 5 min read)
  2. Listening passage (1-3 min, native speed, repeated 2x)
  3. Comprehension questions (Multiple choice: 3-5 questions)
  4. Story reading (graded reader, same vocabulary, 150-200 words, 10 min read)
  5. Spaced repetition (if word has 20+ passive encounters, add to deck)

- **Lesson Topics (by frequency):**
  - **Week 2:** Pronouns & Basics (yo, tú, él, nosotros, estar, ser)
  - **Week 3:** Common Verbs (hablar, comer, vivir, tener, ir, hacer)
  - **Week 4:** Frequent Nouns & Adjectives (casa, día, agua, bueno, malo, grande)

- **Vocabulary Progression:** 20 → 50 → 100 words (end of Week 4)

- **Comprehension Task Types:**
  - "Who is speaking?" (binary choice)
  - "What are they doing?" (binary choice)
  - "True or False?" (factual recall)
  - NO inference yet (too complex for Month 1)

- **Passive Encounters Tracking:**
  - Backend logs every word appearance in lessons/stories
  - At 20+ encounters, word auto-adds to spaced repetition review deck
  - Learner never sees flashcard until this threshold (prevents overwhelm)

---

### Phase 2: Core Vocabulary (Weeks 5-12)

**Goal:** Learner reaches 300-500 recognized words; 200+ words in active spaced repetition.

#### **Weeks 5-6: Blocked Practice (Same vocabulary in similar contexts)**

**Why Blocked First?**
- Research (Rohrer & Taylor 2009): Blocked practice builds confidence
- Interleaved practice forces deeper encoding but feels harder initially
- Blocked first → Interleaved later = optimal learning trajectory

**Content Structure:**
1. Pre-lesson vocabulary (20 target words from one theme)
2. Listening passage (2-3 min, native speed, repeated 2x)
3. Comprehension questions (MC + short-answer mix)
4. Story reading (same theme, 300-400 words, 15 min read)
5. Optional: Vocabulary extraction task (circle/highlight new words in story)

**Week 5 Theme: Food & Meals**
- Target vocabulary: comer, beber, pan, agua, café, carne, pollo, pescado, fruta, verdura, etc.
- Lessons:
  - Lesson 1: "Una mañana típica" (breakfast dialogue)
  - Lesson 2: "En el restaurante" (restaurant ordering)
  - Lesson 3: "El mercado" (shopping for groceries)
- Story: "Mi comida favorita" (200-300 words about favorite meals, repeats food vocab)

**Week 6 Theme: Family & Relationships**
- Target vocabulary: padre, madre, hermano, hermana, abuela, esposo, esposa, hijo, etc.
- Lessons:
  - Lesson 1: "Mi familia" (introducing family, 2-min dialogue)
  - Lesson 2: "Historias familiares" (short stories about families)
  - Lesson 3: "La familia en la cultura hispana" (cultural context)
- Story: "Mi abuelo" (personal narrative about grandparent, repeats family vocab)

**Progress Check (End Week 6):**
- Vocabulary: 100 → 200-250 recognized
- Spaced Repetition Deck: ~100-150 words in active review
- Listening Hours: ~8-10 hours
- Learner confirms: "I recognize these words when I hear them" ✓

---

#### **Weeks 7-8: Interleaved Practice (Same vocabulary in DIFFERENT contexts)**

**Why Interleaved Now?**
- Research (Rohrer & Taylor 2009): After confidence is built, interleaving forces deeper encoding
- Interleaving improves transfer (ability to use word in new contexts)
- Cognitive load is now manageable (learner has 200+ recognized words as foundation)

**Content Structure:** Same as Weeks 5-6, but vocabulary is mixed across themes

**Week 7: "Travel & Navigation"**
- Target vocabulary: viajar, aeropuerto, tren, coche, hotel, calle, plaza, estación, mapa, etc.
- **NEW TWIST:** Previous vocabulary (food, family) appears in stories
  - Lesson 1 story: "Viajamos en tren" mentions eating on the train, talking about family at destination
  - Lesson 2 story: "En el aeropuerto" mentions buying food, meeting family member there

**Week 8: "Work & Daily Routines"**
- Target vocabulary: trabajar, oficina, escuela, mañana, noche, tarde, hora, descansar, etc.
- **NEW TWIST:** Food + family + travel vocabulary re-appears
  - Lesson 1 story: "Un día en la oficina" mentions going to lunch (food), seeing family after work, commuting (travel)

**Progress Check (End Week 8):**
- Vocabulary: 250 → 350-400 recognized
- Spaced Repetition Deck: ~250 words in active review
- Listening Hours: ~16-18 hours
- Learner can: Follow a 3-5 min conversation with visual context; recognize 80% of words ✓

---

### Phase 3: Conversation Introduction (Weeks 9-12, Month 3)

**Prerequisite:** 400+ recognized words, 250+ in active spaced repetition

**Why Month 3?**
- Cognitive load research: Adding speaking to 100 words = overload
- Adding speaking to 400 words = manageable (learner has comprehension foundation)
- Anxiety research: Learner has heard Spanish 20+ hours; speaking feels less intimidating

#### **Week 9: Shadowing Introduction**

**What is Shadowing?**
- Learner hears native speaker say a phrase
- Learner repeats immediately (listening + delayed speaking, not real-time)
- Bridges passive listening and active speaking without conversation pressure

**Content Structure:**
1. Listening passage (2-3 min, native speed)
2. Comprehension questions (2-3, binary choice, listening comprehension check)
3. Shadowing segment (select 5-8 phrases from passage, learner repeats after native speaker)
4. Self-recording task (optional: record yourself saying the phrases, hear back)
5. Story reading (continuous, 400-500 words, same theme)

**Week 9 Lessons:**
- Lesson 1: "Shadowing: Greetings & Introductions"
- Lesson 2: "Shadowing: Ordering Food at Restaurant"
- Lesson 3: "Shadowing: Asking for Directions"

**Learner Experience:**
```
Native Speaker: "Hola, me llamo Carlos."
[2 second pause for learner to repeat]
Learner (speaking): "Hola, me llamo Carlos."
[App shows: "Good! You matched the stress pattern ✓"]
```

---

#### **Week 10: AI Conversation with HIGH Scaffolding**

**Scaffolding Levels (High → Low):**
1. **Level 1 (High):** AI speaks slowly; learner has 5-10 second think time; suggestions shown
2. **Level 2 (Medium):** AI speaks at normal speed; learner has 3-5 second think time; suggestions shown
3. **Level 3 (Low):** AI speaks at normal speed; learner responds in real-time; no suggestions

**Learner stays at Level 1-2 for Weeks 10-11; progresses to Level 3 in Week 12+**

**Conversation Scenarios (Tightly Scripted):**
- "Ordering at a café" (5-7 exchanges, high-frequency vocabulary, clear context)
- "Meeting someone at a party" (5-7 exchanges, practiced introductions, family questions)
- "Asking for directions" (5-7 exchanges, location words, common phrases)

**Backend for AI Conversation:**
- Integrate with Claude API (or similar) for dynamic responses
- Constraint: Only accept responses using 400+ known words
- Auto-correct pronunciation errors gently ("I heard 'carro'; did you mean 'caro'?")
- Provide context clues if learner is stuck ("Let's try: 'Me encanta...' or 'No me gusta...'")

**Week 10-11 Lessons:**
- 2-3 conversation practice sessions per week, 10-15 min each
- After each session: Review what went well + what was hard
- Optional: Transcription of conversation shown for review

---

#### **Week 12: Reduced Scaffolding, Real Scenarios**

- Scaffolding moves to Level 3 (normal speed, real-time responses, minimal support)
- Scenario complexity increases: combining multiple tasks (ordering + small talk + paying)
- Conversation assessment: "Did you understand 70%+ of what the AI said?"

**Progress Check (End Month 3):**
- Vocabulary: 400-500 recognized
- Spaced Repetition Deck: ~350-400 words in active review
- Listening Hours: ~30-40 hours
- Speaking: Can handle simple 5-7 exchange conversations with preparation
- Fluency Level: A1-A1+ (CEFR scale)

---

### Phase 4: Real Media & Advanced (Month 4+)

**Prerequisite:** 500+ recognized words, can handle basic conversation

**Goal:** Learner consumes authentic Spanish (podcasts, YouTube, news) with light scaffolding.

#### **Month 4: Graded Authentic Media**

**Strategy:** Start with real but simple content (kids' stories, travel vlogs), progress to adult content

**Lesson Structure:**
1. Pre-media vocabulary (20 target words from upcoming media)
2. Watch/listen to 3-5 min segment (native speed, with transcript toggle)
3. Comprehension questions (MC, open-ended, inference)
4. Vocabulary extraction (new words from media added to spaced repetition)
5. Optional: Shadowing or imitation segment

**Example Media Topics:**
- Week 1: "Viajes por América Latina" (travel vlog, 4 min segments)
- Week 2: "Historias de migración" (personal narratives, 5 min each)
- Week 3: "Recetas de comida tradicional" (cooking shows with captions, 3-5 min)
- Week 4: "Noticias de nivel intermedio" (simplified news, 2-3 min segments)

**Transcript Feature:**
- Spanish transcript shown by default (supports reading + listening simultaneously)
- Toggle: Hide Spanish (learner challenges self to listen only)
- Toggle: Show English (if comprehension drops below 60%, show translations)

#### **Month 5+: Advanced Media + Conversation**

- Podcasts (20-30 min episodes, learner listens to 5-10 min segments per lesson)
- YouTube educational content (5-15 min per lesson)
- News articles (500-1000 word graded readers)
- Ongoing conversation practice with increasing complexity (AI + optional human pen-pals via app community)

**Vocabulary Progression:**
- End Month 4: 800-1000 recognized words
- End Month 5: 1000-1200 recognized words
- End Month 6: 1200-1500 recognized words (A2 level, can understand 90%+ of everyday content)

**Self-Sufficiency Check (End Month 6):**
- Learner can: Consume real Spanish media independently with dictionary lookup
- Learner can: Hold 10-15 minute conversations on familiar topics
- Learner can: Read children's books / young adult novels comfortably
- Learner can: Watch Spanish-language TV with Spanish subtitles
- **Decision Point:** Do they continue to fluency (B1/B2 = 6-12 months more) or stop?

---

## SECTION 3: IMPLEMENTATION ROADMAP (BUILD SEQUENCE)

### MVP 1: Phase 1 Foundation (Weeks 1-4 content) — 2-3 weeks build

**What to Build:**
1. Lesson structure redesign (pre-vocabulary → listening → comprehension → story)
2. Vocabulary preview UI (show 10 words, audio for each, English on demand)
3. Audio player improvements (play/pause/repeat, speed control 0.75x/1.0x/1.25x)
4. Comprehension question types (binary choice, MC with 3-4 options, true/false)
5. Story reading UI (text + hover-to-translate for words)
6. Passive encounter tracking (backend logs every word seen/heard)

**Content to Create:**
- 7 lessons for Week 1-4
- 5 stories (150-300 words each)
- 100 vocabulary items with pronunciations
- ~30-40 minutes of native-speed audio (can use existing if available, or TTS for MVP)

**Testing:** User can complete Week 1 → recognize 10 greetings; complete Week 4 → recognize 100+ words ✓

---

### MVP 2: Phase 2 Blocked Practice (Weeks 5-6) — 1-2 weeks build

**What to Build:**
1. Auto-add words to spaced repetition after 20+ passive encounters
2. Spaced repetition UI improvements (cleaner card design, simpler response options)
3. Progress dashboard (show active vocabulary, mastered vocabulary, listening hours)
4. Content themes (food, family themes for Weeks 5-6)

**Content to Create:**
- 6 lessons for Weeks 5-6
- 3 stories (300-400 words each)
- ~200 additional vocabulary items (total 300-400)
- ~20-30 minutes of audio

**Testing:** User completes Week 5-6 → 200+ recognized words; 100+ in active review ✓

---

### MVP 3: Phase 2 Interleaved + Phase 3 Intro (Weeks 7-12) — 3-4 weeks build

**What to Build:**
1. Interleaved lesson sequencing (vocabulary repeats across different themes)
2. Shadowing UI (show phrase, audio, learner repeats, basic pronunciation feedback)
3. Self-recording feature (record audio, play back, compare to native)
4. Conversation prep features (vocabulary review before conversation lessons)

**Content to Create:**
- 12 lessons for Weeks 7-12
- 6 stories
- ~400 additional vocabulary items (total 700-800)
- ~40-50 minutes of audio
- 6 shadowing segments
- 6 conversation scenarios (scripted, tightly constrained)

**Testing:** User completes Weeks 7-12 → 400+ recognized words; can shadow familiar phrases; attempts simple conversation ✓

---

### MVP 4: Phase 4 Real Media (Month 4+) — 2-3 weeks build

**What to Build:**
1. Media player with transcript toggle (show/hide Spanish, show English)
2. Media comprehension questions (parse from transcript, generate via Claude)
3. Media vocabulary extraction (new words auto-added to spaced repetition)
4. Graded media library (curate 20-30 clips, tag by difficulty/topic)

**Content to Create:**
- License or create 15-20 authentic media clips (3-5 min each)
- Create comprehension questions for each (3-5 per clip)
- Curate supplementary resources (links to real podcasts, YouTube, news)

**Testing:** User watches authentic media → comprehends 60%+ with Spanish subtitles; learns new words ✓

---

### Implementation Priority & Timeline

**Phase 1: Foundation (MVP 1-2) — Weeks 1-4**
- Recommended: Build this first; it's the most critical
- Reason: User feedback showed "I don't know anything yet" — MVP 1 fixes this with scaffolded input
- Effort: ~2-3 weeks (frontend UI + backend tracking)

**Phase 2: Growth (MVP 2-3) — Weeks 5-12**
- Recommended: Build after Phase 1 is tested with real users
- Reason: Users who succeed in Phase 1 need this; interleaving is more complex pedagogically
- Effort: ~3-4 weeks

**Phase 3: Maturity (MVP 4) — Month 4+**
- Recommended: Build last; only for users who reach Month 3
- Reason: Requires different UX (media player vs lesson player); can iterate after early users mature
- Effort: ~2-3 weeks

---

## SECTION 4: UI/UX REDESIGN STRATEGY

### Current State: "Boring and Overwhelming"

**User Feedback:** "This is so boring... needs to be engaging and have a lovely UX"

**Problem:** Current UI is minimalist/clinical (white cards, blue buttons, text-heavy)

### Redesigned UX Principles

#### 1. **Visual Hierarchy & Cognitive Clarity**
- **Before:** All lessons listed in grid; no visual distinction between themes
- **After:** 
  - Weekly view with current week highlighted
  - Color-coded themes (Food = warm orange, Family = warm red, Travel = cool blue, Work = neutral gray)
  - Visual progress bar (show which week user is in, how many more to go)

#### 2. **Engagement Without Gamification**
- **What NOT to do:** Streaks, points, badges, leaderboards (undermine intrinsic motivation)
- **What TO do:** 
  - Mastery visualization (word cloud of recognized vocabulary, growing weekly)
  - Listening hours milestone ("You've listened for 5 hours this week ✓")
  - Story completion badges ("You've read 10 stories ✓") — Focus is learning, not streaks
  - Personal progress narrative ("You've gone from 0 to 350 recognized words in 8 weeks 🎯")

#### 3. **Mobile-First Design**
- **Current:** Desktop-first (not mobile optimized)
- **Redesign:**
  - Full-screen audio player (no extra UI clutter)
  - Vertical scrolling for lesson flow (natural mobile behavior)
  - Large touch targets (all buttons/controls thumb-friendly)
  - Dark mode support (reduces eye strain for evening learners)
  - Responsive text sizing (readable on small screens)

#### 4. **Audio Player Redesign**
- **Current:** Generic player, basic controls
- **Redesigned:**
  - **Visual:** Large waveform showing audio progress (user sees exactly where they are)
  - **Controls:** Play/Pause/Repeat (with keyboard support for accessibility)
  - **Speed Control:** Visual toggle (0.75x / 1.0x / 1.25x) with emphasis on native speed (1.0x)
  - **Transcript:** Icon to reveal/hide Spanish text (respects comprehensible input principle)
  - **Context:** Show lesson title, current week, theme color scheme

#### 5. **Spaced Repetition Card Redesign**
- **Current:** Text-heavy card (word + definition + example)
- **Redesigned:**
  - **Front:** Large Spanish word + pronunciation button (audio)
  - **Back:** 
    - English definition (prominent)
    - Example sentence in Spanish (small, italicized)
    - Example sentence in English (small, indented)
  - **Response Buttons:** Simplified (Again / Struggled / Good / Easy) with visual feedback (color change on tap)
  - **Progress Ring:** Show how close word is to mastery (20% → 40% → 60% → 100% mastered)

#### 6. **Story Reading Experience**
- **Current:** Plain text, no interactivity
- **Redesigned:**
  - **Serif Font:** Better readability (Georgia or similar)
  - **Reading Time Estimate:** "8 min read" shown upfront
  - **Vocabulary Highlighting:** Tap any Spanish word → English + pronunciation
  - **Optional Audio:** "Read + Listen" toggle (supports auditory learners)
  - **Progress Bar:** Show reading progress within story
  - **Dictionary Toggle:** "Known words" hidden by default (challenge self) → tap to reveal/hide

#### 7. **Dashboard Redesign (Learner's Home)**
- **Current:** Simple list of lessons
- **Redesigned:**
  - **Weekly Card:**
    - Week title + theme (e.g., "Week 5: Food & Meals 🍽️")
    - 3 lessons with completion status (⬜ → 🟨 in progress → ✅)
    - Progress bar (2/3 lessons complete)
    - Story completion (read? yes/no)
    - Listening hours (e.g., "2.5 hours listened this week")
  
  - **Vocabulary Card:**
    - Word cloud (visual representation of vocabulary learned)
    - Numbers (350 recognized, 200 in active review, 30 mastered this week)
    - Trend (up/down arrow compared to last week)
  
  - **Quick Stats:**
    - Total listening hours (30 hours = 1.5x across-the-board boost!)
    - Lessons completed (12/50)
    - Days practicing (8 / 7 = consistent ✓)
  
  - **Next Action (CTA):**
    - If lesson incomplete: "Continue Week 5, Lesson 2"
    - If lesson complete: "Start Week 5, Lesson 3"
    - If spaced repetition due: "20 vocabulary reviews due today"

#### 8. **Onboarding Redesign**
- **Current:** Login → Lessons list (abrupt)
- **Redesigned:**
  - **Screen 1:** "Why are you learning Spanish?" (Multiple choice: travel, career, family, hobby, culture)
    - Goal-setting creates intrinsic motivation
  
  - **Screen 2:** "How much time can you commit?" (15 min/day, 30 min/day, 60 min/day)
    - Sets realistic expectations
  
  - **Screen 3:** "Audio speed preference" (Native speed, slightly slower, slightly faster)
    - Establishes learning principle (native speed is default)
  
  - **Screen 4:** First lesson walkthrough (interactive, shows how audio/vocabulary/story work)
    - Immediate success experience
  
  - **Result:** User completes onboarding, hears first 10 Spanish words, recognizes them
    - Dopamine hit: "I'm already learning!" ✓

#### 9. **Color Palette & Theme**

**Color Scheme (Theme-Aware, Light & Dark):**

| Component | Light Mode | Dark Mode | Purpose |
|-----------|-----------|-----------|---------|
| **Primary (Action)** | #2563EB (Bright Blue) | #60A5FA (Soft Blue) | Buttons, primary CTAs |
| **Success** | #059669 (Forest Green) | #10B981 (Emerald) | Completion, correct answers |
| **Warning** | #DC2626 (Red) | #EF4444 (Bright Red) | Incorrect, failed review |
| **Info** | #7C3AED (Purple) | #A78BFA (Light Purple) | Tips, info messages |
| **Theme: Food** | #F97316 (Warm Orange) | #FB923C (Light Orange) | Week 5-6 lessons |
| **Theme: Family** | #DC2626 (Warm Red) | #FCA5A5 (Light Red) | Week 6-7 lessons |
| **Theme: Travel** | #0284C7 (Cool Blue) | #38BDF8 (Light Blue) | Week 7-8 lessons |
| **Background (Light)** | #F8FAFC (Near White) | #0F172A (Near Black) | Main background |
| **Surface (Light)** | #FFFFFF (White) | #1E293B (Dark Slate) | Cards, containers |
| **Text (Light)** | #1E293B (Dark Slate) | #F1F5F9 (Light Slate) | Body text |

---

## SECTION 5: DATABASE CHANGES & NEW TABLES

### New Table: `lesson_phases`
Tracks which phase/week each lesson belongs to (for curriculum sequencing).

```sql
CREATE TABLE lesson_phases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id UUID NOT NULL REFERENCES lessons(id),
  phase INTEGER NOT NULL (1, 2, 3, 4),
  week_number INTEGER NOT NULL (1-52),
  theme_category VARCHAR(50) NOT NULL (food, family, travel, work, media, etc.),
  theme_color VARCHAR(50) NOT NULL (for UI),
  order_in_week SMALLINT NOT NULL (1-7, lesson order within week),
  requires_passive_encounters SMALLINT DEFAULT 0 (if this lesson is gated by word encounters),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Modified Table: `vocabulary`
Add encounter tracking.

```sql
-- Add columns to existing `vocabulary` table:
ALTER TABLE vocabulary ADD COLUMN 
  passive_encounters INTEGER DEFAULT 0,
  passive_encounters_updated_at TIMESTAMP,
  user_id UUID (optional, for per-user tracking in future),
  mastery_level SMALLINT DEFAULT 0 (0=new, 1=learning, 2=review, 3=mastered);
```

### New Table: `vocabulary_encounters`
Log every passive encounter (for debugging + user analytics).

```sql
CREATE TABLE vocabulary_encounters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vocabulary_id UUID NOT NULL REFERENCES vocabulary(id),
  lesson_id UUID NOT NULL REFERENCES lessons(id),
  user_id UUID NOT NULL REFERENCES users(id),
  encounter_type ENUM ('listening', 'reading') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX (user_id, vocabulary_id),
  INDEX (vocabulary_id, created_at)
);
```

### Modified Table: `lessons`
Add phase/curriculum metadata.

```sql
-- Add columns to existing `lessons` table:
ALTER TABLE lessons ADD COLUMN
  phase SMALLINT (1, 2, 3, 4),
  week_number SMALLINT,
  lesson_order SMALLINT,
  theme_category VARCHAR(50),
  lesson_type ENUM ('foundation', 'listening_comprehension', 'shadowing', 'conversation', 'media') DEFAULT 'listening_comprehension',
  prerequisite_vocabulary_count SMALLINT (how many recognized words needed to unlock);
```

---

## SECTION 6: TECHNICAL IMPLEMENTATION CHECKLIST

### Frontend Changes

**Lesson Page Restructuring:**
- [ ] Redesign lesson layout (pre-vocabulary → listening → comprehension → story flow)
- [ ] Implement vocabulary preview component (10 words, audio, English toggle)
- [ ] Enhance audio player (waveform, speed control, transcript toggle)
- [ ] Create comprehension question component (multiple choice, true/false, open-ended)
- [ ] Build story reader component (text, hover-to-translate, read-time estimate)

**Dashboard Redesign:**
- [ ] Weekly progress card (visual lesson progression, theme color)
- [ ] Vocabulary stats (word cloud, recognized/active/mastered counts)
- [ ] Listening hours tracker (show total + weekly trend)
- [ ] Next action CTA (clear button to continue or start next lesson)

**Spaced Repetition UI:**
- [ ] Redesign flashcard (larger word, simpler response buttons)
- [ ] Add mastery ring (visual progress toward mastery)
- [ ] Improve response feedback (color/animation on tap)

**Onboarding Flow:**
- [ ] Goal-setting screen (why learn Spanish?)
- [ ] Time commitment screen (15/30/60 min/day)
- [ ] Audio speed preference screen
- [ ] First lesson walkthrough (interactive)

**Theme & Colors:**
- [ ] Implement theme toggle (light/dark mode)
- [ ] Apply color palette across all components
- [ ] Ensure accessibility (WCAG AA contrast ratios)

**Mobile Optimization:**
- [ ] Full-screen audio player on mobile
- [ ] Touch-friendly buttons (48px min size)
- [ ] Responsive text sizing
- [ ] Test on iOS & Android

---

### Backend Changes

**Vocabulary Encounter Tracking:**
- [ ] Create `vocabulary_encounters` table
- [ ] Add endpoint: `POST /api/v1/lessons/{id}/complete` logs all words in lesson
- [ ] Add background job: Daily task checks if any vocabulary hit 20+ encounters, auto-adds to SR deck
- [ ] Add analytics: User dashboard endpoint returns word stats

**Lesson Sequencing & Gating:**
- [ ] Create `lesson_phases` table with phase/week/order metadata
- [ ] Add endpoint: `GET /api/v1/lessons?phase=2&week=5` returns lessons in order
- [ ] Implement prerequisite checking: `GET /api/v1/lessons/{id}/can_unlock` checks if user has 20+ passive encounters of required words
- [ ] Add unlock tracking: When lesson unlocks, log timestamp for analytics

**Audio Handling:**
- [ ] Integrate with text-to-speech API (if audio not yet provided) — use Google Cloud or AWS Polly for native-speed Spanish audio
- [ ] Cache audio files in CloudFront/CDN for fast delivery
- [ ] Generate waveform data (for visual player feedback) via audio processing library

**AI Conversation (Phase 3):**
- [ ] Integrate Claude API for conversation scenarios
- [ ] Create constraint system: Only generate responses using 400+ known words
- [ ] Build error handling: Provide hints if learner is stuck (suggest 3 starting phrases)
- [ ] Implement pronunciation scoring (compare learner audio to native reference)

**Dashboard & Analytics:**
- [ ] Add endpoint: `GET /api/v1/user/stats` returns comprehensive stats (listening hours, recognized words, mastered words, streak info)
- [ ] Add endpoint: `GET /api/v1/user/timeline` returns historical data (words added per week, hours per week, for trend visualization)

---

## SECTION 7: CONTENT CREATION REQUIREMENTS

### What Needs to be Created (By Phase)

#### Phase 1: Foundation (Weeks 1-4)

**Audio Recordings:**
- 7 lessons × 2-3 min audio = ~20 min total
- Native-speed Spanish (no slow-motion)
- Multiple speakers (for variety and exposure to different accents)
- Topics: Greetings, first words, family, basic phrases

**Written Content:**
- 100 vocabulary items (already exist in seed data)
- 5 stories (150-300 words each)
- 20-30 comprehension questions

**Quality Checks:**
- [ ] Native Spanish speaker reviews all audio for pronunciation
- [ ] Pedagogy review: Do these 100 words follow Krashen's i+1 principle for absolute beginners?
- [ ] Story difficulty check: Can absolute beginner (0 prior Spanish) understand with translations?

---

#### Phase 2: Core Vocabulary (Weeks 5-12)

**Audio:**
- 12 lessons × 2-3 min = ~30-35 min
- Topics: Food, family, travel, work (by week)

**Written Content:**
- 200+ additional vocabulary items
- 6 stories (300-400 words each, repeating vocabulary thematically and then interleaved)
- 40-50 comprehension questions

---

#### Phase 3: Conversation (Weeks 9-12)

**Audio & Content:**
- 6 shadowing segments (20-30 seconds each)
- 6 conversation scenarios (tightly scripted, high-frequency vocabulary only)
- Pronunciation reference audio for each phrase

---

#### Phase 4: Real Media (Month 4+)

**Media Curation:**
- 15-20 authentic Spanish clips (3-5 min each)
- Options: Travel vlogs, cooking shows, personal narratives, graded news, podcasts
- All clips need Spanish & English transcripts
- Comprehension questions (3-5 per clip)

**Quality Check:**
- [ ] Difficulty range: Start with kids' content → progress to adult content
- [ ] Accent diversity: Include Spain, Mexico, Argentina, Colombia speakers
- [ ] Topic variety: Travel, food, culture, relationships, daily life

---

## SECTION 8: SUCCESS METRICS (BEFORE BUILD)

**Define these BEFORE coding starts** (needed for testing):

### Engagement Metrics (Not Primary, But Track)
- Weekly active users (goal: 70%+ of registered users active)
- Lesson completion rate (goal: 80%+ of users who start a lesson complete it)
- Average lesson time (goal: 15-20 min per lesson, including story reading)

### Learning Metrics (Primary)
- Vocabulary growth rate (goal: 50+ new recognized words per week, Phase 1-2)
- Spaced repetition consistency (goal: 70%+ of due reviews completed)
- Story comprehension (goal: 70%+ score on comprehension questions by end of Phase 2)
- Listening comprehension improvement (goal: 60%+ → 80%+ comprehension across 4 weeks)

### Retention Metrics (Long-Term)
- 30-day retention (goal: 60%+ of Week 1 users still active in Week 5)
- Vocabulary retention (goal: 80%+ of words in "mastered" state stay there at 90-day interval)

### User Feedback Metrics
- Post-lesson NPS (goal: 70%+)
- Usability survey (goal: 4.0+/5.0 on "This lesson was engaging")
- Open feedback: "How confident are you that you'll reach fluency with this app?" (goal: 80%+ confident)

---

## SECTION 9: RISK & MITIGATION

### Risk 1: "Content Creation is Too Much Work"
- Mitigation: Start with MVP 1 (Phase 1 only) using text-to-speech (AWS Polly) for audio
- Improvement path: Hire native Spanish speaker to record higher-quality audio post-MVP
- Timeline impact: No impact (TTS audio is usable for testing)

### Risk 2: "AI Conversation is Complex"
- Mitigation: Start with tightly scripted scenarios (user can only say 5-10 specific things per exchange)
- Improvement path: Gradually relax constraints as backend improves
- Timeline impact: MVP 3 can skip real AI initially; use branching dialogue tree instead

### Risk 3: "Spaced Repetition Algorithm is Complex"
- Mitigation: Use existing SM-2 implementation (already in backend)
- New complexity: Only "passive encounter tracking" (logging when user hears/reads a word)
- Timeline impact: Low impact (simple database log)

### Risk 4: "Will Users Accept Non-Gamified Design?"
- Mitigation: A/B test on small cohort (20-30 users): gamified vs. non-gamified version
- Decision rule: Whichever cohort shows 50%+ higher 30-day retention, choose that
- Timeline impact: 2-4 week delay, but data-backed decision

### Risk 5: "Phase 4 (Real Media) Requires Licensing/Permissions"
- Mitigation: Partner with Creative Commons creators (easier permissions)
- Alternative: Create own media (record conversations, film local scenes)
- Timeline impact: Can delay Phase 4 launch until licensing is resolved

---

## SECTION 10: POST-LAUNCH ROADMAP (After Phase 4)

### Month 5-6 Features (Mature App)

1. **Human Pen-Pal System**
   - Connect learners with native Spanish speakers for text-based conversation
   - Moderate messages to ensure safety + learning focus
   - Research: Social interaction significantly increases retention

2. **Advanced Conversation (AI Coaching)**
   - Move from scripted scenarios to open-ended conversation
   - AI provides real-time corrections (pronunciation, grammar, word choice)
   - Learner can request explanations ("Why did you correct me?")

3. **Assessment & Certification**
   - Mock DELE/SIELE exam format
   - Official certification (optional, paid)
   - Learner's milestone: "Completed A1 Level ✓"

4. **Community Features**
   - Shared story annotations (learners can see how others interpret stories)
   - Discussion forum (moderated, by theme/week)
   - Virtual study groups (schedule group sessions)

5. **Advanced Content**
   - Literature (short stories from García Márquez, Isabel Allende, etc.)
   - Specialized vocabulary (business, medical, academic)
   - Regional dialects (Spain vs. Mexico vs. Argentina)

---

## CONCLUSION

This plan provides a **research-backed, pedagogically sound curriculum** that prioritizes comprehensible input, spaced repetition, and minimal cognitive overload. It's fundamentally different from existing apps:

- **Not gamified** (no streaks/points)
- **Not text-focused** (listening is primary)
- **Not simplified forever** (real media by Month 4)
- **Not conversation-first** (speaking waits until Month 3)

**Build this carefully.** The user explicitly stated: "don't rush its ok i would rather quality of speed."

Each phase is designed to be **completable and testable** before moving to the next. Start with MVP 1 (Phase 1), test with real learners, iterate, then move to MVP 2.

**Next Step:** Review this plan with the user. Get feedback on:
1. Is the curriculum timeline realistic?
2. Which content creation resources are available?
3. Should we focus on specific Spanish dialect (Spain vs. Mexico)?
4. What's the realistic budget for audio production?

Once approved, we begin with MVP 1 (Phase 1: Weeks 1-4 content + UI redesign).

