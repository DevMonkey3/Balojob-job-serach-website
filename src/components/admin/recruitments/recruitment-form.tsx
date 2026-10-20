"use client";

import {
  CheckboxField,
  FieldGroup,
  HiddenField,
  SelectField,
  TextField,
  TextareaField,
} from "@/components/admin/fields";
import { FormShell } from "@/components/admin/form-shell";
import { saveRecruitmentAction } from "@/server/admin/recruitments-actions";
import type { RecruitmentDetail } from "@/server/admin/recruitments";

export type RecruitmentFormOptions = { faculties: string[]; departments: string[]; schoolGenders: string[] };

// BHALO156 生徒募集情報. `recruitment` is null when adding; `defaultMemberNo`
// pre-fills the school when coming from its edit page.
export function RecruitmentForm({
  recruitment: r,
  options,
  defaultMemberNo,
}: {
  recruitment: RecruitmentDetail | null;
  options: RecruitmentFormOptions;
  defaultMemberNo?: string;
}) {
  // A value that was later removed from the master must stay selectable, or saving would clear it.
  const schoolGenders =
    r?.schoolGender && !options.schoolGenders.includes(r.schoolGender)
      ? [...options.schoolGenders, r.schoolGender]
      : options.schoolGenders;

  return (
    <FormShell action={saveRecruitmentAction} cancelHref="/admin/recruitments" submitLabel={r ? "更新" : "登録"}>
      {r && <HiddenField name="id" value={r.id} />}

      <FieldGroup title="生徒募集情報" screenId="BHALO156">
        {r ? (
          <>
            <TextField name="_memberNo" label="法人会員番号" defaultValue={r.memberNo} readOnly />
            <TextField name="_recruitmentNo" label="募集番号" defaultValue={r.recruitmentNo} readOnly />
            <TextField name="_school" label="学校名" defaultValue={r.schoolName} readOnly span={2} />
          </>
        ) : (
          <TextField
            name="memberNo"
            label="法人会員番号"
            required
            maxLength={12}
            defaultValue={defaultMemberNo}
            placeholder="20で始まる12桁"
            hint="登録済みの学校の法人会員番号。募集番号はその学校の最大値＋1で自動採番されます。"
            span={2}
          />
        )}

        <TextField name="faculty" label="学部" list={options.faculties} defaultValue={r?.faculty} maxLength={120} />
        <TextField name="department" label="学科" list={options.departments} defaultValue={r?.department} maxLength={120} />
        <SelectField name="schoolGender" label="学校種類" options={schoolGenders} defaultValue={r?.schoolGender} />
        <TextField name="location" label="所在地" defaultValue={r?.location} maxLength={120} />
        <TextField name="capacity" label="募集人数" type="number" suffix="人" defaultValue={r?.capacity} min={0} />
        <TextField name="annualTuition" label="学費" type="number" suffix="円/年" defaultValue={r?.annualTuition} min={0} />
        <TextField name="contactPerson" label="担当者" defaultValue={r?.contactPerson} maxLength={80} />
        <TextField name="contactEmail" label="メールアドレス" type="email" defaultValue={r?.contactEmail} maxLength={254} />
        <TextareaField name="notes" label="特記事項" defaultValue={r?.notes} rows={4} maxLength={300} span={2} />
        <CheckboxField
          name="isActive"
          label="アクティブ"
          description="オフにするとサイトの検索結果に表示されません。"
          defaultChecked={r ? r.isActive : true}
        />
      </FieldGroup>
    </FormShell>
  );
}
