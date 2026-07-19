# Spanish Learning App - Frontend

Evidence-based language learning interface built with React, Next.js, and Tailwind CSS.

## Quick Start

### Prerequisites
- Node.js 20+
- Backend running on `http://localhost:3001`

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment

```bash
cp .env.example .env.local
# Defaults work with local backend
```

### 3. Start Development Server

```bash
npm run dev
```

Frontend runs on `http://localhost:3000`

## Project Structure

```
src/
├── app/                 # Next.js app directory
│   ├── page.tsx        # Home page
│   ├── layout.tsx      # Root layout
│   ├── auth/           # Authentication pages
│   ├── onboarding/     # Onboarding flow
│   ├── lessons/        # Lesson pages
│   ├── practice/       # Practice pages
│   └── progress/       # Progress dashboard
├── components/         # Reusable React components
│   ├── auth/
│   ├── lesson/
│   ├── vocabulary/
│   └── shared/
├── lib/                # Utilities & helpers
│   ├── api.ts         # API client
│   ├── auth.ts        # Auth logic
│   └── hooks.ts       # Custom React hooks
├── types/             # TypeScript interfaces
├── styles/            # Global CSS
└── __tests__/         # Unit & integration tests
```

## Key Features (MVP)

### Week 5: Authentication UI
- Login page (`/login`)
- Registration page (`/register`)
- Protected routes
- JWT token management

### Week 6: Audio Player & Lessons
- Audio player with speed control
- Listening comprehension lessons
- Transcript display
- Comprehension questions

### Week 7: Vocabulary Practice
- Card stack interface
- Spaced repetition queue
- Flip animation
- Audio pronunciation

### Week 8: Stories
- Story reading interface
- Click-to-translate vocabulary
- Comprehension checks
- Reading time tracking

### Weeks 9-10: Integration
- Curriculum sequencing
- Lesson prerequisites
- Progress dashboard
- Analytics visualization

## Development

### Linting & Formatting

```bash
npm run lint
npm run format
npm run type-check
```

### Testing

```bash
npm test
npm run test:watch
npm run test:e2e  # Playwright end-to-end tests
```

### Build for Production

```bash
npm run build
npm start
```

Or Docker:
```bash
docker build -t language-app-frontend .
docker run -p 3000:3000 language-app-frontend
```

## Architecture

- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS + custom components
- **State Management**: TanStack Query (server) + Zustand (client)
- **HTTP Client**: Axios with custom middleware
- **Testing**: Jest + React Testing Library + Playwright
- **Code Quality**: ESLint + Prettier + TypeScript

## API Integration

All API calls go through `lib/api.ts`:

```typescript
import { api } from '@/lib/api';

// Fetch lessons
const { data } = await api.get('/lessons');

// Submit review
await api.post('/reviews/:id', { quality: 5 });
```

The client automatically:
- Attaches JWT token
- Refreshes token if expired
- Handles errors
- Retries on network failures

## Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

## Performance

- **Lighthouse**: Target >90 on all metrics
- **Code Splitting**: Automatic via Next.js
- **Image Optimization**: Tailwind + custom images component
- **Bundle Size**: Monitor with `npm run build`

## Troubleshooting

### Backend not connecting
Check `NEXT_PUBLIC_API_URL` in `.env.local` matches backend (default `http://localhost:3001/api/v1`)

### Port 3000 already in use
```bash
lsof -i :3000
kill -9 <PID>
# Or use different port
npm run dev -- -p 3001
```

### CSS not loading
```bash
rm -rf .next node_modules
npm install
npm run dev
```

## Next Steps

See `../IMPLEMENTATION_CHECKLIST.md` Week 5-8 for:
- Authentication flow implementation
- Audio player component
- Vocabulary review UI
- Story reading interface
- Integration with backend APIs
