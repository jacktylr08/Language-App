-- Spanish Learning App - Database Schema (PostgreSQL 15+)
-- This schema implements the data model outlined in ARCHITECTURE.md

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- USERS & AUTHENTICATION
-- ============================================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_active_at TIMESTAMP WITH TIME ZONE,

    -- Proficiency tracking
    current_level INT DEFAULT 0,  -- 0-5 (A0-C1 approximation)

    -- Locale for dialect support (future)
    locale VARCHAR(10) DEFAULT 'es-MX',

    -- User preferences (JSONB for flexibility)
    preferences JSONB DEFAULT '{
        "target_reviews_per_day": 20,
        "review_time_distribution": "distributed",
        "audio_playback_speed": 1.0,
        "target_conversation_length_minutes": 10
    }'::jsonb,

    -- Soft delete support
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- ============================================================================
-- LESSONS & CURRICULUM
-- ============================================================================

CREATE TABLE lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,

    -- Curriculum positioning
    level INT NOT NULL,  -- 0-5 (A0-C1)
    curriculum_phase VARCHAR(50) NOT NULL,
        -- 'foundation', 'core', 'conversation', 'real_media'
    content_type VARCHAR(50) NOT NULL,
        -- 'listening_comprehension', 'story', 'conversation', 'media'

    -- Audio & content
    audio_url VARCHAR(512),  -- S3 URL
    audio_duration_seconds INT,

    -- Phonetic focus (foundation phase only)
    phonetic_focus TEXT[],

    -- Lesson context
    theme VARCHAR(100),  -- 'daily_life', 'food', 'travel', etc.

    -- Sequencing & prerequisites
    prerequisites UUID[] DEFAULT '{}',  -- lesson IDs that must be completed first
    calendar_unlock_day INT,  -- days after user creation before unlock
    estimated_duration_minutes INT DEFAULT 5,

    -- Versioning for A/B testing
    version INT DEFAULT 1,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    published BOOLEAN DEFAULT TRUE,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_lessons_level_phase ON lessons(level, curriculum_phase);
CREATE INDEX idx_lessons_theme ON lessons(theme);
CREATE INDEX idx_lessons_created_at ON lessons(created_at DESC);

-- ============================================================================
-- VOCABULARY
-- ============================================================================

CREATE TABLE vocabulary (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    spanish VARCHAR(255) NOT NULL,
    english VARCHAR(255)[] NOT NULL,  -- Array of possible translations

    -- Linguistic properties
    part_of_speech VARCHAR(50),  -- 'noun', 'verb', 'adjective', etc.
    frequency_rank INT,  -- Position in Spanish word frequency list
    ipa_pronunciation VARCHAR(255),  -- International Phonetic Alphabet

    -- Difficulty scaling (Anki-style)
    difficulty_factor FLOAT DEFAULT 2.5,

    -- Example usage
    example_sentence_spanish TEXT,
    example_sentence_english TEXT,

    -- Content associations
    lesson_ids UUID[] DEFAULT '{}',
    related_vocab_ids UUID[] DEFAULT '{}',  -- Synonyms, antonyms, word families

    -- Categorical tagging (for implicit grammar)
    category VARCHAR(100),
        -- 'verb_present_regular', 'pronoun_object', 'preposition_location', etc.

    -- Media files
    image_url VARCHAR(512),  -- For concrete nouns
    audio_url VARCHAR(512),  -- Pronunciation file

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE UNIQUE INDEX idx_vocabulary_spanish ON vocabulary(spanish);
CREATE INDEX idx_vocabulary_frequency ON vocabulary(frequency_rank);
CREATE INDEX idx_vocabulary_lesson_ids ON vocabulary USING GIN(lesson_ids);

-- ============================================================================
-- SPACED REPETITION STATE (Core Engine)
-- ============================================================================

CREATE TABLE user_vocabulary_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vocabulary_id UUID NOT NULL REFERENCES vocabulary(id) ON DELETE CASCADE,

    -- SM-2 Algorithm State
    interval_days INT DEFAULT 0,  -- Days until next review (0 = new)
    ease_factor FLOAT DEFAULT 2.5,  -- 1.3-2.5 range
    reps INT DEFAULT 0,  -- Total active reviews
    encounters INT DEFAULT 0,  -- Total passive input encounters

    -- Timing
    last_encounter_at TIMESTAMP WITH TIME ZONE,  -- Last passive input
    last_review_at TIMESTAMP WITH TIME ZONE,  -- Last active review
    next_review_at TIMESTAMP WITH TIME ZONE,

    -- Performance tracking
    correct_streak INT DEFAULT 0,
    acquisition_state VARCHAR(50) DEFAULT 'new',
        -- 'new', 'learning', 'review', 'mastered'
    mastery_confidence FLOAT DEFAULT 0.0,  -- 0.0-1.0

    -- Learning path
    first_encountered_lesson_id UUID REFERENCES lessons(id),
    first_review_timestamp TIMESTAMP WITH TIME ZONE,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, vocabulary_id)
);

CREATE INDEX idx_uvp_user_id ON user_vocabulary_progress(user_id);
CREATE INDEX idx_uvp_next_review ON user_vocabulary_progress(user_id, next_review_at)
    WHERE acquisition_state != 'mastered';
CREATE INDEX idx_uvp_state ON user_vocabulary_progress(user_id, acquisition_state);

-- ============================================================================
-- LESSON PROGRESS (User journey through structured content)
-- ============================================================================

CREATE TABLE lesson_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,

    -- Completion tracking
    status VARCHAR(50) DEFAULT 'not_started',
        -- 'not_started', 'in_progress', 'completed', 'unlocked_for_review'
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    completion_percentage INT DEFAULT 0,  -- 0-100

    -- Listening comprehension metrics
    comprehension_attempts INT DEFAULT 0,
    comprehension_correct INT DEFAULT 0,
    comprehension_last_score FLOAT,

    -- Vocabulary interaction
    extracted_vocabulary_count INT DEFAULT 0,
    extracted_vocabulary_ids UUID[] DEFAULT '{}',

    -- Story reading
    reading_time_seconds INT DEFAULT 0,
    words_seen INT DEFAULT 0,

    -- Conversation practice
    conversation_attempts INT DEFAULT 0,
    pronunciation_scores FLOAT[] DEFAULT '{}',
    response_relevance_scores FLOAT[] DEFAULT '{}',

    -- Review tracking
    review_count INT DEFAULT 0,
    last_review_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, lesson_id)
);

CREATE INDEX idx_lp_user_id ON lesson_progress(user_id);
CREATE INDEX idx_lp_status ON lesson_progress(user_id, status);
CREATE INDEX idx_lp_completed ON lesson_progress(user_id, completed_at DESC);

-- ============================================================================
-- DAILY REVIEW QUEUE (Optimization cache for scheduling)
-- ============================================================================

CREATE TABLE review_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,

    -- Due items (vocabulary IDs)
    due_today UUID[] DEFAULT '{}',
    due_tomorrow UUID[] DEFAULT '{}',

    -- Progress tracking
    total_reviews_today INT DEFAULT 0,
    reviews_completed_today INT DEFAULT 0,
    reviews_completed_timestamp TIMESTAMP WITH TIME ZONE,

    -- Cache validity
    last_calculated_at TIMESTAMP WITH TIME ZONE,
    next_recalculation_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_rq_user_id ON review_queue(user_id);
CREATE INDEX idx_rq_recalc_at ON review_queue(next_recalculation_at);

-- ============================================================================
-- VOCABULARY REVIEW HISTORY (Audit trail for SR calculations)
-- ============================================================================

CREATE TABLE vocabulary_review_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vocabulary_id UUID NOT NULL REFERENCES vocabulary(id) ON DELETE CASCADE,

    -- Review outcome
    quality INT NOT NULL,  -- 0-5: 0=forgot, 5=perfect
    response_time_ms INT,
    context VARCHAR(100),  -- 'vocab_card', 'listening_comprehension', 'conversation'

    -- State before review
    interval_days_before INT,
    ease_factor_before FLOAT,
    reps_before INT,

    -- State after review
    interval_days_after INT,
    ease_factor_after FLOAT,
    reps_after INT,
    acquisition_state_after VARCHAR(50),

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_vrh_user_vocab ON vocabulary_review_history(user_id, vocabulary_id);
CREATE INDEX idx_vrh_created_at ON vocabulary_review_history(user_id, created_at DESC);

-- ============================================================================
-- CONVERSATION SESSIONS
-- ============================================================================

CREATE TABLE conversation_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Session timing
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INT,

    -- Context
    difficulty_level INT DEFAULT 0,
    lesson_context_id UUID REFERENCES lessons(id),
    target_vocabulary_ids UUID[] DEFAULT '{}',
    actual_vocabulary_used JSONB DEFAULT '{}',  -- {"vocab_id": usage_count}

    -- Audio & transcription
    audio_file_url VARCHAR(512),
    transcript_spanish TEXT,
    transcript_english TEXT,

    -- Analysis & scoring
    pronunciation_score FLOAT,  -- 0-100
    fluency_score FLOAT,  -- 0-100
    accuracy_score FLOAT,  -- 0-100
    vocabulary_recall_score FLOAT,  -- 0-100
    overall_comprehension_rating FLOAT,  -- 0-100

    -- Feedback
    feedback_summary TEXT,
    areas_for_improvement VARCHAR(255)[],

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cs_user_id ON conversation_sessions(user_id);
CREATE INDEX idx_cs_created_at ON conversation_sessions(user_id, created_at DESC);

-- ============================================================================
-- REAL MEDIA CONTENT (Future: Month 4+)
-- ============================================================================

CREATE TABLE real_media_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Type & source
    type VARCHAR(50) NOT NULL,  -- 'podcast', 'youtube_video', 'news_article', etc.
    title VARCHAR(255) NOT NULL,
    description TEXT,
    source VARCHAR(100),  -- 'SpanishPod101', 'BBC Mundo', etc.

    -- Media properties
    duration_seconds INT,
    native_url VARCHAR(512),
    native_difficulty_level VARCHAR(10),  -- 'A1', 'A2', 'B1', etc.
    mapped_difficulty_level INT,  -- 0-5 internal scale

    -- Content adaptation
    has_transcript BOOLEAN DEFAULT FALSE,
    transcript_spanish TEXT,
    transcript_english TEXT,
    keyword_vocabulary UUID[] DEFAULT '{}',
    comprehension_questions JSONB[] DEFAULT '{}',

    -- Metadata
    topic VARCHAR(100),  -- 'news', 'culture', 'travel', etc.
    source_quality FLOAT DEFAULT 0.5,  -- 0-1 editorial rating

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    published BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_rmc_level ON real_media_content(mapped_difficulty_level);
CREATE INDEX idx_rmc_topic ON real_media_content(topic);

-- ============================================================================
-- CONVERSATION PARTNERS (AI-driven, flexible)
-- ============================================================================

CREATE TABLE conversation_partners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    personality VARCHAR(100),  -- 'patient_teacher', 'native_peer', etc.
    vocabulary_level INT DEFAULT 0,  -- 0-5
    speaking_pace FLOAT DEFAULT 1.0,  -- 0.8-1.2 relative to natural speed
    error_correction_style VARCHAR(50) DEFAULT 'gentle',  -- 'gentle', 'direct', 'none'
    accent VARCHAR(50) DEFAULT 'neutral',  -- 'neutral', 'mexican', 'spanish', etc.
    available BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- CONTENT SEGMENTS (Detailed lesson structure)
-- ============================================================================

CREATE TABLE lesson_segments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,

    -- Timing
    start_ms INT NOT NULL,
    end_ms INT NOT NULL,

    -- Content
    spanish_text TEXT NOT NULL,
    english_text TEXT NOT NULL,
    pronunciation_focus VARCHAR(255)[],

    -- Vocabulary tagged in this segment
    vocabulary_ids UUID[] DEFAULT '{}',

    -- Sequence
    sequence_order INT NOT NULL,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ls_lesson_id ON lesson_segments(lesson_id, sequence_order);

-- ============================================================================
-- COMPREHENSION QUESTIONS
-- ============================================================================

CREATE TABLE comprehension_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,

    -- Question metadata
    question_type VARCHAR(50) NOT NULL,  -- 'multiple_choice', 'open_ended', 'fill_blank'
    question_english TEXT NOT NULL,
    question_spanish TEXT NOT NULL,

    -- Multiple choice options
    options VARCHAR(255)[],
    correct_answer INT,  -- Index of correct option for MC
    acceptable_answers TEXT[],  -- For open-ended/fill-blank

    -- Sequence
    sequence_order INT DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cq_lesson_id ON comprehension_questions(lesson_id, sequence_order);

-- ============================================================================
-- STORY CONTENT
-- ============================================================================

CREATE TABLE stories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,

    -- Difficulty & context
    difficulty_level INT NOT NULL,  -- 0-5
    reading_time_minutes INT,
    associated_lesson_id UUID REFERENCES lessons(id),
    vocabulary_scope UUID[] DEFAULT '{}',

    -- Metadata
    theme VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    published BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_stories_difficulty ON stories(difficulty_level);
CREATE INDEX idx_stories_theme ON stories(theme);

-- Story text blocks (segmented for comprehension & click-to-translate)
CREATE TABLE story_blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,

    spanish TEXT NOT NULL,
    english TEXT NOT NULL,
    audio_url VARCHAR(512),  -- Optional narration
    vocabulary_highlighted UUID[] DEFAULT '{}',

    sequence_order INT NOT NULL,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sb_story_id ON story_blocks(story_id, sequence_order);

-- Story comprehension check (end-of-story comprehension)
CREATE TABLE story_comprehension (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    story_id UUID NOT NULL UNIQUE REFERENCES stories(id) ON DELETE CASCADE,

    question_type VARCHAR(50),  -- 'open_ended', 'multiple_choice'
    prompt TEXT NOT NULL,
    acceptable_answers TEXT[],

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- ANALYTICS & AGGREGATIONS (Denormalized for query performance)
-- ============================================================================

CREATE TABLE user_acquisition_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,

    -- Recognition metrics
    words_encountered INT DEFAULT 0,
    words_recognized_passively INT DEFAULT 0,

    -- Recall metrics
    words_in_review_cycle INT DEFAULT 0,
    words_mastered INT DEFAULT 0,

    -- Acquisition rates
    new_words_today INT DEFAULT 0,
    mastered_words_this_week INT DEFAULT 0,
    estimated_active_vocabulary INT DEFAULT 0,

    -- Input quality
    total_listening_hours FLOAT DEFAULT 0.0,
    total_reading_minutes INT DEFAULT 0,
    unique_lessons_completed INT DEFAULT 0,
    unique_stories_read INT DEFAULT 0,
    real_media_minutes_watched INT DEFAULT 0,

    -- Timestamps
    last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_uam_user_id ON user_acquisition_metrics(user_id);

-- ============================================================================
-- FUNCTIONS & TRIGGERS (Database-level helpers)
-- ============================================================================

-- Function to update user's updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update trigger to main tables
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_lessons_updated_at BEFORE UPDATE ON lessons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_vocabulary_updated_at BEFORE UPDATE ON vocabulary
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_uvp_updated_at BEFORE UPDATE ON user_vocabulary_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_lp_updated_at BEFORE UPDATE ON lesson_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- GRANTS (Security - restrict to app user)
-- ============================================================================

-- Create app-specific database role (optional, for production)
-- DO $$
-- BEGIN
--     IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'language_app') THEN
--         CREATE ROLE language_app WITH LOGIN PASSWORD 'CHANGE_ME';
--     END IF;
-- END
-- $$;

-- GRANT CONNECT ON DATABASE language_app TO language_app;
-- GRANT USAGE ON SCHEMA public TO language_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO language_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO language_app;

-- ============================================================================
-- SEED DATA (Optional: sample content for development)
-- ============================================================================

-- Insert sample users (for testing)
-- INSERT INTO users (email, password_hash, current_level)
-- VALUES ('dev@example.com', 'hash_placeholder', 0);

-- Insert sample vocabulary (top 20 Spanish words)
-- These would come from a bulk import script in production
