import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800">
      <nav className="bg-white dark:bg-slate-800 shadow">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">Aprende Español</h1>
          <div className="flex gap-4">
            <Link
              href="/login"
              className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-20">
          <h2 className="text-5xl font-bold text-slate-900 dark:text-white mb-6">
            Learn Spanish That Actually Works
          </h2>
          <p className="text-xl text-slate-600 dark:text-slate-400 mb-8 max-w-2xl mx-auto">
            No gamification. No time wasting. Just evidence-based language acquisition designed to
            make you fluent.
          </p>
          <Link
            href="/register"
            className="inline-block px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-lg"
          >
            Start Learning Today
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-20">
          {[
            {
              icon: '👂',
              title: 'Learn Through Listening',
              description: 'Natural-speed audio from day one, preparing your brain for real Spanish',
            },
            {
              icon: '🧠',
              title: 'Spaced Repetition',
              description:
                'Proven SM-2 algorithm ensures words stick in your long-term memory',
            },
            {
              icon: '✨',
              title: 'No Gamification',
              description:
                'Designed to teach you Spanish, not trap you in engagement loops',
            },
          ].map((feature, i) => (
            <div
              key={i}
              className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-lg text-center"
            >
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                {feature.title}
              </h3>
              <p className="text-slate-600 dark:text-slate-400">{feature.description}</p>
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-slate-800 p-12 rounded-lg shadow-lg">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">How It Works</h3>
          <div className="space-y-4 text-slate-600 dark:text-slate-400">
            <p>
              <strong className="text-slate-900 dark:text-white">Foundation Phase (Weeks 1-4):</strong>{' '}
              Build comprehension through listening to natural Spanish with transcripts.
            </p>
            <p>
              <strong className="text-slate-900 dark:text-white">Vocabulary Acquisition (Weeks 5-12):</strong>{' '}
              Learn 2,000+ words through spaced repetition and context.
            </p>
            <p>
              <strong className="text-slate-900 dark:text-white">Conversation Practice (Month 3+):</strong>{' '}
              Start speaking with real conversation partners.
            </p>
            <p>
              <strong className="text-slate-900 dark:text-white">Real Media (Month 4+):</strong> Watch
              Spanish content, read news, and immerse yourself.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
