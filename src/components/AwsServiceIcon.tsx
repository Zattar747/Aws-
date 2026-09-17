import type { TriviaIcon } from "@/lib/trivia-questions";

/**
 * Simple original illustrations standing in for each service's real icon —
 * not AWS's actual trademarked artwork. If the club provides the official
 * icon files later, drop them under public/ and swap the <svg> below for an
 * <Image>.
 */
function IconGlyph({ icon }: { icon: TriviaIcon }) {
  const common = { width: 40, height: 40, fill: "none", stroke: "white", strokeWidth: 2 };
  switch (icon) {
    case "s3":
      return (
        <svg viewBox="0 0 40 40" {...common}>
          <path
            d="M10 12 L30 12 L27 30 A9 3 0 0 1 13 30 Z"
            fill="white"
            fillOpacity={0.15}
            strokeLinejoin="round"
          />
          <path d="M9 12 Q20 17 31 12" strokeLinecap="round" />
        </svg>
      );
    case "ec2":
      return (
        <svg viewBox="0 0 40 40" {...common}>
          <rect x="9" y="8" width="22" height="24" rx="2" fill="white" fillOpacity={0.15} />
          <line x1="13" y1="14" x2="27" y2="14" strokeLinecap="round" />
          <line x1="13" y1="20" x2="27" y2="20" strokeLinecap="round" />
          <line x1="13" y1="26" x2="21" y2="26" strokeLinecap="round" />
        </svg>
      );
    case "lambda":
      return (
        <svg viewBox="0 0 40 40" {...common}>
          <circle cx="20" cy="20" r="14" fill="white" fillOpacity={0.15} />
          <path d="M17 10 L11 20 L16 20 L13 30 L27 17 L20 17 L23 10 Z" fill="white" />
        </svg>
      );
    case "rds":
      return (
        <svg viewBox="0 0 40 40" {...common}>
          <ellipse cx="20" cy="12" rx="11" ry="4" fill="white" fillOpacity={0.25} />
          <path d="M9 12 L9 28 A11 4 0 0 0 31 28 L31 12" fill="white" fillOpacity={0.1} />
          <ellipse cx="20" cy="28" rx="11" ry="4" />
        </svg>
      );
    case "route53":
      return (
        <svg viewBox="0 0 40 40" {...common}>
          <circle cx="18" cy="20" r="11" fill="white" fillOpacity={0.15} />
          <ellipse cx="18" cy="20" rx="4.5" ry="11" />
          <line x1="7" y1="20" x2="29" y2="20" />
          <path d="M27 10 Q34 14 34 20 Q34 26 27 30" strokeLinecap="round" />
        </svg>
      );
  }
}

export default function AwsServiceIcon({ icon }: { icon: TriviaIcon }) {
  return (
    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-orange">
      <IconGlyph icon={icon} />
    </div>
  );
}
