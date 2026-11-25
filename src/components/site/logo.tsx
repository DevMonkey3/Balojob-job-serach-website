import Link from "next/link";
import { cn } from "@/lib/utils";

/** The mark (same drawing as src/app/icon.svg) and the wordmark. */
export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("flex shrink-0 items-center gap-2", className)} aria-label="Bhalojob ホーム">
      <span className="flex size-8 items-center justify-center rounded-[0.5rem] bg-gradient-to-br from-[#F26A1B] to-[#D9261C]" aria-hidden>
        <svg viewBox="0 0 64 64" className="size-8">
          <path
            fill="#fff"
            fillRule="evenodd"
            d="M15 10h17c10 0 16 5 16 13 0 5-3 8.5-7 10 5 1.5 9 5.5 9 11 0 8-7 13-17 13H15Zm10 8v11h7c4 0 7-2 7-5.5S36 18 32 18Zm0 19v12h8c5 0 8-2.5 8-6s-3-6-8-6Z"
          />
        </svg>
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-[1.35rem] font-extrabold tracking-tight">
          <span className="text-brand-orange">Bhalo</span>
          <span className="text-brand-red">job</span>
        </span>
        <span className="mt-0.5 hidden text-[10px] tracking-widest text-muted-foreground sm:block">バロジョブ</span>
      </span>
    </Link>
  );
}
