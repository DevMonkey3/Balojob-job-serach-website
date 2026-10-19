import type { Metadata } from "next";
import { Geist_Mono, Noto_Sans_JP } from "next/font/google";
import "./globals.css";

const notoSansJp = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Bhalojob（バロジョブ）| 外国人材と企業・学校をつなぐマッチングサイト",
    template: "%s | Bhalojob",
  },
  description:
    "バロジョブは、より速く、より簡単に世界中の優秀な人材と企業・学校をマッチングするお手伝いをします。技人国・特定技能・技能実習の求人と、大学・専門学校・日本語学校への留学情報。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className={`${notoSansJp.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
