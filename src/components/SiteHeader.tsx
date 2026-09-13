import Image from "next/image";
import Link from "next/link";

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-bg/85 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
        <Link href="/" className="flex items-center gap-3">
          <div className="relative h-9 w-9 overflow-hidden rounded-lg ring-1 ring-border">
            <Image
              src="/brand/chip-logo.jpg"
              alt="AWS Student Builder Club logo"
              fill
              className="object-cover"
              priority
            />
          </div>
          <div className="leading-tight">
            <p className="font-mono text-sm font-semibold tracking-wide text-text">
              AWS BUILDER CLUB
            </p>
            <p className="text-[11px] text-text-muted">MAHE Dubai &middot; Arcade</p>
          </div>
        </Link>
        <nav className="flex items-center gap-1 font-mono text-xs">
          <Link
            href="/"
            className="rounded-md px-3 py-2 text-text-muted transition hover:bg-surface hover:text-text"
          >
            Games
          </Link>
          <Link
            href="/leaderboard"
            className="rounded-md px-3 py-2 text-text-muted transition hover:bg-surface hover:text-text"
          >
            Leaderboard
          </Link>
        </nav>
      </div>
    </header>
  );
}
