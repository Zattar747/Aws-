import Image from "next/image";
import Link from "next/link";

const games = [
  {
    slug: "wordle",
    name: "AWS Wordle",
    description: "Guess the 5-letter tech word in 6 tries.",
  },
  {
    slug: "trivia",
    name: "AWS Trivia",
    description: "Pick a difficulty and test your AWS knowledge, one question at a time.",
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
            Games from the <span className="text-purple-light">AWS Student Builder Club.</span>
          </h1>
          <p className="max-w-xl text-text-muted">
            A small collection of AWS-themed games from the club at MAHE Dubai. Jump straight in,
            no sign-up needed.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-5 py-14">
        <h2 className="mb-6 font-mono text-sm uppercase tracking-widest text-text-muted">
          Games
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {games.map((game) => (
            <Link key={game.slug} href={`/games/${game.slug}`}>
              <div className="flex h-full flex-col justify-center rounded-xl border border-border bg-surface p-5 transition hover:border-purple">
                <h3 className="mb-2 font-mono text-lg font-bold">{game.name}</h3>
                <p className="text-sm text-text-muted">{game.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
