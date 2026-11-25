import "server-only";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ADMIN_ROUTE_SEGMENT, CONSOLE_HEADER, adminSegment } from "@/server/admin/console-path";

// Console URLs on the server. In the code a console page is always named by
// its path inside the console ("/jobs/12", "" for the dashboard), which is
// also where its file is under src/app/admin/(console). Only two things turn
// that into an address for the browser:
//   - adminPath() here, for redirects, cookies and the few links built on the server
//   - useAdminPath() / <AdminLink> in src/components/admin/admin-path.tsx, for client components
// revalidatePath() is different: it takes the route file path ("/admin/jobs").

/**
 * The browser address of a console page: adminPath() → "/console-7k2m9xq4",
 * adminPath("/jobs/12?saved=1") → "/console-7k2m9xq4/jobs/12?saved=1".
 *
 * Call it only while a request is being handled (server actions, route
 * handlers, components after `await requireStaff()` or `await isConsoleRequest()`).
 * In a part of a page that is prerendered at build time the value would be
 * frozen into the build; use <AdminLink> there.
 */
export function adminPath(path = ""): string {
  return `/${adminSegment() ?? ADMIN_ROUTE_SEGMENT}${path}`;
}

/**
 * True when this request came in through the console address (the proxy
 * marks those). A request that reached console code some other way, such as a
 * server action posted to a public page, must not be told where the console is.
 */
export async function isConsoleRequest(): Promise<boolean> {
  const marker = (await headers()).get(CONSOLE_HEADER);
  const segment = adminSegment();
  return segment !== null && marker === segment;
}

/** 404 for anything that did not come in through the console address. */
export async function requireConsoleRequest(): Promise<void> {
  if (!(await isConsoleRequest())) notFound();
}
