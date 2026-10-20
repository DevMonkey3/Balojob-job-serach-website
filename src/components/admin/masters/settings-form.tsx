"use client";

import { FieldGroup, TextField } from "@/components/admin/fields";
import { FormShell } from "@/components/admin/form-shell";
import { saveSettingsAction } from "@/server/admin/masters-actions";
import type { SettingValues } from "@/server/admin/masters";

// BHALO816 管理マスタメンテ: where コンタクト申込 emails are sent.
export function SettingsForm({ values }: { values: SettingValues }) {
  return (
    <FormShell action={saveSettingsAction}>
      <FieldGroup title="申込メールアドレス" screenId="BHALO816" description="コンタクト申込（BHALO200）の通知先です。">
        <TextField
          name="application_email_individual"
          label="個人申込メールアドレス"
          type="email"
          required
          maxLength={254}
          defaultValue={values.application_email_individual}
        />
        <TextField
          name="application_email_corporate"
          label="法人申込メールアドレス"
          type="email"
          required
          maxLength={254}
          defaultValue={values.application_email_corporate}
        />
      </FieldGroup>
    </FormShell>
  );
}
