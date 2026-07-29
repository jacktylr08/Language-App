import { LegalPage, Section } from '@/components/LegalPage';

export const metadata = {
  title: 'Terms — Fluenta',
  description: 'The agreement for using Fluenta.',
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of use" updated="30 July 2026">
      <p className="text-lg text-ink-soft dark:text-stone-400">
        Short version: use Fluenta to learn a language, don&apos;t abuse the tutor, and understand
        that it&apos;s software rather than a qualified teacher.
      </p>

      <Section heading="Your account">
        <p>
          You need to be 13 or older. Keep your password to yourself — anyone with it can reach
          your account. One account per person; the tutor adapts to one learner, so sharing an
          account makes it worse at its job for both of you.
        </p>
      </Section>

      <Section heading="The tutor">
        <p>
          Profe is a language model, not a person and not a qualified teacher. It is very good at
          conversation practice and usually right about grammar, but it can be confidently wrong.
          Treat corrections as a well-informed opinion rather than an authority, and don&apos;t
          rely on it for anything that isn&apos;t language learning — it isn&apos;t a source of
          medical, legal, financial or safety advice, whatever it happens to say.
        </p>
        <p>
          Live voice conversation costs real money per minute to run. There are daily limits per
          learner to keep the app sustainable. If you hit one, text practice and the whole course
          still work, and it resets the next day.
        </p>
      </Section>

      <Section heading="Fair use">
        <p>Please don&apos;t:</p>
        <ul className="space-y-2 list-disc pl-5">
          <li>use automated tools to hammer the tutor or the API</li>
          <li>try to extract the underlying model, prompts or course content in bulk</li>
          <li>use the tutor to generate material unrelated to language learning</li>
          <li>attempt to reach other people&apos;s accounts or data</li>
        </ul>
        <p>
          We may suspend an account doing any of these. If it looks like a mistake rather than
          abuse, we&apos;ll ask first.
        </p>
      </Section>

      <Section heading="Content">
        <p>
          The course — lessons, exercises, reading passages, dialogues — is ours. Learn from it
          freely; please don&apos;t republish it as your own.
        </p>
        <p>
          Anything you write or say in the app stays yours. We only process it to run the app and
          teach you, as described in the{' '}
          <a href="/privacy" className="font-bold text-brand-600 dark:text-brand-400 underline">
            privacy policy
          </a>
          .
        </p>
      </Section>

      <Section heading="Availability">
        <p>
          Fluenta is provided as-is. We back the database up daily and take losing your progress
          seriously, but we can&apos;t promise the app is never down, and features may change as it
          develops. Your progress is stored on your device as well as on the server, which is the
          main reason an outage shouldn&apos;t cost you anything.
        </p>
      </Section>

      <Section heading="Ending it">
        <p>
          You can delete your account at any time from{' '}
          <strong>You → Account &amp; settings</strong>. No notice, no email exchange, no retention
          dark patterns.
        </p>
      </Section>

      <Section heading="Law">
        <p>
          These terms are governed by the law of England and Wales. Nothing here removes rights you
          have as a consumer that can&apos;t legally be removed.
        </p>
      </Section>
    </LegalPage>
  );
}
