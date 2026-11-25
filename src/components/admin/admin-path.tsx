"use client";

import { createContext, useCallback, useContext } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// The console's address ("/<ADMIN_PATH>") for client components. The server
// reads it per request (src/server/admin/path.ts) and hands it down through
// this context from the console layout and the staff login page, so it is
// never compiled into a JavaScript bundle.
//
// Console pages are named by their path inside the console: "/jobs/12", or ""
// for the dashboard. <AdminLink> and useAdminPath() add the address.

/** Used where there is no provider (the shared forms on the employer pages). Never the real address. */
const NO_PROVIDER = "/admin";

const AdminPathContext = createContext(NO_PROVIDER);

export function AdminPathProvider({ base, children }: { base: string; children: React.ReactNode }) {
  return <AdminPathContext value={base}>{children}</AdminPathContext>;
}

/** `const admin = useAdminPath()`, then `admin("/jobs/12")` is the address of that console page. */
export function useAdminPath(): (path?: string) => string {
  const base = useContext(AdminPathContext);
  return useCallback((path = "") => `${base}${path}`, [base]);
}

/** next/link for console pages. `href` is the path inside the console. Works in server and client components. */
export function AdminLink({ href, ...props }: Omit<React.ComponentProps<typeof Link>, "href"> & { href: string }) {
  const admin = useAdminPath();
  return <Link href={admin(href)} {...props} />;
}

/**
 * The current page as a path inside the console ("/" for the dashboard).
 * usePathname() reports the address in the browser; the route's own path
 * (/admin/…) is accepted too, so server and browser always agree.
 */
export function useConsolePathname(): string {
  const base = useContext(AdminPathContext);
  const pathname = usePathname();
  for (const prefix of [base, NO_PROVIDER]) {
    if (pathname === prefix) return "/";
    if (pathname.startsWith(`${prefix}/`)) return pathname.slice(prefix.length);
  }
  return pathname;
}
