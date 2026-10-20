import type { Metadata } from "next";
import { RegisterChoice } from "@/components/site/register-choice";

export const metadata: Metadata = { title: "会員登録" };

export default function RegisterPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-16">
      <p className="font-mono text-xs text-muted-foreground">BHALO000</p>
      <RegisterChoice />
    </div>
  );
}
