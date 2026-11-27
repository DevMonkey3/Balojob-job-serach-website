import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { jobTrackLabels, schoolCategoryLabels } from "@/lib/format";
import { absoluteUrl } from "@/lib/site";
import { getListings } from "@/server/listings";

// /sitemap.xml: every public page, and every job that is listed right now.
// It is built when asked (the job list comes from the same shared cache as the
// pages), so a job appears here as soon as staff approve it and disappears as
// soon as it is closed. One file holds up to 50,000 addresses.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const { jobs } = await getListings();
  // Jobs are newest first; the lists changed when the newest job did.
  const newest = jobs.reduce<string | undefined>((latest, j) => (!latest || j.updatedAt > latest ? j.updatedAt : latest), undefined);

  return [
    { url: absoluteUrl("/"), lastModified: newest, changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/jobs"), lastModified: newest, changeFrequency: "daily", priority: 0.9 },
    ...Object.keys(jobTrackLabels).map((track) => ({
      url: absoluteUrl(`/jobs?track=${track}`),
      lastModified: newest,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    { url: absoluteUrl("/schools"), changeFrequency: "weekly", priority: 0.7 },
    ...Object.keys(schoolCategoryLabels).map((category) => ({
      url: absoluteUrl(`/schools?category=${category}`),
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
    { url: absoluteUrl("/register/individual"), changeFrequency: "monthly", priority: 0.4 },
    { url: absoluteUrl("/register/corporate"), changeFrequency: "monthly", priority: 0.4 },
    ...jobs.map((job) => ({
      url: absoluteUrl(`/jobs/${job.id}`),
      lastModified: job.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
