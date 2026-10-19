import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("flex items-baseline gap-2", className)} aria-label="Bhalojob ホーム">
      <span className="text-2xl font-extrabold tracking-tight">
        <span className="text-brand-orange">Bhalo</span>
        <span className="text-brand-red">job</span>
      </span>
      <span className="hidden text-xs text-muted-foreground sm:inline">バロジョブ</span>
    </Link>
  );
}
