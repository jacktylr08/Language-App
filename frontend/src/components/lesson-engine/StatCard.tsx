export function StatCard({
  label,
  value,
  color,
  delay,
}: {
  label: string;
  value: string;
  color: string;
  delay: string;
}) {
  return (
    <div
      className="bg-white dark:bg-stone-800 rounded-2xl p-4 border border-stone-200 dark:border-stone-700 animate-pop"
      style={{ animationDelay: delay, animationFillMode: 'backwards' }}
    >
      <p className={`font-display text-3xl font-black ${color}`}>{value}</p>
      <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">{label}</p>
    </div>
  );
}
