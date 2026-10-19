import Link from "next/link";
import { Building2Icon, UserRoundIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// BHALO000 会員登録: shown on the main page and as its own screen.
export function RegisterChoice({ className }: { className?: string }) {
  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="text-center text-lg">
          無料会員登録はこちらから
          <span className="block text-sm font-normal text-muted-foreground">Register here — free</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <Link
          href="/register/individual"
          className={cn(buttonVariants({ size: "lg" }), "h-auto flex-col gap-0.5 py-3")}
        >
          <span className="flex items-center gap-2 text-base">
            <UserRoundIcon />
            個人の方
          </span>
          <span className="text-xs opacity-80">For individuals</span>
        </Link>
        <Link
          href="/register/corporate"
          className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-auto flex-col gap-0.5 py-3")}
        >
          <span className="flex items-center gap-2 text-base">
            <Building2Icon />
            企業の方
          </span>
          <span className="text-xs text-muted-foreground">For companies</span>
        </Link>
        <p className="text-center text-xs text-muted-foreground">
          学校（大学・専門学校・日本語学校）の会員登録は準備中です
          <span className="block">School registration is coming soon</span>
        </p>
      </CardContent>
    </Card>
  );
}
