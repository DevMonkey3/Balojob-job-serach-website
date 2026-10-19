import { Suspense } from "react";
import { StepSkeleton } from "@/components/wizard/step-view";
import { WizardProvider } from "@/components/wizard/wizard-provider";
import { requireCandidate } from "@/server/auth/member";
import { loadProfile } from "@/server/member/profile";

// The candidate wizard (BHALO010–026). The signed-in candidate's saved answers
// are loaded once here and shared by every step through the WizardProvider.
export default function ProfileLayout({ children }: LayoutProps<"/profile">) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <Suspense fallback={<StepSkeleton />}>
        <ProfileShell>{children}</ProfileShell>
      </Suspense>
    </div>
  );
}

async function ProfileShell({ children }: { children: React.ReactNode }) {
  const m = await requireCandidate("/profile/basic");
  const data = await loadProfile(BigInt(m.individualId));
  return <WizardProvider initialData={data}>{children}</WizardProvider>;
}
