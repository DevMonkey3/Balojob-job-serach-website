import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { db } from "@/server/db";

// Candidate / employer sign-in (BHALO001). Same scheme as the staff console
// (src/server/auth/staff.ts) with its own cookie and tables, so a staff login
// and a member login never mix.

export const MEMBER_COOKIE = "bj_member";
const SESSION_DAYS = 30;

export type MemberKind = "individual" | "corporate";

export type Member = {
  userId: string;
  email: string;
  /** 氏名 or 会社名, for greetings. */
  name: string;
  kind: MemberKind;
  /** Set for candidates (string for client components). */
  individualId: string | null;
  /** Set for employers. */
  corporationId: string | null;
};

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

/** The signed-in member for this request, or null. Looked up once per request. */
export const getMember = cache(async (): Promise<Member | null> => {
  // A session is per request, never part of a prerender (the expiry check
  // below compares against the current time).
  await connection();
  const token = (await cookies()).get(MEMBER_COOKIE)?.value;
  if (!token) return null;

  const session = await db.memberSession.findUnique({
    where: { tokenHash: sha256(token) },
    include: {
      user: {
        include: {
          individual: { select: { id: true, fullName: true } },
          corporation: { select: { id: true, name: true } },
        },
      },
    },
  });
  if (!session || session.expiresAt < new Date()) return null;

  const { user } = session;
  if (!user.isActive || user.accountType === "staff") return null;

  return {
    userId: user.id,
    email: user.email,
    name: user.individual?.fullName || user.corporation?.name || user.name || user.email,
    kind: user.accountType,
    individualId: user.individual ? String(user.individual.id) : null,
    corporationId: user.corporation ? String(user.corporation.id) : null,
  };
});

/** Where a member's own area is. */
export const memberHome = (kind: MemberKind) => (kind === "individual" ? "/mypage" : "/employer");

/**
 * For pages and actions. Signed out → login (returning here afterwards).
 * Wrong kind (an employer on a candidate page) → that member's own area.
 */
export async function requireMember(kind?: MemberKind, returnTo?: string): Promise<Member> {
  const member = await getMember();
  if (!member) redirect(returnTo ? `/login?next=${encodeURIComponent(returnTo)}` : "/login");
  if (kind && member.kind !== kind) redirect(memberHome(member.kind));
  return member;
}

export async function requireCandidate(returnTo?: string): Promise<Member & { individualId: string }> {
  const member = await requireMember("individual", returnTo);
  // Registration always creates the profile row, so this only guards corrupt data.
  if (!member.individualId) redirect("/login");
  return { ...member, individualId: member.individualId };
}

export async function requireEmployer(returnTo?: string): Promise<Member & { corporationId: string }> {
  const member = await requireMember("corporate", returnTo);
  if (!member.corporationId) redirect("/login");
  return { ...member, corporationId: member.corporationId };
}

export async function createMemberSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  const h = await headers();

  await db.memberSession.create({
    data: {
      userId,
      tokenHash: sha256(token),
      expiresAt,
      ipAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim().slice(0, 45) ?? null,
      userAgent: h.get("user-agent")?.slice(0, 300) ?? null,
    },
  });

  (await cookies()).set({
    name: MEMBER_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroyMemberSession() {
  const store = await cookies();
  const token = store.get(MEMBER_COOKIE)?.value;
  if (token) await db.memberSession.deleteMany({ where: { tokenHash: sha256(token) } });
  store.delete({ name: MEMBER_COOKIE, path: "/" });
}

/** Only paths inside this site may be used as a post-login destination. */
export function safeReturnPath(value: string | null | undefined): string | undefined {
  return value && /^\/(?!\/)[\w\-./?=&%#]*$/.test(value) ? value : undefined;
}
