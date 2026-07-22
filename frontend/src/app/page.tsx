import Link from 'next/link';
import { CourseChip } from '@/components/CourseChip';

const phases = [
  { n: '01', title: 'Foundations', desc: 'Your first words, sounds and sentences.' },
  { n: '02', title: 'Building Blocks', desc: 'The verb machine, questions, restaurant Spanish.' },
  { n: '03', title: 'Past & Future', desc: 'Tell stories. Make plans. Own every tense.' },
  { n: '04', title: 'Everyday Life', desc: 'Opinions, routines, shopping, doctors, hotels.' },
  { n: '05', title: 'Power Grammar', desc: 'Pronouns, perfect, conditional, subjunctive.' },
  { n: '06', title: 'Fluency', desc: 'Debate, storytelling, and sounding native.' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <nav className="sticky top-0 z-20 bg-paper/85 dark:bg-paper-dark/85 backdrop-blur-md border-b border-stone-200/70 dark:border-stone-800">
        <div className="max-w-6xl mx-auto px-6 py-3.5 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-2xl font-black text-brand-600 dark:text-brand-400">
              Fluenta
            </h1>
            <CourseChip />
          </div>
          <div className="flex gap-3 items-center">
            <Link
              href="/login"
              className="px-4 py-2 text-ink-soft dark:text-stone-300 hover:text-ink dark:hover:text-white font-semibold text-sm"
            >
              Sign in
            </Link>
            <Link href="/register" className="btn-primary px-5 py-2.5 text-sm">
              Get started
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6">
        {/* Hero */}
        <section className="pt-20 pb-24 text-center">
          <p className="inline-flex items-center gap-2 rounded-full bg-brand-500/10 text-brand-700 dark:text-brand-300 px-4 py-1.5 text-[13px] font-bold mb-8">
            🇪🇸 A complete 24-week course · built to actually teach
          </p>
          <h2 className="font-display font-black text-ink dark:text-white text-5xl md:text-7xl leading-[1.02] tracking-tight max-w-3xl mx-auto">
            Learn Spanish like it{' '}
            <span className="relative inline-block text-brand-600 dark:text-brand-400">
              matters
              <svg
                className="absolute -bottom-2 left-0 w-full"
                viewBox="0 0 200 12"
                fill="none"
                aria-hidden
              >
                <path
                  d="M3 9c50-6 140-6 194-3"
                  stroke="#EDA417"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </h2>
          <p className="text-lg md:text-xl text-ink-soft dark:text-stone-400 mt-7 max-w-xl mx-auto leading-relaxed">
            Lessons that explain the <em>why</em>, test what you understood, make you speak out
            loud — and adapt to every mistake you make.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register" className="btn-primary px-10 py-4 text-lg">
              Start learning — free
            </Link>
            <p className="text-sm text-stone-400 dark:text-stone-500 font-medium">
              No API keys. No subscriptions. Just Spanish.
            </p>
          </div>

          {/* Stats strip */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto">
            {[
              ['47', 'interactive lessons'],
              ['450+', 'words & phrases'],
              ['9', 'exercise types'],
              ['24', 'weeks to fluency'],
            ].map(([n, label]) => (
              <div key={label} className="surface px-4 py-5">
                <p className="font-display text-3xl font-black text-brand-600 dark:text-brand-400">
                  {n}
                </p>
                <p className="text-xs font-semibold text-ink-soft dark:text-stone-400 mt-1 uppercase tracking-wide">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="pb-24">
          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                icon: '🗣️',
                accent: 'from-sky-400 to-blue-600',
                title: 'Actually speak',
                description:
                  'Say it out loud and the app listens — real pronunciation practice with the mic, right in your browser.',
              },
              {
                icon: '🧠',
                accent: 'from-violet-400 to-purple-600',
                title: 'Adapts to you',
                description:
                  'Miss a word and it hunts you down until you own it. Smart Practice targets exactly what you’re about to forget.',
              },
              {
                icon: '📖',
                accent: 'from-saffron-400 to-terra-500',
                title: 'Explains the why',
                description:
                  'Real grammar teaching with concept checks — get it wrong and your tutor explains the reasoning, not just the answer.',
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="surface p-7 hover:shadow-card-hover hover:-translate-y-1 transition-all duration-200"
              >
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center text-[28px] bg-gradient-to-br ${feature.accent} shadow-inner ring-1 ring-black/5 mb-5`}
                >
                  <span className="drop-shadow-sm">{feature.icon}</span>
                </div>
                <h3 className="font-display text-2xl font-black text-ink dark:text-white mb-2.5">
                  {feature.title}
                </h3>
                <p className="text-ink-soft dark:text-stone-400 leading-relaxed text-[15px]">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* The path */}
        <section className="pb-28">
          <div className="text-center mb-12">
            <p className="text-xs font-extrabold uppercase tracking-[0.25em] text-brand-600 dark:text-brand-400 mb-3">
              The curriculum
            </p>
            <h3 className="font-display text-4xl md:text-5xl font-black text-ink dark:text-white">
              Six phases. One road.
            </h3>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {phases.map((phase) => (
              <div key={phase.n} className="surface p-6 flex gap-4 items-start">
                <span className="font-display text-3xl font-black text-stone-200 dark:text-stone-700 leading-none pt-0.5">
                  {phase.n}
                </span>
                <div>
                  <h4 className="font-extrabold text-ink dark:text-white">{phase.title}</h4>
                  <p className="text-sm text-ink-soft dark:text-stone-400 mt-1 leading-snug">
                    {phase.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-14">
            <Link href="/register" className="btn-primary px-10 py-4 text-lg inline-block">
              Begin phase one
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-stone-200/70 dark:border-stone-800 py-8 text-center">
        <p className="font-display text-lg font-black text-brand-600 dark:text-brand-400">Fluenta</p>
        <p className="text-xs text-stone-400 dark:text-stone-600 mt-1">
          Hasta la fluidez, siempre. 🇪🇸
        </p>
      </footer>
    </div>
  );
}
