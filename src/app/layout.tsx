import type { Metadata, Viewport } from "next";
import "./globals.css";

// Fonts: the system stack (globals.css). Web fonts for Japanese cost twenty
// files and ~450 KB per cold visit; the fonts every phone and PC already ship
// (Hiragino, Yu Gothic, Noto Sans CJK) render instantly and never reflow.

export const metadata: Metadata = {
  title: {
    default: "Bhalojob（バロジョブ）| 外国人材と企業・学校をつなぐマッチングサイト",
    template: "%s | Bhalojob",
  },
  description:
    "バロジョブは、より速く、より簡単に世界中の優秀な人材と企業・学校をマッチングするお手伝いをします。技人国・特定技能・技能実習の求人と、大学・専門学校・日本語学校への留学情報。",
};

export const viewport: Viewport = {
  themeColor: "#c2410c",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
