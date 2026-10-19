"use client";

import {
  CheckboxField,
  FieldGroup,
  FieldWrap,
  HiddenField,
  TextField,
  TextareaField,
} from "@/components/admin/fields";
import { FormShell } from "@/components/admin/form-shell";
import { Label } from "@/components/ui/label";
import { fmtDateTime } from "@/lib/admin/labels";
import type { CorporationKind } from "@/generated/prisma/client";
import type { ActionState } from "@/server/admin/form";
import { saveCompanyAction, saveSchoolAction } from "@/server/admin/corporations-actions";
import type { CorporationDetail } from "@/server/admin/corporations";

export type CorporationFormOptions = { industries: string[] };

/** Who is editing: staff in the console (default) or the company itself (/employer). */
export type CorporationFormVariant = "admin" | "employer";

// Wording that differs between BHALO804 (企業) and BHALO808 (学校). The
// fields come from the member-registration screens 110–114 / 151–154.
const wording = {
  company: {
    list: "/admin/companies",
    name: "会社名",
    founded: "創業",
    headcount: "従業員数",
    introduction: "企業紹介文",
    basic: "企業基本情報",
    screens: ["BHALO111", "BHALO112", "BHALO113・114"],
  },
  school: {
    list: "/admin/schools",
    name: "学校名",
    founded: "創立",
    headcount: "生徒数",
    introduction: "学校紹介文",
    basic: "学校基本情報",
    screens: ["BHALO151", "BHALO152", "BHALO153・154"],
  },
} as const;

// `corporation` is null when adding. `options` is only needed for companies (業種).
// The employer variant edits the signed-in company: the action knows the row
// (no id field), the login email is shown but not posted, and アクティブ stays
// with staff.
export function CorporationForm({
  kind,
  corporation: c,
  options,
  action,
  cancelHref,
  variant = "admin",
}: {
  kind: CorporationKind;
  corporation: CorporationDetail | null;
  options?: CorporationFormOptions;
  /** Defaults to the console action for `kind`. */
  action?: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  /** Defaults to the console list for `kind`; the employer variant has no back link unless given one. */
  cancelHref?: string;
  variant?: CorporationFormVariant;
}) {
  const t = wording[kind];
  const isCompany = kind === "company";
  const employer = variant === "employer";
  return (
    <FormShell
      action={action ?? (isCompany ? saveCompanyAction : saveSchoolAction)}
      cancelHref={cancelHref ?? (employer ? undefined : t.list)}
      submitLabel={employer ? "保存" : c ? "更新" : "登録"}
    >
      {c && !employer && <HiddenField name="id" value={c.id} />}

      <FieldGroup title={`${t.basic}1`} screenId={t.screens[0]}>
        {c && (
          <>
            <TextField name="_memberNo" label="法人会員番号" defaultValue={c.memberNo} readOnly />
            <TextField
              name="_dates"
              label="登録日 / 最終更新"
              defaultValue={`${fmtDateTime(c.createdAt)} / ${fmtDateTime(c.updatedAt)}`}
              readOnly
            />
          </>
        )}
        {employer ? (
          <TextField
            name="_email"
            label="ログインID（メールアドレス）"
            type="email"
            defaultValue={c?.email}
            readOnly
            hint="ログインIDの変更はスタッフにお問い合わせください。"
            span={2}
          />
        ) : (
          <TextField
            name="email"
            label="ログインID（メールアドレス）"
            type="email"
            required
            defaultValue={c?.email}
            maxLength={254}
            autoComplete="off"
            hint={c ? "変更すると会員のログインIDも変わります。" : "法人会員番号は登録時に自動採番されます。"}
            span={2}
          />
        )}
        <TextField name="name" label={t.name} required defaultValue={c?.name} maxLength={120} />
        <TextField name="nameKana" label="フリガナ" defaultValue={c?.nameKana} maxLength={120} />
        <TextField name="founded" label={t.founded} defaultValue={c?.founded} maxLength={50} placeholder="例：1990年4月" />
        <TextField name="representative" label="代表者" required defaultValue={c?.representative} maxLength={80} />
        {isCompany && (
          <TextField name="capitalManYen" label="資本金" type="number" suffix="万円" defaultValue={c?.capitalManYen} min={0} />
        )}
        <TextField name="headcount" label={t.headcount} type="number" suffix="人" defaultValue={c?.headcount} min={0} />
        {isCompany && (
          <TextField name="industry" label="業種" list={options?.industries ?? []} defaultValue={c?.industry} maxLength={120} />
        )}
        <TextField name="url" label="URL" type="url" defaultValue={c?.url} maxLength={200} placeholder="https://" />
      </FieldGroup>

      <FieldGroup title={`${t.basic}2`} screenId={t.screens[1]}>
        <TextField name="postalCode" label="郵便番号" defaultValue={c?.postalCode} maxLength={20} />
        <TextField name="prefecture" label="県" defaultValue={c?.prefecture} maxLength={50} />
        <TextField name="city" label="市区郡" defaultValue={c?.city} maxLength={50} />
        <TextField name="town" label="町" defaultValue={c?.town} maxLength={50} />
        <TextField name="addressLine" label="番地" defaultValue={c?.addressLine} maxLength={50} />
        <TextField name="contactPerson" label="担当者" defaultValue={c?.contactPerson} maxLength={80} />
        <TextField name="phone" label="電話番号" type="tel" defaultValue={c?.phone} maxLength={20} />
        <TextField name="contactEmail" label="メールアドレス" type="email" defaultValue={c?.contactEmail} maxLength={254} />
      </FieldGroup>

      <FieldGroup title="ロゴ・紹介文" screenId={t.screens[2]}>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label>ロゴ</Label>
          <p className="rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">
            ロゴ画像のアップロードは準備中（ファイル保存の接続後）
          </p>
        </div>
        <TextareaField name="introduction" label={t.introduction} defaultValue={c?.introduction} rows={6} maxLength={4000} span={2} />
      </FieldGroup>

      <FieldGroup title="対象種別" screenId="BHALO110">
        {/* The action reports "none checked" on the first checkbox's name. */}
        <FieldWrap name={isCompany ? "isCompany" : "isUniversity"} label="対象種別" required hint="1つ以上選択してください。" span={2}>
          <div className="flex flex-wrap gap-x-6">
            {isCompany ? (
              <>
                <CheckboxField name="isCompany" label="一般企業" defaultChecked={c ? c.isCompany : true} />
                <CheckboxField name="isSupervisingOrg" label="監理団体" defaultChecked={c?.isSupervisingOrg} />
                <CheckboxField name="isRegisteredSupportOrg" label="登録支援機関" defaultChecked={c?.isRegisteredSupportOrg} />
              </>
            ) : (
              <>
                <CheckboxField name="isUniversity" label="大学・大学院" defaultChecked={c?.isUniversity} />
                <CheckboxField name="isVocationalSchool" label="専門学校" defaultChecked={c?.isVocationalSchool} />
                <CheckboxField name="isLanguageSchool" label="日本語学校" defaultChecked={c?.isLanguageSchool} />
              </>
            )}
          </div>
        </FieldWrap>
        {!employer && (
          <CheckboxField
            name="isActive"
            label="アクティブ"
            description="オフにするとサイトの検索結果に表示されません。"
            defaultChecked={c ? c.isActive : true}
          />
        )}
      </FieldGroup>
    </FormShell>
  );
}
