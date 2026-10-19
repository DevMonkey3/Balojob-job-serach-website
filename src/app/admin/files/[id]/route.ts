import { getStaff } from "@/server/auth/staff";
import { serveFile } from "@/server/files";

// Uploaded files for the admin console (any signed-in staff member).
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const staff = await getStaff();
  if (!staff) return new Response("Unauthorized", { status: 401 });
  return serveFile(id, { staff: true });
}
