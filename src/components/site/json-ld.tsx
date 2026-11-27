import { jobTitle, salaryText } from "@/components/site/job-card";
import { SITE_NAME, SITE_NAME_JA, SITE_OPERATOR, absoluteUrl, siteUrl } from "@/lib/site";
import type { JobDetail } from "@/server/listings";

// Structured data (JSON-LD): the same facts the page shows, in the form search
// engines read. JobPosting is what makes a job eligible for the Google for
// Jobs box; Google's rules for it are at
// https://developers.google.com/search/docs/appearance/structured-data/job-posting
//
// Rules kept here:
//   - only what is visible on the page goes in (no hidden extras);
//   - JobPosting is rendered on the job's own page only, never on a list;
//   - a closed or unapproved job has no page (404), so it has no JobPosting.

/** One <script type="application/ld+json">. "<" is escaped so text can never close the tag. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const PREFECTURE = /^(北海道|東京都|(?:京都|大阪)府|[^\s　]{2,3}県)/;

/** "神奈川県横浜市" -> region 神奈川県, locality 横浜市. Country is always Japan. */
function postalAddress(location: string) {
  const text = location.trim();
  const region = text.match(PREFECTURE)?.[1];
  const rest = (region ? text.slice(region.length) : text).trim();
  return {
    "@type": "PostalAddress",
    addressCountry: "JP",
    ...(region ? { addressRegion: region } : {}),
    ...(rest ? { addressLocality: rest } : {}),
  };
}

// Google's fixed list: FULL_TIME, PART_TIME, CONTRACTOR, TEMPORARY, INTERN …
// Anything else the company typed is left out rather than guessed.
const EMPLOYMENT_TYPES: [RegExp, string][] = [
  [/正社員|正規/, "FULL_TIME"],
  [/契約/, "CONTRACTOR"],
  [/パート|アルバイト/, "PART_TIME"],
  [/派遣/, "TEMPORARY"],
  [/インターン/, "INTERN"],
];

/** The 募集要項 as simple HTML, which is the form Google asks for. */
function descriptionHtml(job: JobDetail) {
  const rows: [string, string][] = [
    ["仕事内容", job.description],
    ["職種", [job.jobType, job.workName].filter(Boolean).join("／")],
    ["在留資格", job.category],
    ["業種", job.industry],
    ["雇用形態", job.employmentType],
    ["勤務地", job.location],
    ["勤務時間", [job.hours, job.breakTime && `休憩 ${job.breakTime}`].filter(Boolean).join("　")],
    ["時間外労働", job.overtime],
    ["勤務日数", job.weeklyWorkDays],
    ["休日", job.holidays],
    ["給与", job.salary === null ? "" : salaryText(job.salary)],
    ["通勤手当", job.commute],
    ["加入保険", job.insurance.join("・")],
    ["日本語レベル", job.japaneseLevel],
    ["特徴", job.features],
  ];
  return rows
    .filter(([, value]) => value)
    .map(([label, value]) => `<p><strong>${label}</strong><br>${escapeHtml(value).replace(/\r?\n/g, "<br>")}</p>`)
    .join("");
}

export function JobPostingJsonLd({ job }: { job: JobDetail }) {
  const employmentType = EMPLOYMENT_TYPES.find(([pattern]) => pattern.test(job.employmentType))?.[1];
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "JobPosting",
        title: jobTitle(job),
        description: descriptionHtml(job),
        datePosted: job.postedAt,
        url: absoluteUrl(`/jobs/${job.id}`),
        identifier: {
          "@type": "PropertyValue",
          name: SITE_NAME,
          value: `${job.corporateNo}-${String(job.jobNo).padStart(2, "0")}`,
        },
        hiringOrganization: { "@type": "Organization", name: job.company },
        jobLocation: { "@type": "Place", address: postalAddress(job.location) },
        ...(employmentType ? { employmentType } : {}),
        ...(job.industry ? { industry: job.industry } : {}),
        ...(job.hours ? { workHours: job.hours } : {}),
        ...(job.salary === null
          ? {}
          : {
              baseSalary: {
                "@type": "MonetaryAmount",
                currency: "JPY",
                value: { "@type": "QuantitativeValue", value: job.salary, unitText: "MONTH" },
              },
            }),
      }}
    />
  );
}

/** The trail shown above a page: Google shows it in place of the raw address. */
export function BreadcrumbJsonLd({ items }: { items: { label: string; path: string }[] }) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [{ label: "ホーム", path: "/" }, ...items].map((item, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: item.label,
          item: absoluteUrl(item.path),
        })),
      }}
    />
  );
}

/** Who runs the site and what it is called. Rendered once, on the top page. */
export function SiteJsonLd() {
  const url = siteUrl();
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Organization",
            "@id": `${url}/#organization`,
            name: `${SITE_NAME}（${SITE_NAME_JA}）`,
            legalName: SITE_OPERATOR,
            url: `${url}/`,
            logo: absoluteUrl("/apple-icon.png"),
          },
          {
            "@type": "WebSite",
            "@id": `${url}/#website`,
            name: SITE_NAME,
            alternateName: SITE_NAME_JA,
            url: `${url}/`,
            inLanguage: "ja",
            publisher: { "@id": `${url}/#organization` },
          },
        ],
      }}
    />
  );
}
