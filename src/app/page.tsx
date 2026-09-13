import Image from "next/image";
import Link from "next/link";

const games = [
  {
    slug: "wordle",
    name: "AWS Wordle",
    description: "Guess the 5-letter word in 6 tries. Compete for the fastest, fewest-guess solves.",
    prize: "Starter prize tier",
  },
  {
    slug: "two-truths",
    name: "Two Truths & a Lie",
    description: "Three statements, one is false. Spot the lie to score points.",
    prize: "Starter prize tier",
  },
  {
    slug: "memory",
    name: "Memory Match",
    description: "Flip cards to find every pair. Play solo or head-to-head with a friend.",
    prize: "Bigger prize tier",
  },
  {
    slug: "quiz",
    name: "AWS Trivia",
    description: "Ten quick multiple-choice questions about AWS. Faster correct answers score more points.",
    prize: "Bigger prize tier",
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <section className="border-b border-border px-5 py-16">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 text-center">
          <div className="relative h-20 w-20 overflow-hidden rounded-2xl ring-1 ring-border">
            <Image
              src="/brand/chip-logo.jpg"
              alt="AWS Student Builder Club logo"
              fill
              className="object-cover"
              priority
            />
          </div>
          <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
            Play games. Climb the leaderboard.{" "}
            <span className="text-purple-light">Win prizes.</span>
          </h1>
          <p className="max-w-xl text-text-muted">
            A collection of interactive games from the AWS Student Builder Club, MAHE Dubai.
            Enter your name once, play as many games as you want, and every game adds to your
            total points.
          </p>
          <Link
            href="/leaderboard"
            className="rounded-md bg-purple px-6 py-3 font-mono font-semibold text-white transition hover:bg-purple-dark"
          >
            View Arcade Leaderboard
          </Link>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-5 py-14">
        <h2 className="mb-6 font-mono text-sm uppercase tracking-widest text-text-muted">
          Games
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {games.map((game) => (
            <Link key={game.slug} href={`/games/${game.slug}`}>
              <div className="flex h-full flex-col justify-between rounded-xl border border-border bg-surface p-5 transition hover:border-purple">
                <div>
                  <h3 className="mb-2 font-mono text-lg font-bold">{game.name}</h3>
                  <p className="text-sm text-text-muted">{game.description}</p>
                </div>
                <p className="mt-4 font-mono text-xs text-orange">{game.prize}</p>
              </div>
            </Link>
          ))}
          <div className="flex h-full flex-col justify-center rounded-xl border border-dashed border-border p-5 text-center opacity-60">
            <p className="font-mono text-sm text-text-muted">More games coming soon</p>
          </div>
        </div>
      </section>
    </div>
  );
}
