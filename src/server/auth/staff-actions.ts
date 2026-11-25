"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { hashPassword, passwordProblem, verifyAgainstNothing, verifyPassword } from "@/server/auth/password";
import { LOGIN_ID, LOGIN_IP, TOO_MANY_ATTEMPTS, clear, clientIp, isBlocked, record } from "@/server/auth/throttle";
import { createStaffSession, destroyStaffSession } from "@/server/auth/staff";
import { audit } from "@/server/admin/audit";
import { emailStr, nameStr, parseForm, reqStr, type ActionState } from "@/server/admin/form";
import { adminPath, requireConsoleRequest } from "@/server/admin/path";
import { db } from "@/server/db";

// Every action here starts with requireConsoleRequest(): a server action can
// be posted to any page of the site, and these must only answer (and only
// redirect to the console) for requests that came in through its address.

// Password guessing is slowed down in src/server/auth/throttle.ts.

const WRONG = "ログインIDまたはパスワードが誤っています";

export async function loginStaffAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireConsoleRequest();
  const parsed = parseForm(
    z.object({ email: reqStr("ログインID", 254), password: reqStr("パスワード", 200) }),
    formData,
  );
  if (parsed.errors) return { errors: parsed.errors };

  const email = parsed.data.email.toLowerCase();
  const idKey = `staff:${email}`;
  const ipKey = `staff-ip:${await clientIp()}`;
  if (isBlocked(idKey, LOGIN_ID.max) || isBlocked(ipKey, LOGIN_IP.max)) return { message: TOO_MANY_ATTEMPTS };

  const user = await db.user.findUnique({
    where: { email },
    include: { staffCredential: true, staffProfile: true },
  });
  const usable =
    user?.accountType === "staff" && user.isActive && user.staffProfile ? user.staffCredential : null;
  const ok = usable
    ? await verifyPassword(parsed.data.password, usable.passwordHash)
    : await verifyAgainstNothing(parsed.data.password);

  if (!ok || !user) {
    record(idKey, LOGIN_ID.windowMs);
    record(ipKey, LOGIN_IP.windowMs);
    return { message: WRONG };
  }

  clear(idKey);
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createStaffSession(user.id);
  await audit(user.id, "login", "users", user.id);
  redirect(adminPath());
}

export async function logoutStaffAction() {
  await requireConsoleRequest();
  await destroyStaffSession();
  redirect(adminPath("/login"));
}

const setupSchema = z
  .object({
    name: nameStr("ユーザ名", 80),
    email: emailStr.pipe(z.string({ error: "ログインID（メールアドレス）が入力されていません" })),
    password: reqStr("パスワード", 200),
    confirm: reqStr("パスワードの確認入力", 200),
  })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "パスワードが一致しません" });

/** Creates the first Administrator. Only works while no staff account exists. */
export async function setupFirstAdminAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireConsoleRequest();
  if ((await db.user.count({ where: { accountType: "staff" } })) > 0) {
    return { message: "管理者は既に登録されています。ログインしてください。" };
  }

  const parsed = parseForm(setupSchema, formData);
  if (parsed.errors) return { errors: parsed.errors };
  const { name, email, password } = parsed.data;
  const weak = passwordProblem(password, [email, name]);
  if (weak) return { errors: { password: weak } };

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
  redirect(adminPath());
}
