import "server-only";
import { randomBytes } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import type { FileKind } from "@/generated/prisma/client";
import { db } from "@/server/db";

// File storage behind one small interface. The local driver keeps files in
// ./storage (git-ignored) for the PC demo; the S3 driver replaces it on AWS
// without touching the callers. The database row (uploaded_files) is the
// source of truth for who owns a file and what it is.

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** What each kind of upload may contain. */
export const ALLOWED_TYPES: Record<FileKind, Record<string, string>> = {
  resume: { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png" },
  photo: { "image/jpeg": "jpg", "image/png": "png" },
  logo: { "image/jpeg": "jpg", "image/png": "png" },
};

// Resolved when first used, relative to the working directory. (Not
// `path.resolve(process.cwd(), …)` at module level: the standalone build's
// file tracer then copies the whole project folder, uploads included.)
const localRoot = () => path.resolve(process.env.STORAGE_DIR ?? "storage");

interface StorageDriver {
  put(key: string, bytes: Uint8Array): Promise<void>;
  stream(key: string): Promise<ReadableStream<Uint8Array> | null>;
  remove(key: string): Promise<void>;
}

const localDriver: StorageDriver = {
  async put(key, bytes) {
    const file = path.join(localRoot(), key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, bytes);
  },
  async stream(key) {
    const file = path.join(localRoot(), key);
    try {
      await stat(file);
    } catch {
      return null;
    }
    return Readable.toWeb(createReadStream(file)) as ReadableStream<Uint8Array>;
  },
  async remove(key) {
    await unlink(path.join(localRoot(), key)).catch(() => undefined);
  },
};

// S3 driver goes here (presigned uploads + GetObject) when the app moves to AWS.
const driver: StorageDriver = localDriver;

export type UploadError = "type" | "size" | "empty";

const SIGNATURES: Record<string, number[]> = {
  "application/pdf": [0x25, 0x50, 0x44, 0x46, 0x2d], // %PDF-
  "image/jpeg": [0xff, 0xd8, 0xff],
  "image/png": [0x89, 0x50, 0x4e, 0x47],
};

function hasSignature(bytes: Uint8Array, contentType: string): boolean {
  const sig = SIGNATURES[contentType];
  return !!sig && sig.every((b, i) => bytes[i] === b);
}

export type StoredFile = { id: string; originalName: string; contentType: string; sizeBytes: number };

/**
 * Validates and stores one uploaded file for a user. Returns the database row
 * id, which callers link from their own tables (e.g. individuals.resume_file_id).
 */
export async function storeUpload(
  ownerUserId: string,
  kind: FileKind,
  file: File,
): Promise<{ file: StoredFile; error?: undefined } | { file?: undefined; error: UploadError }> {
  if (file.size === 0) return { error: "empty" };
  if (file.size > MAX_UPLOAD_BYTES) return { error: "size" };
  const extension = ALLOWED_TYPES[kind][file.type];
  if (!extension) return { error: "type" };

  const bytes = new Uint8Array(await file.arrayBuffer());
  // The browser's declared type is checked against the file's own signature.
  if (!hasSignature(bytes, file.type)) return { error: "type" };

  // Random key: never the original name, so nothing from the browser reaches the file system.
  const key = `${kind}/${new Date().toISOString().slice(0, 7)}/${randomBytes(16).toString("hex")}.${extension}`;
  await driver.put(key, bytes);

  const row = await db.uploadedFile.create({
    data: {
      ownerUserId,
      kind,
      originalName: file.name.slice(0, 255),
      contentType: file.type,
      sizeBytes: file.size,
      storageKey: key,
    },
    select: { id: true, originalName: true, contentType: true, sizeBytes: true },
  });
  return { file: row };
}

/** The bytes of a stored file, or null when it is gone. */
export async function openStoredFile(id: string) {
  const row = await db.uploadedFile.findUnique({ where: { id } });
  if (!row) return null;
  const body = await driver.stream(row.storageKey);
  if (!body) return null;
  return { row, body };
}

export async function deleteStoredFile(id: string) {
  const row = await db.uploadedFile.findUnique({ where: { id }, select: { storageKey: true } });
  if (!row) return;
  await db.uploadedFile.delete({ where: { id } });
  await driver.remove(row.storageKey);
}

export const uploadErrorMessage: Record<UploadError, string> = {
  type: "PDF・JPG・PNG のファイルを選択してください",
  size: "ファイルサイズは10MB以内にしてください",
  empty: "ファイルが選択されていません",
};
