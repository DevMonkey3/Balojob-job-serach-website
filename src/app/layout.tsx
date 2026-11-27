import type { Metadata, Viewport } from "next";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, siteIndexable, siteUrl } from "@/lib/site";
import "./globals.css";

// Fonts: the system stack (globals.css). Web fonts for Japanese cost twenty
// files and ~450 KB per cold visit; the fonts every phone and PC already ship
// (Hiragino, Yu Gothic, Noto Sans CJK) render instantly and never reflow.

// Search engines and share previews. Each public page adds its own canonical
// address and preview text with pageMeta() (src/lib/seo.ts); what is here is
// what a page gets when it says nothing. The preview image is
// opengraph-image.png in this folder.
export const metadata: Metadata = {
  // Relative addresses in metadata ("/jobs/12") are completed with this.
  metadataBase: new URL(siteUrl()),
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "ja_JP",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: { card: "summary_large_image" },
  // A temporary address (sslip.io, an IP, localhost) is kept out of Google:
  // see siteIndexable(). Pages that set their own `robots` keep theirs.
  ...(siteIndexable() ? {} : { robots: { index: false, follow: false } }),
};

export const viewport: Viewport = {
  themeColor: "#c2410c",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className="h-full antialiased" data-scroll-behavior="smooth">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
