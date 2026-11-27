import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { siteIndexable, siteUrl } from "@/lib/site";

// /robots.txt. Public pages may be crawled; the members' areas and the API
// are not worth a crawler's time (they redirect to the login page anyway).
//
// The staff console is deliberately NOT listed here: robots.txt is public,
// and naming the console's address in it would tell everyone where it is.
// Its pages carry "noindex" themselves.
export default async function robots(): Promise<MetadataRoute.Robots> {
  // Read the address when asked, not when the site was built.
  await connection();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/mypage", "/employer", "/profile", "/corporate/", "/logout"],
    },
    // On a temporary address (see siteIndexable) every page says "noindex",
    // so there is no sitemap to advertise.
    ...(siteIndexable() ? { sitemap: `${siteUrl()}/sitemap.xml` } : {}),
  };
}
