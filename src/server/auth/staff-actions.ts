"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { PASSWORD_MIN_LENGTH, hashPassword, verifyPassword } from "@/server/auth/password";
import { createStaffSession, destroyStaffSession } from "@/server/auth/staff";
import { audit } from "@/server/admin/audit";
import { emailStr, parseForm, reqStr, type ActionState } from "@/server/admin/form";
import { db } from "@/server/db";

// Per-process brake on password guessing. Enough for one server; on AWS this
// moves to ElastiCache so every task shares the count.
const failures = new Map<string, { count: number; until: number }>();
const MAX_FAILURES = 10;
const LOCK_MS = 15 * 60 * 1000;

function locked(key: string) {
  const f = failures.get(key);
  return !!f && f.count >= MAX_FAILURES && f.until > Date.now();
}

function recordFailure(key: string) {
  const f = failures.get(key);
  if (f && f.until > Date.now()) f.count += 1;
  else failures.set(key, { count: 1, until: Date.now() + LOCK_MS });
}

const WRONG = "ログインIDまたはパスワードが誤っています";

export async function loginStaffAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(
    z.object({ email: reqStr("ログインID", 254), password: reqStr("パスワード", 200) }),
    formData,
  );
  if (parsed.errors) return { errors: parsed.errors };

  const email = parsed.data.email.toLowerCase();
  if (locked(email)) return { message: "試行回数が多すぎます。15分後に再度お試しください。" };

  const user = await db.user.findUnique({
    where: { email },
    include: { staffCredential: true, staffProfile: true },
  });
  const ok =
    user?.accountType === "staff" &&
    user.isActive &&
    user.staffCredential &&
    user.staffProfile &&
    (await verifyPassword(parsed.data.password, user.staffCredential.passwordHash));

  if (!ok) {
    recordFailure(email);
    return { message: WRONG };
  }

  failures.delete(email);
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createStaffSession(user.id);
  await audit(user.id, "login", "users", user.id);
  redirect("/admin");
}

export async function logoutStaffAction() {
  await destroyStaffSession();
  redirect("/admin/login");
}

const setupSchema = z
  .object({
    name: reqStr("ユーザ名", 80),
    email: emailStr.pipe(z.string({ error: "ログインID（メールアドレス）が入力されていません" })),
    password: reqStr("パスワード", 200).pipe(
      z.string().min(PASSWORD_MIN_LENGTH, `パスワードは${PASSWORD_MIN_LENGTH}文字以上にしてください`),
    ),
    confirm: reqStr("パスワードの確認入力", 200),
  })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "パスワードが一致しません" });

/** Creates the first Administrator. Only works while no staff account exists. */
export async function setupFirstAdminAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if ((await db.user.count({ where: { accountType: "staff" } })) > 0) {
    return { message: "管理者は既に登録されています。ログインしてください。" };
  }

  const parsed = parseForm(setupSchema, formData);
  if (parsed.errors) return { errors: parsed.errors };
  const { name, email, password } = parsed.data;

  let userId: string;
  try {
    const user = await db.user.create({
      data: {
        email: email.toLowerCase(),
        emailVerified: true,
        name,
        accountType: "staff",
        staffProfile: { create: { isAdmin: true, canView: true, canEdit: true, canDelete: true } },
        staffCredential: { create: { passwordHash: await hashPassword(password) } },
      },
      select: { id: true },
    });
    userId = user.id;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { errors: { email: "このメールアドレスは既に登録されています" } };
    }
    throw e;
  }

  await createStaffSession(userId);
  await audit(userId, "create", "users", userId, { setup: true });
  redirect("/admin");
}
