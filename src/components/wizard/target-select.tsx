"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldInput } from "@/components/wizard/field-input";
import { useWizard } from "@/components/wizard/wizard-provider";
import type { Field, Values } from "@/lib/wizard/types";

// BHALO110 対象選択: decides whether the company or the school flow runs.

const companyKinds = ["company", "supervising", "support"];

const targetField: Field = {
  name: "target",
  label: "対象",
  type: "checkboxes",
  span: 2,
  groups: [
    {
      title: "企業・団体 (Companies & organisations)",
      items: [
        { name: "company", label: "企業 (Company)" },
        { name: "supervising", label: "監理団体 (TITP supervising organisation)" },
        { name: "support", label: "登録支援機関 (SSW registered support organisation)" },
      ],
    },
    {
      title: "学校 (Schools)",
      items: [
        { name: "university", label: "大学・大学院 (University / Graduate school)" },
        { name: "vocational", label: "専門学校 (Vocational school)" },
        { name: "languageSchool", label: "日本語学校 (Japanese language school)" },
      ],
    },
  ],
};

export function TargetSelect() {
  const router = useRouter();
  const { data, loaded, setValues } = useWizard();
  if (!loaded) return <div className="h-80 animate-pulse rounded-xl bg-muted" />;

  function done(values: Values, href: string) {
    setValues("target", values);
    router.push(href);
  }

  return <TargetForm initial={data.values.target ?? {}} onDone={done} />;
}

function TargetForm({ initial, onDone }: { initial: Values; onDone: (v: Values, href: string) => void }) {
  const [values, setValues] = useState<Values>(initial);
  const [error, setError] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const chosen = Object.keys(values).filter((k) => values[k] === true);
    if (chosen.length === 0) return setError("一件も選択がされていません (Select at least one)");
    const isCompany = chosen.some((k) => companyKinds.includes(k));
    onDone(values, isCompany ? "/corporate/company/basic" : "/corporate/school/basic");
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <p className="font-mono text-xs text-muted-foreground">BHALO110</p>
          <CardTitle className="text-xl">
            対象企業・学校選択 <span className="text-base font-normal text-muted-foreground">Organisation type</span>
          </CardTitle>
          <CardDescription>御社の対象を選択してください（複数選択可）</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <FieldInput
            field={targetField}
            get={(name) => values[name]}
            set={(name, value) => setValues((v) => ({ ...v, [name]: value }))}
          />
          <p className="text-sm text-muted-foreground">
            ※ 学校名など名称が変わる場合は個別に会員登録してください
          </p>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </CardContent>
      </Card>
      <Button type="submit" size="lg" className="self-end">
        次へ (Next)
      </Button>
    </form>
  );
}
