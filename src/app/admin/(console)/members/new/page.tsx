import { Suspense } from "react";
import { MemberForm } from "@/components/admin/members/member-form";
import { PageHeader } from "@/components/admin/page-header";
import { TableSkeleton } from "@/components/admin/status";
import { requireStaff } from "@/server/auth/staff";
import { encryptionConfigured } from "@/server/crypto";
import { getOptionLabels } from "@/server/admin/options";

// BHALO806 新規個人会員追加
export default function NewMemberPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        screenId="BHALO806"
        title="新規個人会員の追加"
        titleEn="New individual member"
        description="登録後に言語スキル・学歴などの明細を編集画面で入力できます。"
      />
      <Suspense fallback={<TableSkeleton />}>
        <NewMemberForm />
      </Suspense>
    </div>
  );
}

async function NewMemberForm() {
  await requireStaff("edit");
  const [genders, countries, languages, visas, dominantHands] = await Promise.all([
    getOptionLabels("gender"),
    getOptionLabels("country"),
    getOptionLabels("language"),
    getOptionLabels("visa"),
    getOptionLabels("dominant_hand"),
  ]);
  return (
    <MemberForm
      member={null}
      options={{ genders, countries, languages, visas, dominantHands }}
      encryptionReady={encryptionConfigured()}
    />
  );
}
