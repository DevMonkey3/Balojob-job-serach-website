"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { FieldInput } from "@/components/wizard/field-input";
import { useWizard } from "@/components/wizard/wizard-provider";
import { activeSteps, flows, nextStep, prevStep, stepHref, type FlowId } from "@/lib/flows";
import { saveProfileStepAction, submitProfileAction } from "@/server/member/profile-actions";
import type { FieldValue, Row, StepDef, Values } from "@/lib/wizard/types";

export function StepView({ flowId, slug }: { flowId: FlowId; slug: string }) {
  const { loaded } = useWizard();
  const flow = flows[flowId];
  const step = flow.steps.find((s) => s.slug === slug);
  if (!step) return null;

  if (!loaded) return <StepSkeleton />;

  return <StepForm key={slug} flowId={flowId} step={step} />;
}

export function StepSkeleton() {
  return <div className="h-96 animate-pulse rounded-xl bg-muted" aria-busy="true" />;
}

const isFilled = (row: Row) => Object.values(row).some((v) => typeof v === "string" && v.trim() !== "");

/** The editor always shows at least one (blank) row. */
const withBlank = (rows: Row[] | undefined) => (rows && rows.length > 0 ? rows : [{}]);

const ROW_ERROR = /^rows\.(\d+)\./;

function StepForm({ flowId, step }: { flowId: FlowId; step: StepDef }) {
  const router = useRouter();
  const { data, setValues, setRows } = useWizard();
  const flow = flows[flowId];
  // The candidate wizard writes every step to the database; the corporate
  // flows (another screen set) still only keep their answers in memory.
  const persists = flowId === "individual";

  const [values, setLocalValues] = useState<Values>(data.values[step.slug] ?? {});
  const [rows, setLocalRows] = useState<Row[]>(withBlank(data.rows[step.slug]));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  // Answers on this step can change which steps follow (希望選択), so
  // navigation is computed from the draft including unsaved edits.
  const draft = { ...data, values: { ...data.values, [step.slug]: values } };
  const visible = activeSteps(flow, draft);
  const position = visible.findIndex((s) => s.slug === step.slug) + 1;
  const prev = prevStep(flow, step.slug, draft);
  const next = nextStep(flow, step.slug, draft);
  const backHref = prev ? stepHref(flow, prev.slug) : persists ? flow.finishHref : flow.startHref;

  // Empty rows are dropped, matching the spec's "空行以外の行で登録". `kept` maps
  // the saved row index (what the server reports errors for) back to the editor.
  const kept = rows.map((r, i) => (isFilled(r) ? i : -1)).filter((i) => i >= 0);
  const nonEmptyRows = kept.map((i) => rows[i]);

  const rowErrors: Record<number, string[]> = {};
  for (const [key, msg] of Object.entries(errors)) {
    const m = ROW_ERROR.exec(key);
    if (!m) continue;
    const i = kept[Number(m[1])] ?? Number(m[1]);
    (rowErrors[i] ??= []).push(msg);
  }

  function save() {
    if (step.kind === "rows") setRows(step.slug, nonEmptyRows);
    else setValues(step.slug, values);
  }

  /** Saves this step on the server, then runs `then` (navigation) when it was accepted. */
  function persist(then: () => Promise<void> | void) {
    setErrors({});
    setMessage("");
    startTransition(async () => {
      const r = await saveProfileStepAction(step.slug, step.kind === "rows" ? { rows: nonEmptyRows } : { values });
      if (!r.ok) {
        setErrors(r.errors ?? {});
        setMessage(r.message);
        return;
      }
      await then();
    });
  }

  function onNext(e: React.FormEvent) {
    e.preventDefault();
    const found = step.validate?.(values) ?? {};
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    save();

    if (!persists) {
      router.push(next ? stepHref(flow, next.slug) : flow.finishHref);
      return;
    }
    persist(async () => {
      if (next) {
        router.push(stepHref(flow, next.slug));
        return;
      }
      // Last step: ask staff to review the profile.
      const s = await submitProfileAction();
      if (!s.ok) {
        setMessage(s.message);
        return;
      }
      router.push("/mypage?saved=submitted");
    });
  }

  function onBack() {
    save();
    if (!persists) {
      router.push(backHref);
      return;
    }
    persist(() => router.push(backHref));
  }

  return (
    <form onSubmit={onNext} noValidate className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {flow.title}：ステップ {position}/{visible.length}
          </span>
          <span className="font-mono text-xs">{step.screenId}</span>
        </div>
        <Progress value={(position / visible.length) * 100} aria-label="進捗" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            {step.title} <span className="text-base font-normal text-muted-foreground">{step.titleEn}</span>
          </CardTitle>
          {step.description && <CardDescription>{step.description}</CardDescription>}
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {message && (
            <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {message}
            </p>
          )}
          {step.kind === "form" ? (
            <div className="grid gap-5 sm:grid-cols-2">
              {step.fields.map((field) => (
                <FieldInput
                  key={field.name}
                  field={field}
                  get={(name) => values[name]}
                  set={(name, value) => setLocalValues((v) => ({ ...v, [name]: value }))}
                  error={errors[field.name]}
                />
              ))}
            </div>
          ) : (
            <RowsEditor step={step} rows={rows} onChange={setLocalRows} errors={rowErrors} />
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between gap-3">
        <Button type="button" variant="outline" size="lg" onClick={onBack} disabled={pending}>
          もどる (Back)
        </Button>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "保存中…" : next ? "次へ (Next)" : flow.finishLabel}
        </Button>
      </div>
    </form>
  );
}

function RowsEditor({
  step,
  rows,
  onChange,
  errors,
}: {
  step: StepDef;
  rows: Row[];
  onChange: (rows: Row[]) => void;
  /** Messages per editor row index, from the last save. */
  errors: Record<number, string[]>;
}) {
  const update = (i: number, name: string, value: FieldValue) =>
    onChange(rows.map((r, j) => (j === i ? { ...r, [name]: String(value) } : r)));

  // Deleting the only row clears it instead, as in the spec.
  const remove = (i: number) => onChange(rows.length === 1 ? [{}] : rows.filter((_, j) => j !== i));

  return (
    <div className="flex flex-col gap-4">
      {rows.map((row, i) => (
        <fieldset key={i} className={cnRow(!!errors[i])}>
          <div className="mb-3 flex items-center justify-between">
            <legend className="text-sm font-semibold">
              {step.rowLabel} {i + 1}
            </legend>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => remove(i)}
              aria-label={`${step.rowLabel} ${i + 1} を削除`}
            >
              <Trash2Icon />
              削除
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {step.fields.map((field) => (
              <FieldInput
                key={field.name}
                field={field}
                get={(name) => row[name]}
                set={(name, value) => update(i, name, value)}
              />
            ))}
          </div>
          {errors[i] && (
            <ul role="alert" className="mt-3 flex flex-col gap-1 text-sm text-destructive">
              {errors[i].map((msg, k) => (
                <li key={k}>{msg}</li>
              ))}
            </ul>
          )}
        </fieldset>
      ))}
      <Button type="button" variant="outline" className="self-start" onClick={() => onChange([...rows, {}])}>
        <PlusIcon />
        {step.rowLabel}を追加する (Add)
      </Button>
    </div>
  );
}

const cnRow = (invalid: boolean) => (invalid ? "rounded-lg border border-destructive p-4" : "rounded-lg border p-4");
