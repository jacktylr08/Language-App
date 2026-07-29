import { LegalPage, Section } from '@/components/LegalPage';

export const metadata = {
  title: 'Privacy — Fluenta',
  description: 'What Fluenta collects, why, and who else sees it.',
};

/**
 * Written to be read, not to be defensible.
 *
 * The parts that matter most are the ones an honest policy can't skip: the
 * tutor sends what you say to OpenAI, and pronunciation scoring sends your
 * audio to Microsoft Azure. A learner deciding whether to talk to this app
 * deserves to know that in plain words, near the top, rather than finding
 * "trusted third-party sub-processors" in clause 9.
 */
export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy" updated="30 July 2026">
      <p className="text-lg text-ink-soft dark:text-stone-400">
        Fluenta is a language-learning app. It keeps what it needs to teach you and nothing else.
        There is no advertising, no tracking for advertising, and nothing is sold to anyone.
      </p>

      <Section heading="What we store">
        <ul className="space-y-2 list-disc pl-5">
          <li>
            <strong>Your email address and a password hash.</strong> The hash is bcrypt — your
            actual password is never stored and can&apos;t be recovered from it, by us or anyone
            else.
          </li>
          <li>
            <strong>Your learning progress.</strong> Which lessons you&apos;ve done, which words
            you know, your review schedule, your streak.
          </li>
          <li>
            <strong>What your tutor remembers.</strong> A short written summary of your strengths,
            weak spots and recent sessions, so a conversation can pick up where the last one left
            off.
          </li>
          <li>
            <strong>A device token, if you turn on practice reminders.</strong> Only if you
            explicitly allow notifications, and only to send those reminders.
          </li>
        </ul>
        <p>
          We do not collect your name, phone number, address, contacts, location or payment
          details, because the app doesn&apos;t need any of them.
        </p>
      </Section>

      <Section heading="Who else sees your data">
        <p>
          Three companies process some of it on our behalf. They are not given your email address
          or your account, only the content of the request.
        </p>
        <ul className="space-y-3 list-disc pl-5">
          <li>
            <strong>OpenAI</strong> — powers the tutor. When you talk or type to Profe, what you
            say is sent to OpenAI to generate the reply. On a voice call your audio goes to them
            directly from your device. They also receive the short learner summary described above
            so the tutor can teach at your level.
          </li>
          <li>
            <strong>Microsoft Azure</strong> — scores pronunciation. When you complete a speaking
            exercise, a few seconds of recorded audio is sent to Azure&apos;s speech service to be
            assessed, then discarded. We do not keep your recordings.
          </li>
          <li>
            <strong>Railway</strong> — hosts the database and the API in the EU.
          </li>
        </ul>
        <p>
          Everything else — lessons, exercises, reading, spaced repetition — runs on your own
          device and involves nobody.
        </p>
      </Section>

      <Section heading="What stays on your device">
        <p>
          Your progress is stored in your browser first and synced to your account second, which
          is what lets the app work offline. If you use Fluenta without an account, it stays on
          that device only and we never receive it.
        </p>
        <p>
          Sound, vibration, theme and an in-progress lesson are device-local settings and are
          never sent anywhere.
        </p>
      </Section>

      <Section heading="Deleting your account">
        <p>
          Open <strong>You → Account &amp; settings</strong> and choose Delete account. It asks for
          your password, then removes your learning data and reminder tokens, anonymises your
          email address, and invalidates every signed-in session immediately.
        </p>
        <p>
          Encrypted backups may retain a copy for up to 30 days before rotating out, which is the
          window that protects everyone against accidental loss.
        </p>
      </Section>

      <Section heading="Your rights">
        <p>
          If you&apos;re in the UK or EU, the UK GDPR and GDPR apply: you can ask for a copy of
          your data, ask us to correct it, or ask us to delete it. Deleting is built into the app,
          and for anything else email the address on the{' '}
          <a href="/support" className="font-bold text-brand-600 dark:text-brand-400 underline">
            support page
          </a>
          .
        </p>
      </Section>

      <Section heading="Children">
        <p>
          Fluenta isn&apos;t designed for children under 13, and we don&apos;t knowingly create
          accounts for them.
        </p>
      </Section>

      <Section heading="Changes">
        <p>
          If this policy changes in a way that affects what we collect or who sees it, we&apos;ll
          say so in the app rather than quietly editing this page.
        </p>
      </Section>
    </LegalPage>
  );
}
