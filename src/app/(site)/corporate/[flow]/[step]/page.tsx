import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StepSkeleton, StepView } from "@/components/wizard/step-view";
import { flows } from "@/lib/flows";

const corporateFlows = ["company", "school"] as const;
type CorporateFlow = (typeof corporateFlows)[number];
type Params = PageProps<"/corporate/[flow]/[step]">["params"];

const isCorporateFlow = (v: string): v is CorporateFlow => (corporateFlows as readonly string[]).includes(v);

export function generateStaticParams() {
  return corporateFlows.flatMap((flow) => flows[flow].steps.map((s) => ({ flow, step: s.slug })));
}

export const metadata: Metadata = { title: "法人プロフィール作成", robots: { index: false } };

// Params are read inside Suspense so client navigations between steps stay instant.
export default function CorporateStepPage({ params }: PageProps<"/corporate/[flow]/[step]">) {
  return (
    <Suspense fallback={<StepSkeleton />}>
      <Step params={params} />
    </Suspense>
  );
}

async function Step({ params }: { params: Params }) {
  const { flow, step } = await params;
  if (!isCorporateFlow(flow) || !flows[flow].steps.some((s) => s.slug === step)) notFound();
  return <StepView flowId={flow} slug={step} />;
}
