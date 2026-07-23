import { useMemo } from 'react';

export function MatchPairsExercise({
  pairs,
  matched,
  selection,
  shake,
  onTap,
}: {
  pairs: Array<{ es: string; en: string }>;
  matched: Set<string>;
  selection: { side: 'es' | 'en'; value: string } | null;
  shake: string | null;
  onTap: (side: 'es' | 'en', value: string, pairKey: string) => void;
}) {
  // Spanish column keeps generation order; English column alphabetical so
  // the two sides never line up.
  const esCol = useMemo(() => [...pairs], [pairs]);
  const enCol = useMemo(
    () => [...pairs].map((p) => p.en).sort((a, b) => a.localeCompare(b)),
    [pairs]
  );

  const btnClass = (side: 'es' | 'en', value: string, pairKey: string) => {
    const base = 'w-full px-3 py-4 font-semibold text-center ';
    if (matched.has(pairKey)) {
      return base + 'option-tile option-tile-correct pointer-events-none opacity-50';
    }
    if (shake === value) {
      return base + 'option-tile option-tile-wrong animate-shake';
    }
    if (selection && selection.side === side && selection.value === value) {
      return (
        base +
        'option-tile !border-sky-400 !bg-sky-50 dark:!bg-sky-900/30 !text-sky-700 dark:!text-sky-300'
      );
    }
    return base + 'option-tile';
  };

  return (
    <div className="flex-1 flex flex-col justify-center">
      <p className="text-center text-sm font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-6">
        Match the pairs
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-3 content-start">
          {esCol.map((p) => (
            <button key={p.es} onClick={() => onTap('es', p.es, p.es)} className={btnClass('es', p.es, p.es)}>
              {p.es}
            </button>
          ))}
        </div>
        <div className="grid gap-3 content-start">
          {enCol.map((en) => {
            const pair = pairs.find((p) => p.en === en)!;
            return (
              <button key={en} onClick={() => onTap('en', en, pair.es)} className={btnClass('en', en, pair.es)}>
                {en}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
