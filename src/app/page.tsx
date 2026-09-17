import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-5 py-16 text-center">
      <div className="relative mb-6 h-20 w-20 overflow-hidden rounded-2xl ring-1 ring-border">
        <Image
          src="/brand/chip-logo.jpg"
          alt="AWS Student Builder Club logo"
          fill
          className="object-cover"
          priority
        />
      </div>
      <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
        <span className="text-purple-light">AWS Wordle</span>
      </h1>
      <p className="mt-4 max-w-md text-text-muted">
        A game from the AWS Student Builder Club at MAHE Dubai. Guess the 5-letter tech word in 6
        tries, no sign-up needed.
      </p>
      <Link
        href="/games/wordle"
        className="mt-6 rounded-md bg-purple px-6 py-3 font-mono font-semibold text-white transition hover:bg-purple-dark"
      >
        Play Wordle
      </Link>
    </div>
  );
}
