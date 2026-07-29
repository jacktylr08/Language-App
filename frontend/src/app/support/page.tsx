import { LegalPage, Section } from '@/components/LegalPage';

export const metadata = {
  title: 'Support — Fluenta',
  description: 'Help with Fluenta, and how to get in touch.',
};

/**
 * Both app stores require a reachable support URL. Worth more than a mailto:
 * though — the three things people actually get stuck on (a forgotten
 * password, the tutor mishearing them, and a lost streak) can all be answered
 * here without anyone having to email anybody.
 */
export default function SupportPage() {
  return (
    <LegalPage title="Support" updated="30 July 2026">
      <p className="text-lg text-ink-soft dark:text-stone-400">
        Most things people get stuck on are below. If yours isn&apos;t, email{' '}
        <a
          href="mailto:hello@fluenta.app"
          className="font-bold text-brand-600 dark:text-brand-400 underline"
        >
          hello@fluenta.app
        </a>{' '}
        and a human will reply.
      </p>

      <Section heading="I've forgotten my password">
        <p>
          If you&apos;re still signed in anywhere — another browser tab, a laptop, your phone —
          open <strong>You → Account &amp; settings</strong> on that device and set a new password.
          You won&apos;t need the old one, and it applies everywhere immediately.
        </p>
        <p>
          If you&apos;re locked out of every device, email us from the address on the account and
          we&apos;ll sort it.
        </p>
      </Section>

      <Section heading="Profe keeps interrupting himself">
        <p>
          That&apos;s background noise being mistaken for you starting to speak. Two things help:
          use headphones if you have them, and if you&apos;re somewhere genuinely noisy — a café, a
          train, a house with other people in it — tap{' '}
          <strong>Somewhere noisy? Use hold-to-talk</strong> under the call controls. That switches
          the mic off entirely until you&apos;re holding the button, so nothing else can trigger it.
        </p>
      </Section>

      <Section heading="Profe can't hear me at all">
        <p>
          Check the browser has microphone permission for the site, and that no other app has the
          mic open. On iOS, a call in a home-screen app can behave differently from the same call in
          Safari — if one doesn&apos;t work, try the other.
        </p>
      </Section>

      <Section heading="I don't have time for a whole lesson">
        <p>
          You don&apos;t need one. Lessons are split into rounds of about three minutes, and each
          round is banked the moment you finish it — stop at the end of any round and the lesson
          picks up exactly there next time.
        </p>
      </Section>

      <Section heading="My streak or progress looks wrong">
        <p>
          Progress lives on your device and syncs to your account, so signing in on a new phone
          pulls everything down. If two devices disagree, open the app on both while online and
          they&apos;ll merge — the merge only ever adds, so nothing gets overwritten.
        </p>
        <p>
          Day boundaries follow your own timezone, not UTC, so a late-evening session counts for
          the day you did it.
        </p>
      </Section>

      <Section heading="Does it work offline?">
        <p>
          Yes, for everything except talking to Profe, which needs a connection by definition.
          Lessons, practice and reading all work on a plane or the Underground as long as
          you&apos;ve opened the app online at least once. Anything you do offline syncs when
          you&apos;re back.
        </p>
      </Section>

      <Section heading="Deleting my account">
        <p>
          <strong>You → Account &amp; settings → Delete account.</strong> It asks for your password,
          then removes your data immediately. There&apos;s no waiting period and nothing to email
          us about.
        </p>
      </Section>

      <Section heading="Reporting a bug">
        <p>
          Email{' '}
          <a
            href="mailto:hello@fluenta.app"
            className="font-bold text-brand-600 dark:text-brand-400 underline"
          >
            hello@fluenta.app
          </a>{' '}
          with what you were doing, what happened, and which device and browser. Screenshots help
          more than descriptions.
        </p>
      </Section>
    </LegalPage>
  );
}
