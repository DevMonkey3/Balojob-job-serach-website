import { isConsoleRequest } from "@/server/admin/path";
import { getStaff } from "@/server/auth/staff";
import { serveFile } from "@/server/files";

// Uploaded files for the admin console (any signed-in staff member), served
// at /<ADMIN_PATH>/files/<id>.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Only for requests the proxy let in through the console address.
  if (!(await isConsoleRequest())) return new Response("Not Found", { status: 404 });
  const staff = await getStaff();
  if (!staff) return new Response("Unauthorized", { status: 401 });
  return serveFile(id, { staff: true });
}
