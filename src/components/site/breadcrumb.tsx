import Link from "next/link";
import { ChevronRightIcon, HomeIcon } from "lucide-react";

/** "ホーム > 求人検索 > …". The last item is the current page (no link). */
export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="パンくずリスト">
      <ol className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        <li>
          <Link href="/" className="flex items-center gap-1 hover:text-primary">
            <HomeIcon className="size-3.5" aria-hidden />
            ホーム
          </Link>
        </li>
        {items.map((item) => (
          <li key={item.label} className="flex min-w-0 items-center gap-1">
            <ChevronRightIcon className="size-3.5 shrink-0" aria-hidden />
            {item.href ? (
              <Link href={item.href} className="hover:text-primary">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="truncate text-foreground">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
