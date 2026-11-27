import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { RegisterChoice } from "@/components/site/register-choice";

export const metadata: Metadata = pageMeta({ title: "会員登録", path: "/register" });

export default function RegisterPage() {
  return (
    <div className="flex flex-1 items-start justify-center bg-page px-4 py-10 md:py-16">
      <div className="flex w-full max-w-md flex-col gap-5">
        <div className="text-center">
          <h1 className="text-2xl font-bold">無料会員登録</h1>
          <p className="mt-1 text-sm text-muted-foreground">ご利用の目的をお選びください (Choose how you will use Bhalojob)</p>
        </div>
        <RegisterChoice />
      </div>
    </div>
  );
}
