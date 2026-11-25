import type { Metadata } from "next";
import Link from "next/link";
import { HomeIcon, SearchIcon } from "lucide-react";
import { Logo } from "@/components/site/logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "ページが見つかりません", robots: { index: false } };

// Every unknown address ends here, with a way back to the site.
export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-page px-4 py-20 text-center">
      <Logo />
      <div>
        <p className="text-6xl font-extrabold tracking-tight text-primary/25">404</p>
        <h1 className="mt-2 text-2xl font-bold">ページが見つかりません</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          お探しのページは移動または削除された可能性があります。
          <span className="block">The page you are looking for could not be found.</span>
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="flex h-11 items-center gap-2 rounded-lg bg-gradient-to-r from-brand-orange to-brand-red px-6 text-sm font-bold text-white shadow-sm transition-[filter] hover:brightness-110"
        >
          <HomeIcon className="size-4" aria-hidden />
          トップページへ
        </Link>
        <Link href="/jobs" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 px-6")}>
          <SearchIcon />
          求人を探す
        </Link>
      </div>
    </main>
  );
}
