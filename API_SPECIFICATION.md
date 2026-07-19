# API Specification - Spanish Learning App

**Base URL:** `https://api.language-app.dev` (or `http://localhost:3001` for dev)
**API Version:** v1
**Authentication:** JWT Bearer token in `Authorization` header

---

## Authentication Endpoints

### POST /auth/register
Register a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:** `201 Created`
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "created_at": "2026-07-19T10:00:00Z",
    "current_level": 0,
    "locale": "es-MX"
  },
  "tokens": {
    "access_token": "eyJhbGc...",
    "refresh_token": "eyJhbGc...",
    "expires_in": 86400
  }
}
```

**Errors:**
- `400 Bad Request` - Invalid email or password
- `409 Conflict` - Email already registered

---

### POST /auth/login
Log in with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:** `200 OK`
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "current_level": 1,
    "preferences": {
      "target_reviews_per_day": 20,
      "audio_playback_speed": 1.0
    }
  },
  "tokens": {
    "access_token": "eyJhbGc...",
    "refresh_token": "eyJhbGc...",
    "expires_in": 86400
  }
}
```

**Errors:**
- `401 Unauthorized` - Invalid credentials
- `404 Not Found` - User not found

---

### POST /auth/refresh
Refresh access token using refresh token.

**Request:**
```json
{
  "refresh_token": "eyJhbGc..."
}
```

**Response:** `200 OK`
```json
{
  "access_token": "eyJhbGc...",
  "refresh_token": "eyJhbGc...",
  "expires_in": 86400
}
```

**Errors:**
- `401 Unauthorized` - Invalid refresh token
- `403 Forbidden` - Refresh token expired

---

### POST /auth/logout
Invalidate current session.

**Response:** `204 No Content`

---

### GET /auth/me
Get current authenticated user.

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "created_at": "2026-07-19T10:00:00Z",
  "current_level": 1,
  "locale": "es-MX",
  "preferences": {
    "target_reviews_per_day": 20,
    "review_time_distribution": "distributed",
    "audio_playback_speed": 1.0,
    "target_conversation_length_minutes": 10
  },
  "last_active_at": "2026-07-19T15:30:00Z"
}
```

---

## User Endpoints

### GET /users/:id
Get user profile by ID.

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "created_at": "2026-07-19T10:00:00Z",
  "current_level": 1,
  "locale": "es-MX",
  "preferences": { }
}
```

**Errors:**
- `404 Not Found` - User not found

---

### PUT /users/:id/preferences
Update user preferences.

**Request:**
```json
{
  "target_reviews_per_day": 25,
  "audio_playback_speed": 0.9,
  "target_conversation_length_minutes": 15
}
```

**Response:** `200 OK`
```json
{
  "preferences": {
    "target_reviews_per_day": 25,
    "review_time_distribution": "distributed",
    "audio_playback_speed": 0.9,
    "target_conversation_length_minutes": 15
  }
}
```

---

## Lessons & Content

### GET /lessons
List lessons (paginated, filterable).

**Query Parameters:**
- `level` (int): Filter by difficulty level (0-5)
- `phase` (string): Filter by phase ('foundation', 'core', 'conversation', 'real_media')
- `theme` (string): Filter by theme ('daily_life', 'food', 'travel', etc.)
- `limit` (int): Results per page (default 10, max 50)
- `offset` (int): Pagination offset (default 0)
- `sort` (string): Sort by field ('created_at', 'level', etc.), prefix with '-' for desc

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "lesson-uuid",
      "title": "Mi primer día",
      "description": "Introduction to Spanish phonetics and greetings",
      "level": 0,
      "curriculum_phase": "foundation",
      "content_type": "listening_comprehension",
      "audio_url": "https://s3.../lesson-001.mp3",
      "audio_duration_seconds": 180,
      "theme": "daily_life",
      "estimated_duration_minutes": 5,
      "prerequisites": [],
      "created_at": "2026-01-15T00:00:00Z"
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 10,
    "offset": 0,
    "next_url": "/lessons?limit=10&offset=10"
  }
}
```

---

### GET /lessons/:id
Get specific lesson with all details (audio segments, vocabulary, questions).

**Response:** `200 OK`
```json
{
  "id": "lesson-uuid",
  "title": "Mi primer día",
  "description": "Introduction to Spanish phonetics",
  "level": 0,
  "curriculum_phase": "foundation",
  "content_type": "listening_comprehension",
  "audio_url": "https://s3.../lesson-001.mp3",
  "audio_duration_seconds": 180,
  "theme": "daily_life",
  "estimated_duration_minutes": 5,
  "segments": [
    {
      "id": "segment-uuid",
      "start_ms": 0,
      "end_ms": 5000,
      "spanish_text": "Hola, me llamo Juan.",
      "english_text": "Hello, my name is Juan.",
      "vocabulary_ids": ["vocab-001", "vocab-002"],
      "pronunciation_focus": ["hola", "llamo"]
    }
  ],
  "vocabulary": [
    {
      "id": "vocab-001",
      "spanish": "hola",
      "english": ["hello", "hi"],
      "pos": "interjection",
      "audio_url": "https://s3.../vocab/hola.mp3"
    }
  ],
  "comprehension_questions": [
    {
      "id": "q-uuid",
      "type": "multiple_choice",
      "question_english": "What is the person's name?",
      "question_spanish": "¿Cuál es el nombre de la persona?",
      "options": ["Juan", "María", "Pedro"],
      "correct_answer": 0
    }
  ]
}
```

---

### GET /lessons/:id/audio
Get lesson audio file (redirects to S3 URL or streams directly).

**Response:** `302 Found` or `200 OK` (audio/mpeg)
- Redirect to S3 pre-signed URL or direct audio stream

---

### POST /lessons/:id/start
Record that user started lesson.

**Request:**
```json
{}
```

**Response:** `200 OK`
```json
{
  "lesson_id": "lesson-uuid",
  "status": "in_progress",
  "started_at": "2026-07-19T10:00:00Z"
}
```

---

### POST /lessons/:id/complete
Mark lesson as completed, extract vocabulary, trigger vocabulary unlocking.

**Request:**
```json
{
  "completion_percentage": 100,
  "comprehension_score": 0.85,
  "extracted_vocabulary_ids": ["vocab-001", "vocab-002"],
  "reading_time_seconds": 180
}
```

**Response:** `200 OK`
```json
{
  "lesson_id": "lesson-uuid",
  "status": "completed",
  "completed_at": "2026-07-19T10:15:00Z",
  "extracted_vocabulary": [
    {
      "id": "vocab-001",
      "spanish": "hola",
      "english": ["hello"],
      "acquisition_state": "new",
      "next_review_at": "2026-07-19T10:30:00Z"
    }
  ],
  "next_lesson_unlock": {
    "lesson_id": "lesson-uuid",
    "title": "Mi segundo día",
    "available_at": "2026-07-20T00:00:00Z"
  }
}
```

**Side Effects:**
- Creates `lesson_progress` record with `completed` status
- Creates `user_vocabulary_progress` entries for extracted vocabulary
- Checks for next lesson unlock (prerequisites met?)
- Recalculates review queue

---

### POST /lessons/:id/comprehension-answer
Submit answer to comprehension question.

**Request:**
```json
{
  "question_id": "q-uuid",
  "answer": 0,  // For MC: index of selected option; for open-ended: text
  "response_time_ms": 3000
}
```

**Response:** `200 OK`
```json
{
  "question_id": "q-uuid",
  "correct": true,
  "feedback": "Correct! Juan is the person's name.",
  "user_score": 1.0,
  "lesson_comprehension_progress": {
    "questions_answered": 1,
    "questions_correct": 1,
    "current_score": 1.0
  }
}
```

---

## Vocabulary

### GET /vocabulary
Search and list vocabulary (paginated, filterable).

**Query Parameters:**
- `search` (string): Search by Spanish or English word
- `frequency_rank_min` (int): Minimum frequency rank
- `frequency_rank_max` (int): Maximum frequency rank
- `level` (int): Filter by learning level
- `lesson_id` (uuid): Filter by lesson
- `limit` (int): Results per page (default 20, max 100)
- `offset` (int): Pagination offset

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "vocab-001",
      "spanish": "hola",
      "english": ["hello", "hi"],
      "pos": "interjection",
      "frequency_rank": 245,
      "ipa_pronunciation": "/ˈola/",
      "audio_url": "https://s3.../vocab/hola.mp3",
      "difficulty_factor": 2.5,
      "example_sentence": {
        "spanish": "Hola, ¿cómo estás?",
        "english": "Hello, how are you?"
      }
    }
  ],
  "pagination": { }
}
```

---

### GET /vocabulary/:id
Get specific vocabulary entry with related words.

**Response:** `200 OK`
```json
{
  "id": "vocab-0245",
  "spanish": "comer",
  "english": ["to eat", "eating"],
  "pos": "verb",
  "frequency_rank": 245,
  "ipa_pronunciation": "/koˈmeɾ/",
  "difficulty_factor": 2.5,
  "audio_url": "https://s3.../vocab/comer.mp3",
  "example_sentence": {
    "spanish": "Yo como pan todos los días.",
    "english": "I eat bread every day.",
    "audio_url": "https://s3.../examples/comer-ex1.mp3"
  },
  "related_vocab": [
    {
      "id": "vocab-0156",
      "spanish": "beber",
      "english": ["to drink"],
      "relationship": "semantic_field"
    }
  ],
  "conjugations": {
    "present": {
      "yo": "como",
      "tu": "comes",
      "el": "come"
    },
    "past": {
      "yo": "comí",
      "el": "comió"
    }
  }
}
```

---

### GET /vocabulary/:id/audio
Get vocabulary pronunciation audio (redirect to S3).

**Response:** `302 Found` or `200 OK` (audio/mpeg)

---

## Spaced Repetition & Reviews

### GET /reviews/due-today
Get list of vocabulary IDs that are due for review today.

**Response:** `200 OK`
```json
{
  "user_id": "uuid",
  "due_today": [
    "vocab-001",
    "vocab-002",
    "vocab-003"
  ],
  "total_reviews_today": 20,
  "reviews_completed_today": 3,
  "due_tomorrow": ["vocab-045", "vocab-089"],
  "next_recalculation_at": "2026-07-20T00:00:00Z"
}
```

---

### GET /reviews/queue
Get detailed review queue with full vocabulary data (for initial load).

**Query Parameters:**
- `limit` (int): Maximum vocabulary items to return (default 5, for progressive loading)

**Response:** `200 OK`
```json
{
  "due_today": [
    {
      "id": "vocab-001",
      "spanish": "hola",
      "english": ["hello"],
      "audio_url": "https://s3.../vocab/hola.mp3",
      "example_sentence": { },
      "progress": {
        "interval_days": 1,
        "ease_factor": 2.5,
        "reps": 3,
        "next_review_at": "2026-07-20T00:00:00Z"
      }
    }
  ],
  "queue_stats": {
    "total": 20,
    "completed": 3,
    "remaining": 17
  }
}
```

---

### POST /reviews/vocabulary/:id
Submit vocabulary review result (primary SR feedback mechanism).

**Request:**
```json
{
  "quality": 4,  // 0-5: 0=forgot, 5=perfect
  "response_time_ms": 2500,
  "context": "vocab_card"  // or "listening_comprehension", "conversation"
}
```

**Response:** `200 OK`
```json
{
  "vocabulary_id": "vocab-001",
  "result": {
    "quality": 4,
    "correct": true
  },
  "updated_progress": {
    "acquisition_state": "review",
    "interval_days": 7,  // Next review in 7 days
    "ease_factor": 2.6,  // Increased (was 2.5)
    "reps": 4,
    "next_review_at": "2026-07-26T10:00:00Z",
    "correct_streak": 3
  },
  "queue": {
    "remaining_today": 16,
    "next_vocabulary_id": "vocab-002"
  }
}
```

**Side Effects:**
- Updates `user_vocabulary_progress` (SM-2 calculation)
- Creates `vocabulary_review_history` audit record
- If `quality < 2` (forgot): Reset `interval_days` to 1, move to learning
- If word mastered: Update `acquisition_state` to "mastered"
- Recalculate daily review queue in Redis

---

### GET /reviews/analytics
Get user's spaced repetition analytics.

**Response:** `200 OK`
```json
{
  "vocabulary_stats": {
    "total_vocabulary": 245,
    "in_learning": 50,
    "in_review": 120,
    "mastered": 75,
    "average_ease_factor": 2.15
  },
  "acquisition_metrics": {
    "words_encountered_passively": 200,
    "words_in_active_cycle": 170,
    "average_reps_per_mastered": 22,
    "estimated_active_vocabulary": 500
  },
  "performance": {
    "average_accuracy": 0.87,
    "accuracy_trend": [0.80, 0.82, 0.85, 0.87],  // Last 7 days, daily
    "reviews_completed_this_week": 140,
    "reviews_this_week_by_day": [20, 22, 18, 25, 19, 20, 16]
  }
}
```

---

## Stories

### GET /stories
List stories (paginated, filterable).

**Query Parameters:**
- `difficulty_level` (int): 0-5
- `theme` (string): Story theme
- `limit` (int): Results per page (default 10)
- `offset` (int): Pagination offset

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "story-uuid",
      "title": "Un día en Madrid",
      "description": "María explores Madrid on her first day",
      "difficulty_level": 1,
      "reading_time_minutes": 8,
      "theme": "travel",
      "associated_lesson_id": "lesson-uuid",
      "created_at": "2026-01-15T00:00:00Z"
    }
  ],
  "pagination": { }
}
```

---

### GET /stories/:id
Get story with full text and comprehension check.

**Response:** `200 OK`
```json
{
  "id": "story-uuid",
  "title": "Un día en Madrid",
  "description": "María explores Madrid",
  "difficulty_level": 1,
  "reading_time_minutes": 8,
  "theme": "travel",
  "blocks": [
    {
      "id": "block-uuid",
      "spanish": "María se despierta a las 7 de la mañana...",
      "english": "María wakes up at 7 in the morning...",
      "audio_url": "https://s3.../stories/story-001-block-1.mp3",
      "vocabulary_highlighted": ["despierta", "mañana"],
      "sequence_order": 1
    }
  ],
  "vocabulary_scope": ["vocab-ids"],
  "comprehension_check": {
    "type": "open_ended",
    "prompt": "¿Qué hace María por la mañana?",
    "acceptable_answers": ["Se despierta", "Se levanta a las 7"]
  }
}
```

---

### POST /stories/:id/read
Record that user read story.

**Request:**
```json
{
  "reading_time_seconds": 420,
  "comprehension_answer": "Se despierta a las 7",
  "vocabulary_extracted": ["vocab-005", "vocab-006"]
}
```

**Response:** `200 OK`
```json
{
  "story_id": "story-uuid",
  "status": "completed",
  "reading_time_seconds": 420,
  "comprehension_correct": true,
  "vocabulary_added": [
    {
      "id": "vocab-005",
      "spanish": "despertar",
      "acquisition_state": "new"
    }
  ]
}
```

---

## Progress & Analytics

### GET /progress/lessons
Get user's lesson progress (all lessons, with completion %).

**Query Parameters:**
- `phase` (string): Filter by curriculum phase

**Response:** `200 OK`
```json
{
  "lessons": [
    {
      "id": "lesson-uuid",
      "title": "Mi primer día",
      "status": "completed",
      "completion_percentage": 100,
      "completed_at": "2026-07-19T10:15:00Z",
      "comprehension_score": 0.85,
      "extracted_vocabulary_count": 5,
      "review_count": 2
    }
  ],
  "summary": {
    "total_lessons": 50,
    "completed": 12,
    "in_progress": 2,
    "available": 8,
    "locked": 28
  }
}
```

---

### GET /progress/vocabulary
Get user's vocabulary acquisition metrics and statistics.

**Response:** `200 OK`
```json
{
  "recognition_metrics": {
    "words_encountered": 150,
    "words_recognized_passively": 120,
    "percentage_recognized": 80.0
  },
  "recall_metrics": {
    "words_in_review_cycle": 50,
    "words_mastered": 12,
    "average_reps_per_mastered": 22
  },
  "acquisition_rate": {
    "new_words_today": 5,
    "mastered_words_this_week": 2,
    "estimated_active_vocabulary": 500,
    "rate_per_day": 2.5
  },
  "input_quality": {
    "total_listening_hours": 8.5,
    "total_reading_minutes": 45,
    "unique_lessons_completed": 12,
    "unique_stories_read": 5,
    "real_media_minutes_watched": 0
  },
  "difficulty_profile": {
    "words_needing_review": 18,
    "words_in_learning_phase": 32,
    "average_ease_factor": 2.15
  }
}
```

---

### GET /progress/timeline
Get word mastery timeline (for visualization).

**Query Parameters:**
- `range` (string): 'week', 'month', 'all' (default 'month')

**Response:** `200 OK`
```json
{
  "timeline": [
    {
      "date": "2026-07-13",
      "words_mastered_that_day": 0,
      "words_mastered_cumulative": 8
    },
    {
      "date": "2026-07-14",
      "words_mastered_that_day": 1,
      "words_mastered_cumulative": 9
    }
  ],
  "graph_data": {
    "dates": ["2026-07-13", "2026-07-14", ...],
    "cumulative_mastered": [8, 9, ...]
  }
}
```

---

### POST /progress/export
Export user's learning data (GDPR compliance).

**Query Parameters:**
- `format` (string): 'json' or 'csv' (default 'json')

**Response:** `200 OK` (application/json or application/csv)
```json
{
  "export_date": "2026-07-19T10:00:00Z",
  "user": { },
  "lessons": [ ],
  "vocabulary_progress": [ ],
  "review_history": [ ],
  "conversation_sessions": [ ]
}
```

---

## Conversation Practice (Post-MVP)

### POST /conversations/start
Start a new conversation session.

**Request:**
```json
{
  "lesson_context_id": "lesson-uuid",
  "difficulty_level": 1,
  "target_vocabulary_ids": ["vocab-001", "vocab-002"],
  "partner_id": "partner-uuid"
}
```

**Response:** `201 Created`
```json
{
  "session_id": "session-uuid",
  "partner": {
    "id": "partner-uuid",
    "name": "María",
    "personality": "patient_teacher"
  },
  "initial_message": "Hola! ¿Cómo te llamas?",
  "initial_message_audio": "https://s3.../conversation/session-uuid/intro.mp3"
}
```

---

### POST /conversations/:id/send-message
Send message in conversation.

**Request:**
```json
{
  "message_audio_url": "https://s3.../user-audio-recording.mp3",
  "message_text": "optional transcription or manual text"
}
```

**Response:** `200 OK`
```json
{
  "partner_response": "Mucho gusto, María. ¿De dónde eres?",
  "partner_response_audio": "https://s3.../response.mp3",
  "feedback": {
    "pronunciation_score": 0.82,
    "fluency_score": 0.75,
    "accuracy_score": 0.90,
    "corrections": [
      {
        "you_said": "Soy de México",
        "correct_version": "Soy de México",
        "issue": "pronunciation"
      }
    ]
  }
}
```

---

### POST /conversations/:id/end
End conversation, get full session feedback.

**Request:**
```json
{}
```

**Response:** `200 OK`
```json
{
  "session_id": "session-uuid",
  "duration_seconds": 420,
  "transcript_spanish": "Hola... Mucho gusto...",
  "transcript_english": "Hello... Nice to meet you...",
  "overall_scores": {
    "pronunciation": 0.82,
    "fluency": 0.75,
    "accuracy": 0.90,
    "vocabulary_recall": 0.88
  },
  "vocabulary_used": {
    "vocab-001": 3,
    "vocab-002": 2
  },
  "feedback_summary": "Great job! You used your target vocabulary naturally.",
  "areas_for_improvement": ["pronunciation of 'jota'", "verb conjugation"],
  "audio_recording_url": "https://s3.../sessions/session-uuid/recording.mp3"
}
```

---

## Error Handling

All errors follow this format:

**Response:** `4xx` or `5xx`
```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Vocabulary with ID 'abc123' not found",
    "status": 404,
    "timestamp": "2026-07-19T10:00:00Z",
    "request_id": "req-uuid",
    "details": {
      "vocabulary_id": "abc123"
    }
  }
}
```

**Common Error Codes:**
- `INVALID_REQUEST` (400)
- `UNAUTHORIZED` (401)
- `FORBIDDEN` (403)
- `RESOURCE_NOT_FOUND` (404)
- `CONFLICT` (409)
- `UNPROCESSABLE_ENTITY` (422)
- `RATE_LIMIT_EXCEEDED` (429)
- `INTERNAL_SERVER_ERROR` (500)

---

## Rate Limiting

**Global Limits:**
- 1,000 requests/hour per authenticated user
- 100 requests/hour per IP (unauthenticated)

**Response Headers:**
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 875
X-RateLimit-Reset: 1626690000
```

---

## Webhooks (Future)

Subscribe to events (post-MVP):
- `vocabulary.mastered` - When word reaches mastery
- `lesson.completed` - When lesson finished
- `milestone.reached` - When user hits milestones

---

## Pagination

All list endpoints support cursor-based and offset-based pagination:

**Offset Pagination:**
```
GET /lessons?limit=10&offset=20
```

**Cursor Pagination (preferred for real-time data):**
```
GET /reviews/due-today?limit=5&cursor=abc123
```

---

## Filtering & Sorting

**Filter Syntax:**
```
GET /vocabulary?frequency_rank_min=1&frequency_rank_max=1000&pos=verb
```

**Sort Syntax:**
```
GET /lessons?sort=-created_at  # Descending
GET /lessons?sort=level        # Ascending
```

---

See also:
- `ARCHITECTURE.md` - Data model & system design
- `PROJECT_STRUCTURE.md` - Directory layout & setup
- `docs/API.md` - Extended API documentation (examples, SDKs)
