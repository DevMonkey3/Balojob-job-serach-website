"use client";

import { createContext, useContext, useState } from "react";
import type { Row, Values, WizardData } from "@/lib/wizard/types";

// Holds wizard answers in memory while the user moves between steps. The
// candidate flow starts from the database (src/app/(site)/profile/layout.tsx)
// and each step saves itself; this context only keeps the pages in sync.

type WizardContextValue = {
  data: WizardData;
  /** Always true now that the data arrives with the first render; kept for older consumers. */
  loaded: boolean;
  setValues: (slug: string, values: Values) => void;
  setRows: (slug: string, rows: Row[]) => void;
};

const WizardContext = createContext<WizardContextValue | null>(null);

export function WizardProvider({
  initialData,
  children,
}: {
  initialData: WizardData;
  children: React.ReactNode;
}) {
  const [data, setData] = useState<WizardData>(initialData);

  const value: WizardContextValue = {
    data,
    loaded: true,
    setValues: (slug, values) =>
      setData((d) => ({ ...d, values: { ...d.values, [slug]: values } })),
    setRows: (slug, rows) => setData((d) => ({ ...d, rows: { ...d.rows, [slug]: rows } })),
  };

  return <WizardContext value={value}>{children}</WizardContext>;
}

export function useWizard() {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error("useWizard must be used inside <WizardProvider>");
  return ctx;
}
