import type { Metadata } from "next";
import Link from "next/link";
import { CircleCheckIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "登録完了", robots: { index: false } };

// The corporate and school My Pages (BHALO300 / BHALO500) are not designed yet.
export default function CorporateCompletePage() {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <CircleCheckIcon className="size-12 text-primary" aria-hidden />
      <h1 className="text-2xl font-bold">登録が完了しました</h1>
      <p className="text-muted-foreground">Registration complete. 法人マイページは現在準備中です。</p>
      <Link href="/" className={buttonVariants({ variant: "outline" })}>
        トップへ戻る
      </Link>
    </div>
  );
}
