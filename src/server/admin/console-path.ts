import "server-only";

// Where the staff console lives. Its route files stay in src/app/admin, but
// the address people use is /<ADMIN_PATH>: src/proxy.ts maps that onto the
// route files and answers 404 for /admin itself.
//
// This file is shared by the proxy and by ./path.ts, so it only reads the
// setting. ADMIN_PATH is read from the environment while the server runs; it
// is not a NEXT_PUBLIC_ variable and never ends up in a JavaScript bundle.

/** The folder under src/app that holds the console, and the address when ADMIN_PATH is unset. */
export const ADMIN_ROUTE_SEGMENT = "admin";

/**
 * Request header the proxy adds to requests that came in through the console
 * address. Its value is the address itself, so it cannot be forged by someone
 * who does not already know it. Never sent to the browser.
 */
export const CONSOLE_HEADER = "x-bj-console";

/** Staff session cookie. Set and read in src/server/auth/staff.ts; the proxy only looks whether it is there. */
export const STAFF_COOKIE = "bj_admin";

/** One URL segment: letters, digits, "-" and "_", 3–64 characters. */
const VALID_SEGMENT = /^[A-Za-z0-9_-]{3,64}$/;

let checkedValue: string | undefined;
let checkedResult: string | null | undefined;

/**
 * The console's URL segment, e.g. "console-7k2m9xq4".
 * - ADMIN_PATH unset or empty: "admin" (local development).
 * - ADMIN_PATH invalid: null. The console is then unreachable, which is safer
 *   than quietly serving it at the guessable /admin.
 */
export function adminSegment(): string | null {
  const value = process.env.ADMIN_PATH?.trim() ?? "";
  if (checkedResult !== undefined && value === checkedValue) return checkedResult;

  checkedValue = value;
  if (value === "") {
    checkedResult = ADMIN_ROUTE_SEGMENT;
  } else if (VALID_SEGMENT.test(value)) {
    checkedResult = value;
  } else {
    checkedResult = null;
    console.error(
      "ADMIN_PATH is not valid (use 3-64 letters, digits, '-' or '_'). The staff console is switched off until it is fixed.",
    );
  }
  return checkedResult;
}
