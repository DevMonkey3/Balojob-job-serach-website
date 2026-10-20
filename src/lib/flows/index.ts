import { companyFlow, schoolFlow } from "./corporate";
import { individualFlow } from "./individual";
import type { FlowDef, StepDef, WizardData } from "@/lib/wizard/types";

export const flows = {
  individual: individualFlow,
  company: companyFlow,
  school: schoolFlow,
} satisfies Record<string, FlowDef>;

export type FlowId = keyof typeof flows;

const isActive = (step: StepDef, data: WizardData) => !step.when || step.when(data);

/** Steps the user will actually see, given their answers so far. */
export function activeSteps(flow: FlowDef, data: WizardData) {
  return flow.steps.filter((s) => isActive(s, data));
}

export function stepHref(flow: FlowDef, slug: string) {
  return `${flow.basePath}/${slug}`;
}

/** Next active step after `slug`, or null when the flow is done. */
export function nextStep(flow: FlowDef, slug: string, data: WizardData) {
  const i = flow.steps.findIndex((s) => s.slug === slug);
  return flow.steps.slice(i + 1).find((s) => isActive(s, data)) ?? null;
}

/** Previous active step before `slug`, or null on the first step. */
export function prevStep(flow: FlowDef, slug: string, data: WizardData) {
  const i = flow.steps.findIndex((s) => s.slug === slug);
  return flow.steps.slice(0, i).findLast((s) => isActive(s, data)) ?? null;
}
