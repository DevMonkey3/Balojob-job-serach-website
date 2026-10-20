import { getMember } from "@/server/auth/member";
import { serveFile } from "@/server/files";

// Uploaded files for members (owner, or an employer with an approved applicant).
// Staff use /admin/files/[id]: their cookie is scoped to /admin.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return serveFile(id, { member: await getMember() });
}
