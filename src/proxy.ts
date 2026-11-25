import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_ROUTE_SEGMENT, CONSOLE_HEADER, STAFF_COOKIE, adminSegment } from "@/server/admin/console-path";

// The staff console's route files are in src/app/admin, but its address is
// /<ADMIN_PATH> (read while the server runs, see src/server/admin/console-path.ts).
//
//   /<ADMIN_PATH>/...  is served from /admin/... and marked with CONSOLE_HEADER
//   /admin/...         answers like any address that does not exist
//   everything else    passes straight through
//
// A hidden address is only an extra layer. Sign-in, permissions and sessions
// are checked in src/server/auth/staff.ts on every page and action.

/** No route has this path, so a rewrite to it renders the site's normal 404 page. */
const NOT_FOUND_PATH = "/_not-found";

const LOGIN = "/login";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const end = pathname.indexOf("/", 1);
  const first = end === -1 ? pathname.slice(1) : pathname.slice(1, end);
  const segment = adminSegment();

  if (segment !== null && first === segment) {
    const rest = end === -1 ? "" : pathname.slice(end);
    const response = consoleResponse(request, segment, rest);
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    return response;
  }

  if (isAdminFolder(first)) {
    return NextResponse.rewrite(new URL(NOT_FOUND_PATH, request.url));
  }
}

function consoleResponse(request: NextRequest, segment: string, rest: string): NextResponse {
  // No session cookie at all: straight to the login page with a real HTTP
  // redirect. Only a shortcut (the cookie is not checked here); every page
  // and action still verifies the session itself.
  const isRead = request.method === "GET" || request.method === "HEAD";
  if (isRead && rest !== LOGIN && !request.cookies.has(STAFF_COOKIE)) {
    const login = request.nextUrl.clone();
    login.pathname = `/${segment}${LOGIN}`;
    login.search = "";
    return NextResponse.redirect(login);
  }

  // Mark the request (replacing anything the client sent under that name).
  const headers = new Headers(request.headers);
  headers.set(CONSOLE_HEADER, segment);

  if (segment === ADMIN_ROUTE_SEGMENT) return NextResponse.next({ request: { headers } });
  const url = request.nextUrl.clone();
  url.pathname = `/${ADMIN_ROUTE_SEGMENT}${rest}`;
  return NextResponse.rewrite(url, { request: { headers } });
}

/** "admin" however it is spelled in a URL: /Admin, /%61dmin, … */
function isAdminFolder(first: string): boolean {
  let name = first;
  if (name.includes("%")) {
    try {
      name = decodeURIComponent(name);
    } catch {
      return false; // Not a valid URL; the router rejects it.
    }
  }
  return name.split(/[/\\]/, 1)[0].toLowerCase() === ADMIN_ROUTE_SEGMENT;
}

export const config = {
  // Not for build output, optimized images or the icon files. Deliberately no
  // "skip anything with a file extension" rule: /admin/jobs/x.png is a page
  // address (jobs/[id]) and must not get past the check above.
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|icon\\.svg|apple-icon\\.png).*)"],
};
