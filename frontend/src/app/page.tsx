import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-sky-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      <nav className="bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-extrabold text-emerald-500">Aprende</h1>
          <div className="flex gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-semibold"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-5 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 font-bold shadow-lg shadow-emerald-500/25"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-20">
          <p className="text-6xl mb-6">🇪🇸</p>
          <h2 className="text-5xl md:text-6xl font-extrabold text-slate-900 dark:text-white mb-6 tracking-tight">
            Learn Spanish by <span className="text-emerald-500">doing</span>,
            <br className="hidden md:block" /> not just listening
          </h2>
          <p className="text-xl text-slate-600 dark:text-slate-400 mb-8 max-w-2xl mx-auto">
            Interactive lessons that teach you, test you, and adapt to what you get wrong.
            Hear it, say it, type it — and let spaced repetition make it stick.
          </p>
          <Link
            href="/register"
            className="inline-block px-10 py-4 bg-emerald-500 text-white rounded-2xl hover:bg-emerald-600 font-extrabold text-lg shadow-xl shadow-emerald-500/30 transition-all hover:scale-105"
          >
            Start Learning — Free
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-20">
          {[
            {
              icon: '🗣️',
              title: 'Actually Speak',
              description:
                'Real speaking practice: say it out loud and the app checks your pronunciation — right in your browser.',
            },
            {
              icon: '🧠',
              title: 'Adapts To You',
              description:
                'Miss a word and it comes back until you own it. Smart review sessions target exactly what you\'re about to forget.',
            },
            {
              icon: '⚡',
              title: 'Built To Stick',
              description:
                'Small teaching chunks, instant feedback, streaks and XP — engineered around how memory actually works.',
            },
          ].map((feature, i) => (
            <div
              key={i}
              className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm text-center"
            >
              <div className="text-5xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mb-3">
                {feature.title}
              </h3>
              <p className="text-slate-600 dark:text-slate-400">{feature.description}</p>
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-slate-800 p-10 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-6">
            Your path to fluency
          </h3>
          <div className="grid md:grid-cols-2 gap-x-10 gap-y-4 text-slate-600 dark:text-slate-400">
            <p>
              <strong className="text-slate-900 dark:text-white">1 · Foundation (Weeks 1–4):</strong>{' '}
              Master your first 70+ essential words through interactive drills — listening, speaking, typing and matching.
            </p>
            <p>
              <strong className="text-slate-900 dark:text-white">2 · Core Vocabulary (Weeks 5–12):</strong>{' '}
              Grow to 2,000+ words with spaced repetition tuned to your memory.
            </p>
            <p>
              <strong className="text-slate-900 dark:text-white">3 · Conversation (Month 3+):</strong>{' '}
              Put it together in real dialogues and speaking practice.
            </p>
            <p>
              <strong className="text-slate-900 dark:text-white">4 · Real Media (Month 4+):</strong>{' '}
              Watch, read and listen to real Spanish — and understand it.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
