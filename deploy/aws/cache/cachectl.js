// Emptying the page cache in one step (loaded by nginx.conf, runs inside nginx).
//
// Every stored page is filed under a "generation" number that is part of its
// key. Raising the number makes every page stored so far unreachable at once:
// the next visitor gets a freshly built page, which is stored under the new
// number. The old files are never read again and nginx removes them by itself.
//
// The app raises the number whenever something public changes (a job is
// approved, edited or closed, a company or a dropdown list is changed): see
// purgePageCache() in src/server/cache-tags.ts. That is what lets pages be
// kept for a whole minute and still show a change on the very next visit.

function current() {
	var dict = ngx.shared.cachegen;
	var value = dict.get("gen");
	if (value === undefined) {
		// First request since nginx started. Starting from the clock means a
		// restarted nginx never reuses a number from before the restart.
		dict.add("gen", Math.floor(Date.now() / 1000));
		value = dict.get("gen");
	}
	return value;
}

/** $cache_gen in nginx.conf. */
function generation() {
	return String(current());
}

/** POST /purge on the private port 8082. */
function purge(r) {
	if (r.method !== "POST") {
		r.return(405, "POST only\n");
		return;
	}
	current();
	var next = ngx.shared.cachegen.incr("gen", 1);
	r.headersOut["Cache-Control"] = "no-store";
	r.return(200, "page cache emptied (generation " + next + ")\n");
}

export default { generation, purge };
