"use client";

import { CheckboxField, FieldGroup, HiddenField, TextField } from "@/components/admin/fields";
import { FormShell } from "@/components/admin/form-shell";
import { saveJobOrderAction } from "@/server/admin/jobs-actions";
import type { JobOrderDetail } from "@/server/admin/jobs";

// BHALO117 求人票: the extra details printed on the job order sheet.
export function JobOrderForm({ jobId, order }: { jobId: string; order: JobOrderDetail | null }) {
  return (
    <FormShell action={saveJobOrderAction} submitLabel="求人票を保存">
      <HiddenField name="jobId" value={jobId} />
      <FieldGroup title="求人票" screenId="BHALO117" description="労働条件と保険・手当。未作成の場合は保存時に作成されます。">
        <TextField name="dailyWorkingTime" label="1日の労働時間" type="time" defaultValue={order?.dailyWorkingTime} />
        <TextField name="breakTime" label="休憩時間" defaultValue={order?.breakTime} maxLength={120} />
        <TextField name="overtimeDailyHours" label="1日の残業時間" type="number" suffix="時間" defaultValue={order?.overtimeDailyHours} min={0} max={24} />
        <TextField name="overtimeMonthlyAvgHours" label="月平均残業時間" type="number" suffix="時間" defaultValue={order?.overtimeMonthlyAvgHours} min={0} />
        <TextField name="avgWorkDaysPerMonth" label="月平均労働日数" type="number" suffix="日" defaultValue={order?.avgWorkDaysPerMonth} min={0} max={31} />
        <TextField name="annualWorkHours" label="年間労働時間" type="number" suffix="時間" defaultValue={order?.annualWorkHours} min={0} />
        <TextField name="weeklyWorkDays" label="週の労働日" defaultValue={order?.weeklyWorkDays} maxLength={120} />
        <TextField name="japaneseLevel" label="日本語レベル" defaultValue={order?.japaneseLevel} maxLength={120} />
        <div className="flex flex-col sm:col-span-2 sm:flex-row sm:gap-8">
          <div>
            <p className="mb-1 text-sm font-medium">加入保険</p>
            <CheckboxField name="hasEmploymentInsurance" label="雇用保険" defaultChecked={order?.hasEmploymentInsurance} />
            <CheckboxField name="hasWorkersComp" label="労災保険" defaultChecked={order?.hasWorkersComp} />
            <CheckboxField name="hasHealthInsurance" label="健康保険" defaultChecked={order?.hasHealthInsurance} />
            <CheckboxField name="hasPension" label="厚生年金" defaultChecked={order?.hasPension} />
          </div>
          <div>
            <p className="mb-1 text-sm font-medium">通勤手当</p>
            <CheckboxField name="commuteFull" label="全額支給" defaultChecked={order?.commuteFull} />
            <CheckboxField name="commuteFixed" label="一律支給" defaultChecked={order?.commuteFixed} />
          </div>
        </div>
      </FieldGroup>
    </FormShell>
  );
}
