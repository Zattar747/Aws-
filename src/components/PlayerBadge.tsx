export default function PlayerBadge({
  displayName,
  totalPoints,
}: {
  displayName: string;
  totalPoints: number;
}) {
  return (
    <div className="mb-4 flex w-full items-center justify-between rounded-md border border-border bg-surface px-3 py-2 font-mono text-xs">
      <span className="text-text-muted">
        Playing as <span className="text-text">{displayName}</span>
      </span>
      <span className="text-purple-light">{totalPoints} pts total</span>
    </div>
  );
}
