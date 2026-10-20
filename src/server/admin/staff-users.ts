import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { hashPassword } from "@/server/auth/password";
import { db } from "@/server/db";

// ユーザマスタ (staff accounts) for BHALO810 / 811: a `users` row with
// accountType = staff, a StaffProfile (permissions) and a StaffCredential
// (password hash). Ids are uuid strings already, so nothing needs converting.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A users.id from a URL segment or hidden field. */
export function parseUuid(value: string | undefined): string | null {
  return value && UUID_RE.test(value) ? value.toLowerCase() : null;
}

export type StaffUser = {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const userSelect = {
  id: true,
  name: true,
  email: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  staffProfile: { select: { isAdmin: true, canView: true, canEdit: true, canDelete: true } },
} satisfies Prisma.UserSelect;

// A staff row without a profile can only come from a manual insert; it gets no permissions.
const noPermissions = { isAdmin: false, canView: false, canEdit: false, canDelete: false };

function toStaffUser(u: Prisma.UserGetPayload<{ select: typeof userSelect }>): StaffUser {
  return {
    id: u.id,
    name: u.name ?? "",
    email: u.email,
    isActive: u.isActive,
    lastLoginAt: u.lastLoginAt,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
    ...(u.staffProfile ?? noPermissions),
  };
}

/** Every staff account, oldest first (spec: ユーザマスタを全件読み込む). */
export async function listStaffUsers(): Promise<StaffUser[]> {
  const rows = await db.user.findMany({
    where: { accountType: "staff" },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: userSelect,
  });
  return rows.map(toStaffUser);
}

export async function getStaffUser(id: string): Promise<StaffUser | null> {
  const u = await db.user.findFirst({ where: { id, accountType: "staff" }, select: userSelect });
  return u ? toStaffUser(u) : null;
}

export type StaffUserInput = {
  name: string;
  isAdmin: boolean;
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  isActive: boolean;
};

/**
 * User + profile + credential in one nested write (one transaction). Throws
 * Prisma's P2002 when the login ID is already taken.
 */
export async function createStaffUser(email: string, password: string, input: StaffUserInput): Promise<string> {
  const { name, isActive, ...permissions } = input;
  const user = await db.user.create({
    data: {
      email: email.toLowerCase(),
      emailVerified: true,
      name,
      accountType: "staff",
      isActive,
      staffProfile: { create: permissions },
      staffCredential: { create: { passwordHash: await hashPassword(password) } },
    },
    select: { id: true },
  });
  return user.id;
}

/**
 * Updates the name, flags and permissions; the password only when one is
 * given. A new password also ends that user's sessions, unless `keepSessions`
 * (an administrator changing their own password stays signed in).
 */
export async function updateStaffUser(id: string, input: StaffUserInput, password?: string, keepSessions = false) {
  const { name, isActive, ...permissions } = input;
  const passwordHash = password ? await hashPassword(password) : undefined;
  await db.user.update({
    where: { id },
    data: {
      name,
      isActive,
      staffProfile: { upsert: { create: permissions, update: permissions } },
      staffCredential: passwordHash ? { upsert: { create: { passwordHash }, update: { passwordHash } } } : undefined,
      staffSessions: passwordHash && !keepSessions ? { deleteMany: {} } : undefined,
    },
  });
}

/** Cascades to the profile, credential and sessions. */
export async function deleteStaffUser(id: string) {
  await db.user.delete({ where: { id } });
}
