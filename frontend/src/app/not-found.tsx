import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-md p-8 surface !rounded-[28px] text-center">
        <h1 className="font-display text-3xl font-black text-brand-600 dark:text-brand-400 mb-2">
          Page not found
        </h1>
        <p className="text-stone-600 dark:text-stone-400 mb-6">
          That page doesn't exist, but your lessons do.
        </p>
        <Link href="/lessons" className="btn-primary inline-block w-full py-3.5">
          Back to lessons
        </Link>
      </div>
    </div>
  );
}
