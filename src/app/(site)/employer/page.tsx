import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PlusIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CorporationForm } from "@/components/admin/corporations/corporation-form";
import { Flash } from "@/components/admin/flash";
import { PageHeader } from "@/components/admin/page-header";
import { param, type SearchParams } from "@/components/admin/pagination";
import { TableSkeleton } from "@/components/admin/status";
import { requireEmployer } from "@/server/auth/member";
import { getOptionLabels } from "@/server/admin/options";
import { getMyCompany } from "@/server/member/employer";
import { saveMyCompanyAction } from "@/server/member/employer-actions";

export const metadata: Metadata = { title: "企業情報", robots: { index: false } };

type Props = { searchParams: Promise<SearchParams> };

// BHALO111–114 企業情報: the signed-in company's own profile.
export default function EmployerHomePage({ searchParams }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<TableSkeleton />}>
        <CompanyInfo searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function CompanyInfo({ searchParams }: Props) {
  const m = await requireEmployer("/employer");
  const [sp, company, industries] = await Promise.all([
    searchParams,
    getMyCompany(BigInt(m.corporationId)),
    getOptionLabels("industry"),
  ]);
  if (!company) notFound();

  return (
    <>
      <PageHeader
        screenId="BHALO111"
        title="企業情報"
        titleEn="Company profile"
        description={`${company.name} / 法人会員番号 ${company.memberNo}`}
      />
      {param(sp, "welcome") === "1" && <WelcomeCard />}
      <Flash saved={param(sp, "saved")} />
      <CorporationForm
        kind="company"
        corporation={company}
        options={{ industries }}
        variant="employer"
        action={saveMyCompanyAction}
      />
    </>
  );
}

/** Shown once after registration (/employer?welcome=1). */
function WelcomeCard() {
  return (
    <Card role="status" className="bg-primary/5 ring-primary/20">
      <CardContent className="flex flex-wrap items-center justify-between gap-3">
        <p>会員登録ありがとうございます。企業情報を入力し、求人を登録してください。</p>
        <Link href="/employer/jobs/new" className={buttonVariants({ variant: "outline", size: "sm" })}>
          <PlusIcon />
          求人を登録する
        </Link>
      </CardContent>
    </Card>
  );
}
