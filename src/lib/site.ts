// The site's public address, for everything a search engine or a chat app
// reads from outside: canonical links, share previews, robots.txt, the sitemap
// and structured data.
//
// SITE_URL comes from DOMAIN (docker-compose.yml passes https://<DOMAIN> both
// to the build and to the running app). On a developer's PC it is unset and
// the site describes itself as localhost.

export const SITE_NAME = "Bhalojob";
export const SITE_NAME_JA = "バロジョブ";
export const SITE_OPERATOR = "ジャパンバングラブリッジ株式会社";
/** The top page's title, and the title of any page that sets none. */
export const SITE_TITLE = "Bhalojob（バロジョブ）| 外国人材と企業・学校をつなぐマッチングサイト";
export const SITE_DESCRIPTION =
  "バロジョブは、より速く、より簡単に世界中の優秀な人材と企業・学校をマッチングするお手伝いをします。技人国・特定技能・育成就労の求人と、大学・専門学校・日本語学校への留学情報。";

const FALLBACK = "http://localhost:3000";

/** "https://example.com", never with a trailing slash. */
export function siteUrl(): string {
  const raw = (process.env.SITE_URL ?? "").trim().replace(/\/+$/, "");
  return /^https?:\/\/[A-Za-z0-9.-]+(:\d+)?$/.test(raw) ? raw : FALLBACK;
}

/**
 * False on an address that is only a stand-in: localhost, a bare IP, or a
 * name made from an IP (sslip.io, nip.io). Pages there carry "noindex", so
 * Google does not list a temporary address that stops working the day the
 * real domain is connected. A real domain is indexable with no setting.
 */
export function siteIndexable(): boolean {
  const host = new URL(siteUrl()).hostname;
  if (host === "localhost" || /^[\d.]+$/.test(host)) return false;
  return !/\.(sslip\.io|nip\.io|localhost|test|invalid|example)$/.test(host);
}

/** "/jobs/12" -> "https://example.com/jobs/12". */
export const absoluteUrl = (path: string) => new URL(path, `${siteUrl()}/`).toString();
