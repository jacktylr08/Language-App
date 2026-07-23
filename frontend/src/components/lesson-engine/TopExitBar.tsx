export function TopExitBar({ onExit }: { onExit: () => void }) {
  return (
    <div className="px-4 pt-4 max-w-2xl mx-auto w-full">
      <button
        onClick={onExit}
        className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 text-2xl leading-none p-1"
        aria-label="Back"
      >
        ✕
      </button>
    </div>
  );
}
