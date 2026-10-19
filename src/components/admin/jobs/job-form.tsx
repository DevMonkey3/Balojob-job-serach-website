"use client";

import {
  CheckboxField,
  FieldGroup,
  HiddenField,
  RadioField,
  TextField,
  TextareaField,
} from "@/components/admin/fields";
import { FormShell } from "@/components/admin/form-shell";
import { trackOptions } from "@/lib/admin/labels";
import type { ActionState } from "@/server/admin/form";
import { saveJobAction } from "@/server/admin/jobs-actions";
import type { JobDetail } from "@/server/admin/jobs";

export type JobFormOptions = { industries: string[]; jobTypes: string[] };

// BHALO802 新規求人追加編集. `job` is null when adding; `defaultMemberNo` prefills
// the company when the form is opened from the company's edit screen.
// The employer variant (BHALO116) posts for the signed-in company, so there is
// no 法人会員番号 input, and every save goes to staff review.
export function JobForm({
  job,
  options,
  defaultMemberNo,
  action,
  cancelHref,
  variant,
}: {
  job: JobDetail | null;
  options: JobFormOptions;
  defaultMemberNo?: string;
  /** Defaults to the console action. */
  action?: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  /** Defaults to the console list. */
  cancelHref?: string;
  variant?: "employer";
}) {
  const employer = variant === "employer";
  const submitLabel = employer ? (job ? "更新して再審査" : "審査に出す") : job ? "更新" : "登録";
  return (
    <FormShell action={action ?? saveJobAction} cancelHref={cancelHref ?? "/admin/jobs"} submitLabel={submitLabel}>
      {job && <HiddenField name="id" value={job.id} />}

      <FieldGroup title="求人情報" screenId={employer ? "BHALO116" : "BHALO802"}>
        {job && !employer && <TextField name="_memberNo" label="法人会員番号" defaultValue={job.memberNo} readOnly />}
        {job && <TextField name="_jobNo" label="求人番号" defaultValue={job.jobNo} readOnly />}
        {job && <TextField name="_company" label="会社名" defaultValue={job.companyName} readOnly span={employer ? 1 : 2} />}
        {!job && !employer && (
          <TextField
            name="memberNo"
            label="法人会員番号"
            required
            defaultValue={defaultMemberNo}
            maxLength={12}
            placeholder="20で始まる12桁"
            hint="登録済みの法人会員番号。求人番号はその会社の最大値＋1で自動採番されます。"
            span={2}
          />
        )}

        <RadioField name="track" label="種別" options={trackOptions} defaultValue={job?.track} required span={2} />
        <TextField name="industry" label="業種" list={options.industries} defaultValue={job?.industry} maxLength={120} />
        <TextField name="jobType" label="職種" list={options.jobTypes} defaultValue={job?.jobType} maxLength={120} />
        <TextField name="workName" label="作業名" defaultValue={job?.workName} maxLength={120} />
        <TextField name="employmentType" label="雇用形態" defaultValue={job?.employmentType} maxLength={120} />
        <TextareaField name="description" label="業務内容" defaultValue={job?.description} rows={4} maxLength={1000} span={2} />
        <TextField name="location" label="勤務地" defaultValue={job?.location} maxLength={120} span={2} />
        <TextField name="hoursFrom" label="勤務時間 FROM" type="time" defaultValue={job?.hoursFrom} />
        <TextField name="hoursTo" label="勤務時間 TO" type="time" defaultValue={job?.hoursTo} />
        <TextField name="holidays" label="休日" defaultValue={job?.holidays} maxLength={120} />
        <TextField name="monthlySalary" label="給与" type="number" suffix="円/月" defaultValue={job?.monthlySalary} min={0} />
        <TextField name="contactPerson" label="担当者" defaultValue={job?.contactPerson} maxLength={80} />
        <TextField name="contactEmail" label="メールアドレス" type="email" defaultValue={job?.contactEmail} maxLength={254} />
        <TextareaField name="features" label="会社の特長" defaultValue={job?.features} rows={4} maxLength={1000} span={2} />
        <CheckboxField
          name="isActive"
          label={employer ? "公開する" : "アクティブ"}
          description={employer ? "オフにすると非公開（検索結果に出ません）" : "オフにするとサイトの検索結果に表示されません。"}
          defaultChecked={job ? job.isActive : true}
        />
      </FieldGroup>

      {employer && (
        <p className="-mt-2 rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          登録・変更した内容はスタッフの審査後に掲載されます。
        </p>
      )}
    </FormShell>
  );
}
