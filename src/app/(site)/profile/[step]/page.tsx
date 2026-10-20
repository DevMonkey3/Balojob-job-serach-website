import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StepSkeleton, StepView } from "@/components/wizard/step-view";
import { flows } from "@/lib/flows";

const flow = flows.individual;

type Params = PageProps<"/profile/[step]">["params"];

export function generateStaticParams() {
  return flow.steps.map((s) => ({ step: s.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { step } = await params;
  const def = flow.steps.find((s) => s.slug === step);
  return { title: def ? `${def.title} | プロフィール作成` : "プロフィール作成", robots: { index: false } };
}

// Params are read inside Suspense so client navigations between steps stay instant.
export default function ProfileStepPage({ params }: PageProps<"/profile/[step]">) {
  return (
    <Suspense fallback={<StepSkeleton />}>
      <Step params={params} />
    </Suspense>
  );
}

async function Step({ params }: { params: Params }) {
  const { step } = await params;
  if (!flow.steps.some((s) => s.slug === step)) notFound();
  return <StepView flowId="individual" slug={step} />;
}
