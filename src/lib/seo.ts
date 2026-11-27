import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/site";

// What a public page tells search engines and chat apps about itself, in one
// place so every page says it the same way:
//   - the canonical address (one address per page, whatever was added to the
//     URL: ?next=, tracking parameters, an unknown filter);
//   - the share preview (Open Graph, which LINE, Facebook, Slack and X read).
//
// A page that sets `openGraph` replaces the whole block from the root layout,
// image included, so the site name, the language and the preview image
// (src/app/opengraph-image.png, 1200 x 630) are repeated here.

const SHARE_IMAGE = {
  url: "/opengraph-image.png",
  width: 1200,
  height: 630,
  alt: "Bhalojob（バロジョブ）: 日本で働く。日本で学ぶ。",
};

type PageMeta = {
  /** Without the site name: the root layout's template adds " | Bhalojob". */
  title?: string;
  description?: string;
  /** The page's own address, e.g. "/jobs?track=ssw". */
  path: string;
  /** Title of the share preview when the page has no title of its own (the top page). */
  shareTitle?: string;
};

export function pageMeta({ title, description, path, shareTitle }: PageMeta): Metadata {
  const ogTitle = title ? `${title} | ${SITE_NAME}` : shareTitle;
  return {
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "ja_JP",
      url: path,
      ...(ogTitle ? { title: ogTitle } : {}),
      ...(description ? { description } : {}),
      images: [SHARE_IMAGE],
    },
    twitter: { card: "summary_large_image", images: [SHARE_IMAGE] },
  };
}
