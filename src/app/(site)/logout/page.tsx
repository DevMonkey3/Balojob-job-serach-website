import type { Metadata } from "next";
import { LogOutIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { logoutMemberAction } from "@/server/auth/member-actions";

export const metadata: Metadata = { title: "ログアウト", robots: { index: false } };

// Plain sign-out page (the header has the same button); the action clears the
// session and returns to the top page.
export default function LogoutPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl">
            ログアウト <span className="text-base font-normal text-muted-foreground">Log out</span>
          </CardTitle>
          <CardDescription>ログアウトしますか？ (Do you want to log out?)</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={logoutMemberAction}>
            <Button type="submit" size="lg">
              <LogOutIcon />
              ログアウト
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
