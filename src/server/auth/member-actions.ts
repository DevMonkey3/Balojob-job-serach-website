"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { PASSWORD_MIN_LENGTH, hashPassword, verifyPassword } from "@/server/auth/password";
import { createMemberSession, destroyMemberSession, memberHome, safeReturnPath } from "@/server/auth/member";
import { emailStr, parseForm, reqStr, str, type ActionState } from "@/server/admin/form";
import { db } from "@/server/db";

// Registration (BHALO002 / 003) and login (BHALO001) for candidates and employers.

// Per-process brake on password guessing, like the staff login.
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

const EMAIL_TAKEN = "このメールアドレスは既に登録されています";
const WRONG = "ログインIDまたはパスワードが誤っています";

const requiredEmail = emailStr.pipe(z.string({ error: "ログインID（メールアドレス）が入力されていません" }));

const password = reqStr("パスワード", 200).pipe(
  z.string().min(PASSWORD_MIN_LENGTH, `パスワードは${PASSWORD_MIN_LENGTH}文字以上にしてください`),
);

const withConfirm = <S extends z.ZodObject<{ password: z.ZodType<string>; confirm: z.ZodType<string> }>>(schema: S) =>
  schema.refine((d) => d.password === d.confirm, { path: ["confirm"], message: "パスワードが一致しません" });

const isEmailTaken = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

const individualSchema = withConfirm(
  z.object({
    fullName: reqStr("氏名", 80),
    email: requiredEmail,
    password,
    confirm: reqStr("パスワードの確認入力", 200),
  }),
);

/** BHALO002: creates the login and an empty profile, then signs in and starts the wizard. */
export async function registerIndividualAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(individualSchema, formData);
  if (parsed.errors) return { errors: parsed.errors };
  const { fullName, email, password: pw } = parsed.data;

  let userId: string;
  try {
    const user = await db.user.create({
      data: {
        email: email.toLowerCase(),
        name: fullName,
        accountType: "individual",
        memberCredential: { create: { passwordHash: await hashPassword(pw) } },
        individual: { create: { fullName, resume: { create: {} } } },
      },
      select: { id: true },
    });
    userId = user.id;
  } catch (e) {
    if (isEmailTaken(e)) return { errors: { email: EMAIL_TAKEN } };
    throw e;
  }

  await createMemberSession(userId);
  redirect("/profile/basic");
}

const employerSchema = withConfirm(
  z.object({
    companyName: reqStr("会社・団体名", 120),
    representative: reqStr("代表者名", 80),
    email: requiredEmail,
    password,
    confirm: reqStr("パスワードの確認入力", 200),
  }),
);

/** BHALO003: creates the login and the company (一般企業), then signs in and opens the employer page. */
export async function registerEmployerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(employerSchema, formData);
  if (parsed.errors) return { errors: parsed.errors };
  const { companyName, representative, email, password: pw } = parsed.data;

  let userId: string;
  try {
    const user = await db.user.create({
      data: {
        email: email.toLowerCase(),
        name: companyName.slice(0, 80),
        accountType: "corporate",
        memberCredential: { create: { passwordHash: await hashPassword(pw) } },
        corporation: { create: { kind: "company", name: companyName, representative, isCompany: true } },
      },
      select: { id: true },
    });
    userId = user.id;
  } catch (e) {
    if (isEmailTaken(e)) return { errors: { email: EMAIL_TAKEN } };
    throw e;
  }

  await createMemberSession(userId);
  redirect("/employer?welcome=1");
}

const loginSchema = z.object({
  email: reqStr("ログインID", 254),
  password: reqStr("パスワード", 200),
  next: str(300),
});

/** BHALO001: one login for candidates and employers; each lands in their own area. */
export async function loginMemberAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(loginSchema, formData);
  if (parsed.errors) return { errors: parsed.errors };

  const email = parsed.data.email.toLowerCase();
  if (locked(email)) return { message: "試行回数が多すぎます。15分後に再度お試しください。" };

  const user = await db.user.findUnique({
    where: { email },
    include: { memberCredential: true },
  });
  const ok =
    user &&
    user.accountType !== "staff" &&
    user.isActive &&
    user.memberCredential &&
    (await verifyPassword(parsed.data.password, user.memberCredential.passwordHash));

  if (!ok) {
    recordFailure(email);
    return { message: WRONG };
  }

  failures.delete(email);
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createMemberSession(user.id);
  const kind = user.accountType === "individual" ? "individual" : "corporate";
  redirect(safeReturnPath(parsed.data.next) ?? memberHome(kind));
}

export async function logoutMemberAction() {
  await destroyMemberSession();
  redirect("/");
}
