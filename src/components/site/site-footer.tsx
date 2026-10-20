import Link from "next/link";
import { Logo } from "@/components/site/logo";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t bg-muted/40">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div className="flex flex-col gap-3">
          <Logo />
          <p className="text-sm text-muted-foreground">
            世界中の優秀な人材と、日本の企業・学校をつなぎます。
          </p>
        </div>
        <nav aria-label="会員" className="flex flex-col gap-2 text-sm">
          <span className="font-semibold">会員の方</span>
          <Link href="/register/individual" className="hover:text-primary">
            個人会員登録 (Individuals)
          </Link>
          <Link href="/register/corporate" className="hover:text-primary">
            法人会員登録 (Corporations)
          </Link>
          <Link href="/login" className="hover:text-primary">
            ログイン (Log in)
          </Link>
        </nav>
        <div className="flex flex-col gap-2 text-sm">
          <span className="font-semibold">運営会社</span>
          <span>ジャパンバングラブリッジ株式会社</span>
          <span className="text-muted-foreground">Japan Bangla Bridge Co., Ltd.</span>
        </div>
      </div>
    </footer>
  );
}
