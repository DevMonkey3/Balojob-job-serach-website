"use server";

import { revalidatePath } from "next/cache";
import { requireCandidate } from "@/server/auth/member";
import { db } from "@/server/db";
import { deleteStoredFile, storeUpload, uploadErrorMessage } from "@/server/storage";
import type { ActionState } from "@/server/admin/form";

// Résumé (履歴書 file) and photo uploads from My Page / the wizard. The file is
// read straight from FormData: parseForm() only keeps string fields.

export type UploadState = ActionState & { file?: { id: string; name: string; url: string } };

async function upload(kind: "resume" | "photo", formData: FormData): Promise<UploadState> {
  const member = await requireCandidate();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { errors: { file: uploadErrorMessage.empty } };

  const stored = await storeUpload(member.userId, kind, file);
  if (stored.error) return { errors: { file: uploadErrorMessage[stored.error] } };

  const column = kind === "resume" ? "resumeFileId" : "photoFileId";
  const individualId = BigInt(member.individualId);
  const previous = await db.individual.findUnique({ where: { id: individualId }, select: { [column]: true } });
  await db.individual.update({ where: { id: individualId }, data: { [column]: stored.file.id } });
  // The old file is unlinked by the update above; now its bytes can go.
  const oldId = previous?.[column] as string | null | undefined;
  if (oldId && oldId !== stored.file.id) await deleteStoredFile(oldId);

  revalidatePath("/mypage");
  return {
    ok: true,
    message: "アップロードしました。",
    file: { id: stored.file.id, name: stored.file.originalName, url: `/api/files/${stored.file.id}` },
  };
}

export async function uploadResumeAction(_prev: UploadState, formData: FormData): Promise<UploadState> {
  return upload("resume", formData);
}

export async function uploadPhotoAction(_prev: UploadState, formData: FormData): Promise<UploadState> {
  return upload("photo", formData);
}

/** Removes the candidate's résumé file. */
export async function deleteResumeAction(): Promise<ActionState> {
  const member = await requireCandidate();
  const individualId = BigInt(member.individualId);
  const i = await db.individual.findUnique({ where: { id: individualId }, select: { resumeFileId: true } });
  if (i?.resumeFileId) {
    await db.individual.update({ where: { id: individualId }, data: { resumeFileId: null } });
    await deleteStoredFile(i.resumeFileId);
  }
  revalidatePath("/mypage");
  return { ok: true, message: "削除しました。" };
}
