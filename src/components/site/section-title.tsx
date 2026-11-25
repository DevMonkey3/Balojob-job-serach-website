import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";

/** A section heading on the public pages: Japanese title, small English line, optional "see all" link. */
export function SectionTitle({
  id,
  ja,
  en,
  icon: Icon,
  href,
  linkLabel,
}: {
  id?: string;
  ja: string;
  en?: string;
  icon?: React.ComponentType<{ className?: string }>;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4 border-b-2 border-primary/15 pb-3">
      <div className="flex items-center gap-3">
        {Icon && (
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-orange to-brand-red text-white shadow-sm">
            <Icon className="size-5" aria-hidden />
          </span>
        )}
        <div>
          <h2 id={id} className="text-xl font-bold md:text-2xl">
            {ja}
          </h2>
          {en && <p className="text-xs text-muted-foreground">{en}</p>}
        </div>
      </div>
      {href && linkLabel && (
        <Link href={href} className="flex shrink-0 items-center gap-0.5 text-sm font-semibold text-primary hover:underline">
          {linkLabel}
          <ChevronRightIcon className="size-4" aria-hidden />
        </Link>
      )}
    </div>
  );
}
