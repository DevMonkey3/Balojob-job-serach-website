import { LoaderCircleIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Pending indicator for buttons: `<Spinner />保存中…`. */
export function Spinner({ className }: { className?: string }) {
  return <LoaderCircleIcon aria-hidden className={cn("animate-spin", className)} />;
}
