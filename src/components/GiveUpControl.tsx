"use client";

import { useState } from "react";

export default function GiveUpControl({
  onConfirm,
  disabled,
}: {
  onConfirm: () => void;
  disabled?: boolean;
}) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div className="flex w-full flex-wrap items-center justify-between gap-2 rounded-md border border-orange bg-orange/10 px-3 py-2">
        <span className="text-xs text-orange">Give up? You get 0 points for this game.</span>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => setConfirming(false)}
            className="rounded border border-border px-2 py-1 font-mono text-[10px] uppercase text-text-muted transition hover:border-purple"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={disabled}
            className="rounded border border-orange px-2 py-1 font-mono text-[10px] uppercase text-orange transition hover:bg-orange/20 disabled:opacity-50"
          >
            Yes, give up
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      disabled={disabled}
      className="font-mono text-[11px] uppercase text-text-muted transition hover:text-orange disabled:opacity-50"
    >
      Give up
    </button>
  );
}
