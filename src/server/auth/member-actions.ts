"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { hashPassword, passwordProblem, verifyAgainstNothing, verifyPassword } from "@/server/auth/password";
import {
  LOGIN_ID,
  LOGIN_IP,
  SIGNUP_IP,
  TOO_MANY_ATTEMPTS,
  TOO_MANY_SIGNUPS,
  clear,
  clientIp,
  isBlocked,
  record,
} from "@/server/auth/throttle";
import { createMemberSession, destroyMemberSession, memberHome, safeReturnPath } from "@/server/auth/member";
import { emailStr, nameStr, parseForm, reqStr, str, type ActionState } from "@/server/admin/form";
import { db } from "@/server/db";

// Registration (BHALO002 / 003) and login (BHALO001) for candidates and employers.

// Guessing and sign-up floods are slowed down in src/server/auth/throttle.ts.

const EMAIL_TAKEN = "このメールアドレスは既に登録されています";
const WRONG = "ログインIDまたはパスワードが誤っています";

const requiredEmail = emailStr.pipe(z.string({ error: "ログインID（メールアドレス）が入力されていません" }));

const password = reqStr("パスワード", 200);

/** Too many new accounts from this address? Counts this attempt when it is allowed. */
async function signupRefused(): Promise<boolean> {
  const key = `signup:${await clientIp()}`;
  if (isBlocked(key, SIGNUP_IP.max)) return true;
  record(key, SIGNUP_IP.windowMs);
  return false;
}

const withConfirm = <S extends z.ZodObject<{ password: z.ZodType<string>; confirm: z.ZodType<string> }>>(schema: S) =>
  schema.refine((d) => d.password === d.confirm, { path: ["confirm"], message: "パスワードが一致しません" });

const isEmailTaken = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

const individualSchema = withConfirm(
  z.object({
    fullName: nameStr("氏名", 80),
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
  const weak = passwordProblem(pw, [email, fullName]);
  if (weak) return { errors: { password: weak } };
  if (await signupRefused()) return { message: TOO_MANY_SIGNUPS };

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
    companyName: nameStr("会社・団体名", 120),
    representative: nameStr("代表者名", 80),
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
  const weak = passwordProblem(pw, [email, companyName, representative]);
  if (weak) return { errors: { password: weak } };
  if (await signupRefused()) return { message: TOO_MANY_SIGNUPS };

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
  const idKey = `login:${email}`;
  const ipKey = `login-ip:${await clientIp()}`;
  if (isBlocked(idKey, LOGIN_ID.max) || isBlocked(ipKey, LOGIN_IP.max)) return { message: TOO_MANY_ATTEMPTS };

  const user = await db.user.findUnique({
    where: { email },
    include: { memberCredential: true },
  });
  const usable = user && user.accountType !== "staff" && user.isActive && user.memberCredential;
  // An unknown or disabled login ID still costs one password check, so the
  // answer takes equally long either way.
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
  await createMemberSession(user.id);
  const kind = user.accountType === "individual" ? "individual" : "corporate";
  redirect(safeReturnPath(parsed.data.next) ?? memberHome(kind));
}

export async function logoutMemberAction() {
  await destroyMemberSession();
  redirect("/");
}
