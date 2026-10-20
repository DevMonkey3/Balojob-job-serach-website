import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { db } from "@/server/db";

// Admin console sign-in (ユーザマスタ). Members will sign in through the auth
// library later; staff sessions are kept separate and simple on purpose.

export const STAFF_COOKIE = "bj_admin";
const SESSION_DAYS = 7;

export type Staff = {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
};

export type Permission = "view" | "edit" | "delete" | "admin";

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

/** The signed-in staff member for this request, or null. Looked up once per request. */
export const getStaff = cache(async (): Promise<Staff | null> => {
  // A session is per request, never part of a prerender (the expiry check
  // below compares against the current time).
  await connection();
  const token = (await cookies()).get(STAFF_COOKIE)?.value;
  if (!token) return null;

  const session = await db.staffSession.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: { include: { staffProfile: true } } },
  });
  if (!session || session.expiresAt < new Date()) return null;

  const { user } = session;
  if (!user.isActive || user.accountType !== "staff" || !user.staffProfile) return null;

  const p = user.staffProfile;
  return {
    id: user.id,
    name: user.name ?? user.email,
    email: user.email,
    isAdmin: p.isAdmin,
    canView: p.canView,
    canEdit: p.canEdit,
    canDelete: p.canDelete,
  };
});

/** Administrator implies every other permission. */
export function hasPermission(staff: Staff, permission: Permission) {
  if (staff.isAdmin) return true;
  switch (permission) {
    case "view":
      return staff.canView;
    case "edit":
      return staff.canEdit;
    case "delete":
      return staff.canDelete;
    case "admin":
      return false;
  }
}

/**
 * For pages. Signed out → login page. Missing permission → back to the
 * dashboard with a message (spec: 権限の無い場合は管理画面へ戻る). With no
 * permission given, any signed-in staff member passes (the dashboard itself).
 */
export async function requireStaff(permission?: Permission): Promise<Staff> {
  const staff = await getStaff();
  if (!staff) redirect("/admin/login");
  if (permission && !hasPermission(staff, permission)) redirect(`/admin?error=${permission}`);
  return staff;
}

export const PERMISSION_DENIED = "この処理を実行する権限がありません。";

/** For server actions: throws so the form can show the message instead of navigating away. */
export async function requireStaffForAction(permission: Permission): Promise<Staff> {
  const staff = await getStaff();
  if (!staff) redirect("/admin/login");
  if (!hasPermission(staff, permission)) throw new Error(PERMISSION_DENIED);
  return staff;
}

export async function createStaffSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  const h = await headers();

  await db.staffSession.create({
    data: {
      userId,
      tokenHash: sha256(token),
      expiresAt,
      ipAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim().slice(0, 45) ?? null,
      userAgent: h.get("user-agent")?.slice(0, 300) ?? null,
    },
  });

  (await cookies()).set({
    name: STAFF_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/admin",
    expires: expiresAt,
  });
}

export async function destroyStaffSession() {
  const store = await cookies();
  const token = store.get(STAFF_COOKIE)?.value;
  if (token) await db.staffSession.deleteMany({ where: { tokenHash: sha256(token) } });
  store.delete({ name: STAFF_COOKIE, path: "/admin" });
}
