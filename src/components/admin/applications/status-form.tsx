"use client";

import { FieldGroup, HiddenField, SelectField, TextareaField } from "@/components/admin/fields";
import { FormShell } from "@/components/admin/form-shell";
import { applicationStatusLabels, toOptions } from "@/lib/admin/labels";
import { updateApplicationAction } from "@/server/admin/applications-actions";

export function ApplicationStatusForm({ id, status, staffNote }: { id: string; status: string; staffNote: string }) {
  return (
    <FormShell action={updateApplicationAction} submitLabel="更新" confirmEmpty={false}>
      <HiddenField name="id" value={id} />
      <FieldGroup title="対応状況">
        <SelectField name="status" label="ステータス" options={toOptions(applicationStatusLabels)} defaultValue={status} allowEmpty={false} />
        <TextareaField name="staffNote" label="担当者メモ" defaultValue={staffNote} rows={4} maxLength={2000} span={2} />
      </FieldGroup>
    </FormShell>
  );
}
