import Link from "next/link";
import { Building2Icon, LogOutIcon, UserIcon, UserPlusIcon } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { getMember, memberHome } from "@/server/auth/member";
import { logoutMemberAction } from "@/server/auth/member-actions";

// The header's session buttons. Reads the member cookie, so the header renders
// it inside <Suspense> and the rest of the page stays static.
export async function HeaderAuth() {
  const member = await getMember();

  if (!member) {
    return (
      <>
        <Link href="/register" className={buttonVariants({ size: "lg" })}>
          <UserPlusIcon />
          <span className="hidden sm:inline">無料会員登録</span>
          <span className="sm:hidden">登録</span>
        </Link>
        <Link href="/login" className={buttonVariants({ variant: "outline", size: "lg" })}>
          <UserIcon />
          ログイン
        </Link>
      </>
    );
  }

  return (
    <>
      <Link href={memberHome(member.kind)} className={buttonVariants({ variant: "outline", size: "lg" })}>
        {member.kind === "individual" ? (
          <>
            <UserIcon />
            マイページ
          </>
        ) : (
          <>
            <Building2Icon />
            企業ページ
          </>
        )}
      </Link>
      <form action={logoutMemberAction}>
        <Button type="submit" variant="ghost" size="lg">
          <LogOutIcon />
          <span className="hidden sm:inline">ログアウト</span>
          <span className="sr-only sm:hidden">ログアウト</span>
        </Button>
      </form>
    </>
  );
}
