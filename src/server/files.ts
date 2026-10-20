import "server-only";
import type { UploadedFile } from "@/generated/prisma/client";
import type { Member } from "@/server/auth/member";
import { db } from "@/server/db";
import { openStoredFile } from "@/server/storage";

// Who may open an uploaded file:
//   * staff (any permission) — they review profiles;
//   * the owner;
//   * an employer, for the résumé / photo of a candidate whose application to
//     one of the employer's jobs staff have approved (the hand-over rule).

export type Viewer = { staff?: boolean; member?: Member | null };

export async function canViewFile(file: Pick<UploadedFile, "id" | "ownerUserId">, viewer: Viewer): Promise<boolean> {
  if (viewer.staff) return true;
  const m = viewer.member;
  if (!m) return false;
  if (file.ownerUserId === m.userId) return true;
  if (m.kind !== "corporate" || !m.corporationId) return false;

  const approved = await db.application.findFirst({
    where: {
      reviewStatus: "approved",
      jobPosting: { corporationId: BigInt(m.corporationId) },
      individual: { userId: file.ownerUserId, OR: [{ resumeFileId: file.id }, { photoFileId: file.id }] },
    },
    select: { id: true },
  });
  return !!approved;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The HTTP response for GET /api/files/[id] and /admin/files/[id]. */
export async function serveFile(id: string, viewer: Viewer): Promise<Response> {
  if (!UUID.test(id)) return new Response("Not found", { status: 404 });
  const stored = await openStoredFile(id);
  if (!stored) return new Response("Not found", { status: 404 });
  if (!(await canViewFile(stored.row, viewer))) return new Response("Forbidden", { status: 403 });

  const { row, body } = stored;
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": row.contentType,
      "Content-Length": String(row.sizeBytes),
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(row.originalName)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
