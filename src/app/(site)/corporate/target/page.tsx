import type { Metadata } from "next";
import { TargetSelect } from "@/components/wizard/target-select";

export const metadata: Metadata = { title: "対象選択 | 法人会員登録", robots: { index: false } };

export default function CorporateTargetPage() {
  return <TargetSelect />;
}
