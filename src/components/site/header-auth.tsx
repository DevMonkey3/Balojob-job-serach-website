import Link from "next/link";
import { Building2Icon, LogInIcon, LogOutIcon, UserIcon, UserPlusIcon } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getMember, memberHome } from "@/server/auth/member";
import { logoutMemberAction } from "@/server/auth/member-actions";

// The header's session buttons. They read the member cookie, so the header
// renders them inside <Suspense> and the rest of the page stays static.
//
// Signed out: ログイン and 無料会員登録, on every screen size. One login page
// serves candidates and companies. Staff sign in somewhere else entirely and
// nothing on the public site links there.

const cta =
  "bg-gradient-to-r from-brand-orange to-brand-red text-white shadow-sm hover:brightness-110 border-transparent";

export async function HeaderAuth() {
  const member = await getMember();

  if (!member) {
    return (
      <>
        <Link href="/login" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-10 border-primary/40 px-3 font-semibold text-primary hover:bg-primary/5 hover:text-primary sm:px-4")}>
          <LogInIcon className="hidden sm:block" />
          ログイン
        </Link>
        <Link href="/register" className={cn(buttonVariants({ size: "lg" }), cta, "h-10 px-3 font-bold sm:px-4")}>
          <UserPlusIcon className="hidden sm:block" />
          <span className="hidden sm:inline">無料会員登録</span>
          <span className="sm:hidden">会員登録</span>
        </Link>
      </>
    );
  }

  const individual = member.kind === "individual";
  return (
    <>
      <span className="hidden max-w-40 truncate text-sm text-muted-foreground lg:inline">{member.name} さん</span>
      <Link href={memberHome(member.kind)} className={cn(buttonVariants({ size: "lg" }), cta, "h-10 px-3 font-bold sm:px-4")}>
        {individual ? <UserIcon /> : <Building2Icon />}
        {individual ? "マイページ" : "企業ページ"}
      </Link>
      <form action={logoutMemberAction}>
        <Button type="submit" variant="ghost" size="lg" className="h-10 px-2.5 sm:px-3">
          <LogOutIcon />
          <span className="hidden sm:inline">ログアウト</span>
          <span className="sr-only sm:hidden">ログアウト</span>
        </Button>
      </form>
    </>
  );
}

/** "企業ログイン" in the top strip, only while nobody is signed in. */
export async function HeaderEmployerLink() {
  if (await getMember()) return null;
  return (
    <Link href="/login?as=employer" className="flex items-center gap-1 font-semibold text-foreground/80 hover:text-primary">
      <Building2Icon className="size-3.5" aria-hidden />
      企業ログイン
    </Link>
  );
}
