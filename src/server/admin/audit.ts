import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";

export type AuditAction = "create" | "update" | "delete" | "login" | "approve" | "reject";

/** Records which staff member changed what (needed for personal data under APPI). */
export async function audit(
  staffUserId: string,
  action: AuditAction,
  targetTable: string,
  targetId: string | bigint,
  details?: Record<string, unknown>,
) {
  await db.auditLog.create({
    data: {
      staffUserId,
      action,
      targetTable,
      targetId: String(targetId),
      details: details ? (details as Prisma.InputJsonValue) : undefined,
    },
  });
}
