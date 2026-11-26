import Link from "next/link";
import { Logo } from "@/components/site/logo";

const columns = [
  {
    title: "仕事を探す",
    links: [
      { href: "/jobs", label: "求人検索" },
      { href: "/jobs?track=engineer", label: "技人国の求人" },
      { href: "/jobs?track=ssw", label: "特定技能の求人" },
      { href: "/jobs?track=titp", label: "育成就労の求人" },
    ],
  },
  {
    title: "学校を探す",
    links: [
      { href: "/schools", label: "学校一覧" },
      { href: "/schools?category=university", label: "大学・大学院" },
      { href: "/schools?category=vocational", label: "専門学校" },
      { href: "/schools?category=language_school", label: "日本語学校" },
    ],
  },
  {
    title: "会員の方",
    links: [
      { href: "/register/individual", label: "個人会員登録（無料）" },
      { href: "/login", label: "ログイン" },
      { href: "/mypage", label: "マイページ" },
    ],
  },
  {
    title: "企業の方",
    links: [
      { href: "/register/corporate", label: "法人会員登録（無料）" },
      { href: "/login?as=employer", label: "企業ログイン" },
      { href: "/#companies", label: "求人掲載について" },
    ],
  },
];

export function SiteFooter() {
  return (
    // A light, warm footer in the brand's own tones (the cream behind the orange),
    // so the page ends softly instead of on a black block.
    <footer className="mt-auto border-t border-primary/15 bg-secondary text-foreground/80">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 lg:grid-cols-[1.3fr_3fr]">
        <div className="flex flex-col gap-4">
          <Logo />
          <p className="max-w-xs text-sm leading-relaxed text-foreground/70">
            世界中の優秀な人材と、日本の企業・学校をつなぐマッチングサイトです。
          </p>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {columns.map((col) => (
            <nav key={col.title} aria-label={col.title} className="flex flex-col gap-2.5 text-sm">
              <span className="font-bold text-secondary-foreground">{col.title}</span>
              {col.links.map((l) => (
                <Link key={l.href} href={l.href} className="text-foreground/70 transition-colors hover:text-primary hover:underline">
                  {l.label}
                </Link>
              ))}
            </nav>
          ))}
        </div>
      </div>
      <div className="border-t border-primary/15 bg-background/60">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-5 text-xs text-foreground/60 sm:flex-row sm:items-center sm:justify-between">
          <p>運営：ジャパンバングラブリッジ株式会社（Japan Bangla Bridge Co., Ltd.）</p>
          <p>© Bhalojob</p>
        </div>
      </div>
    </footer>
  );
}
