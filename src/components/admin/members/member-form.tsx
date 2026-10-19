"use client";

import {
  CheckboxField,
  FieldGroup,
  HiddenField,
  RadioField,
  SelectField,
  TextField,
  TextareaField,
} from "@/components/admin/fields";
import { FormShell } from "@/components/admin/form-shell";
import { fmtDate, fmtDateTime, yesNoOptions } from "@/lib/admin/labels";
import { saveMemberAction } from "@/server/admin/members-actions";
import type { MemberDetail } from "@/server/admin/members";

export type MemberFormOptions = {
  genders: string[];
  countries: string[];
  languages: string[];
  visas: string[];
  dominantHands: string[];
};

/** Boolean column → yes/no radio value ("" when not answered). */
const yesNoValue = (v: boolean | null | undefined) => (v === null || v === undefined ? "" : v ? "1" : "0");

// BHALO806 新規個人会員追加編集. `member` is null when adding. The child tables
// (言語スキル, 学歴, …) are edited in their own sections below this form.
export function MemberForm({
  member,
  options,
  encryptionReady,
}: {
  member: MemberDetail | null;
  options: MemberFormOptions;
  encryptionReady: boolean;
}) {
  const resume = member?.resume;
  const hasPassport = !!resume?.passportMasked;

  return (
    <FormShell action={saveMemberAction} cancelHref="/admin/members" submitLabel={member ? "更新" : "登録"}>
      {member && <HiddenField name="id" value={member.id} />}

      <FieldGroup title="会員情報" screenId="BHALO806">
        {member && (
          <>
            <TextField name="_memberNo" label="会員番号" defaultValue={member.memberNo} readOnly />
            <TextField name="_createdAt" label="登録日" defaultValue={fmtDate(member.createdAt)} readOnly />
            <TextField name="_updatedAt" label="最終更新" defaultValue={fmtDateTime(member.updatedAt)} readOnly />
          </>
        )}
        <TextField
          name="email"
          label="ログインID（メールアドレス）"
          type="email"
          required
          defaultValue={member?.email}
          maxLength={254}
          autoComplete="off"
          hint={member ? undefined : "会員番号は登録時に自動採番されます。"}
          span={member ? 1 : 2}
        />
        <CheckboxField
          name="isActive"
          label="アクティブ"
          description="オフにすると非アクティブ会員として扱われます。"
          defaultChecked={member ? member.isActive : true}
        />
      </FieldGroup>

      <FieldGroup title="基本情報" screenId="BHALO010">
        <TextField name="fullName" label="氏名" required defaultValue={member?.fullName} maxLength={80} />
        <TextField name="nameKana" label="フリガナ" defaultValue={member?.nameKana} maxLength={120} />
        <RadioField name="gender" label="性別" options={options.genders} defaultValue={member?.gender} />
        <TextField name="birthDate" label="生年月日" type="date" defaultValue={member?.birthDate} />
        <RadioField name="hasSpouse" label="配偶者有無" options={yesNoOptions} defaultValue={yesNoValue(member?.hasSpouse)} />
        <RadioField name="hasChildren" label="子供有無" options={yesNoOptions} defaultValue={yesNoValue(member?.hasChildren)} />
        <TextField name="childrenCount" label="子供人数" type="number" suffix="人" defaultValue={member?.childrenCount} min={0} max={99} />
      </FieldGroup>

      <FieldGroup title="住所情報" screenId="BHALO011">
        <TextField name="residenceCountry" label="居住国" list={options.countries} defaultValue={member?.residenceCountry} maxLength={80} />
        <TextField name="nationality" label="国籍" list={options.countries} defaultValue={member?.nationality} maxLength={80} />
        <TextField name="nativeLanguage" label="母国語" list={options.languages} defaultValue={member?.nativeLanguage} maxLength={80} />
        <TextField name="mobile" label="携帯番号" type="tel" defaultValue={member?.mobile} maxLength={20} />
        <TextField name="contactEmail" label="メールアドレス" type="email" defaultValue={member?.contactEmail} maxLength={254} span={2} />
        <TextField name="postalCode" label="郵便番号" defaultValue={member?.postalCode} maxLength={20} />
        <TextField name="state" label="州地区" defaultValue={member?.state} maxLength={50} />
        <TextField name="city" label="市" defaultValue={member?.city} maxLength={50} />
        <TextField name="street" label="町・ロード" defaultValue={member?.street} maxLength={50} />
        <TextField name="houseNumber" label="番地" defaultValue={member?.houseNumber} maxLength={20} />
      </FieldGroup>

      <FieldGroup title="画像・動画" screenId="BHALO012 / 210">
        <p className="text-sm text-muted-foreground sm:col-span-2">
          写真・アピール動画のアップロードは準備中（ファイル保存の接続後）
        </p>
      </FieldGroup>

      <FieldGroup title="VISA情報" screenId="BHALO013" description="日本国内に住んでいる場合に入力します。">
        <SelectField name="visaStatus" label="VISAステータス" options={options.visas} defaultValue={member?.visaStatus} />
        <TextField name="visaExpiry" label="有効期限" type="month" defaultValue={member?.visaExpiry} />
      </FieldGroup>

      <FieldGroup title="自己紹介" screenId="BHALO018">
        <TextareaField name="introduction" label="自己紹介" defaultValue={member?.introduction} rows={6} maxLength={4000} span={2} />
      </FieldGroup>

      <FieldGroup title="求職希望・留学希望" screenId="BHALO019" description="希望する項目をすべてチェックします。">
        <div>
          <p className="mb-1 text-sm font-medium">求職希望</p>
          <CheckboxField name="wantsEngineer" label="技人国" defaultChecked={member?.wantsEngineer} />
          <CheckboxField name="wantsSsw" label="特定技能" defaultChecked={member?.wantsSsw} />
          <CheckboxField name="wantsTitp" label="技能実習" defaultChecked={member?.wantsTitp} />
        </div>
        <div>
          <p className="mb-1 text-sm font-medium">留学希望</p>
          <CheckboxField name="wantsUniversity" label="大学・大学院" defaultChecked={member?.wantsUniversity} />
          <CheckboxField name="wantsVocational" label="専門学校" defaultChecked={member?.wantsVocational} />
          <CheckboxField name="wantsLanguageSchool" label="日本語学校" defaultChecked={member?.wantsLanguageSchool} />
        </div>
      </FieldGroup>

      <FieldGroup title="履歴書情報" screenId="BHALO201" description="履歴書に印刷される項目。家族構成は下の家族構成セクションで入力します。">
        <TextField name="heightCm" label="身長" type="number" step="0.1" suffix="cm" defaultValue={resume?.heightCm} min={0} />
        <TextField name="weightKg" label="体重" type="number" step="0.1" suffix="kg" defaultValue={resume?.weightKg} min={0} />
        <TextField name="bloodType" label="血液型" defaultValue={resume?.bloodType} maxLength={8} />
        <SelectField name="dominantHand" label="利き手" options={options.dominantHands} defaultValue={resume?.dominantHand} />
        <RadioField name="hasTattoo" label="刺青(TATOO)" options={yesNoOptions} defaultValue={yesNoValue(resume?.hasTattoo)} />
        <TextField name="tattooLocation" label="刺青場所" defaultValue={resume?.tattooLocation} maxLength={50} />
        <RadioField name="smokes" label="喫煙" options={yesNoOptions} defaultValue={yesNoValue(resume?.smokes)} />
        <TextField name="eyesightRight" label="視力 右" type="number" step="0.1" defaultValue={resume?.eyesightRight} min={0} />
        <TextField name="eyesightLeft" label="視力 左" type="number" step="0.1" defaultValue={resume?.eyesightLeft} min={0} />

        {/* The passport number is stored encrypted and only ever shown masked. */}
        {hasPassport && (
          <TextField name="_passportCurrent" label="パスポート番号（登録済み）" defaultValue={resume?.passportMasked} readOnly />
        )}
        <TextField
          name="passportNo"
          label={hasPassport ? "新しいパスポート番号" : "パスポート番号"}
          defaultValue=""
          maxLength={50}
          autoComplete="off"
          hint={
            !encryptionReady
              ? "APP_ENCRYPTION_KEY が未設定のため保存できません。環境変数を設定してください。"
              : hasPassport
                ? "新しい番号を入力すると置き換えます"
                : "暗号化して保存されます"
          }
        />
        {hasPassport && <CheckboxField name="clearPassport" label="パスポート番号を削除" className="sm:col-span-2" />}

        <TextField name="alcohol" label="お酒" defaultValue={resume?.alcohol} maxLength={60} />
        <TextField name="allergies" label="アレルギー" defaultValue={resume?.allergies} maxLength={60} />
        <TextField name="religion" label="宗教（要配慮個人情報）" defaultValue={resume?.religion} maxLength={80} />
        <CheckboxField
          name="sensitiveConsent"
          label="本人が要配慮個人情報（宗教・健康）の提供に同意済み"
          description={resume?.sensitiveConsentAt ? `同意日時: ${fmtDateTime(resume.sensitiveConsentAt)}` : "チェックして保存すると同意日時が記録されます。"}
          defaultChecked={!!resume?.sensitiveConsentAt}
        />
        <TextareaField name="strengths" label="長所" defaultValue={resume?.strengths} rows={2} maxLength={200} />
        <TextareaField name="weaknesses" label="短所" defaultValue={resume?.weaknesses} rows={2} maxLength={200} />
        <TextareaField name="motivation" label="志望動機" defaultValue={resume?.motivation} rows={3} maxLength={300} span={2} />
        <TextareaField name="hobbies" label="趣味/特技" defaultValue={resume?.hobbies} rows={2} maxLength={200} />
        <TextareaField name="otherNotes" label="その他" defaultValue={resume?.otherNotes} rows={2} maxLength={300} />
      </FieldGroup>
    </FormShell>
  );
}
