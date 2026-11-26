#!/usr/bin/env bash
# Load test of a running Bhalojob server. Run it ON the server:
#
#   bash deploy/aws/loadtest.sh your-domain.example          # the usual levels
#   bash deploy/aws/loadtest.sh your-domain.example 500 3000 # your own levels
#
# It only sends GET requests to public pages, so it changes nothing. It uses
# h2load, which keeps every visitor's connection open the way a real browser
# does (HTTP/2). Do NOT measure with "ab": it opens a brand-new encrypted
# connection for every single request, so it measures connection set-up, not
# the site, and reports about a quarter of the real capacity.
#
# The test program runs on the same two processor cores as the site, so the
# real limits are somewhat higher than what this prints.
set -u
HOST="${1:?usage: bash deploy/aws/loadtest.sh <domain> [visitors ...]}"
shift
LEVELS="${*:-100 1000 2000 4000}"
cd "$(dirname "$0")/../.." || exit 1
ulimit -n 100000 2>/dev/null || ulimit -n 65000 2>/dev/null || true

command -v h2load >/dev/null 2>&1 || {
  echo "Installing h2load (Ubuntu package nghttp2-client)..."
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -q nghttp2-client >/dev/null 2>&1
}
command -v h2load >/dev/null 2>&1 || { echo "h2load is not installed"; exit 1; }

sample() { # CPU and memory of every container, on one line
  sudo docker stats --no-stream --format '{{.Name}}={{.CPUPerc}}/{{.MemUsage}}' 2>/dev/null |
    sed 's/bhalojob-//; s/-1=/=/; s/ \/ [0-9.]*[A-Za-z]*//' | tr '\n' ' '
}
probe() { # one more ordinary visitor while the test runs: status and seconds
  curl -s -o /dev/null -k --cacert /dev/null -m 20 -w '%{http_code} in %{time_total}s' "https://$HOST$1" 2>/dev/null || true
}
restarts() {
  local s id out=""
  for s in app app2 cache caddy db; do
    id="$(sudo docker compose ps -q "$s" 2>/dev/null)"
    [ -n "$id" ] && out="$out$s=$(sudo docker inspect -f '{{.RestartCount}}' "$id") "
  done
  printf '%s' "$out"
}
summ() {
  grep -E '^finished in|^requests:|^status codes:|^time for request:|^time for connect:|^time to 1st byte:' "$1" | sed 's/^/    /'
}

echo "before: load $(cut -d' ' -f1 /proc/loadavg), free memory $(free -m | awk 'NR==2{print $7}') MB, restarts $(restarts)"
probe /jobs >/dev/null # fill the page cache

echo
echo "== 1. People browsing: every visitor opens a page every 5 seconds, for 40 seconds"
for c in $LEVELS; do
  out="$(mktemp)"
  h2load -t 2 -c "$c" -D 40 --rps 0.2 -H "accept-encoding: gzip" "https://$HOST/jobs" >"$out" 2>&1 &
  pid=$!
  sleep 25; st="$(sample)"; pr="$(probe /login)"
  wait "$pid"
  echo "-- $c visitors"; summ "$out"
  echo "    during: $st; one more visitor's login page: $pr"
  rm -f "$out"; sleep 10
done

echo
echo "== 2. As fast as possible: every visitor asks for the next page the moment one arrives"
for c in $LEVELS; do
  out="$(mktemp)"
  timeout 300 h2load -t 2 -c "$c" -n "$((c * 20))" -m 1 -H "accept-encoding: gzip" "https://$HOST/jobs" >"$out" 2>&1 &
  pid=$!
  sleep 8; st="$(sample)"; pr="$(probe /login)"
  wait "$pid"
  echo "-- $c visitors, $((c * 20)) pages"; summ "$out"
  echo "    during: $st; one more visitor's login page: $pr"
  rm -f "$out"; sleep 10
done

echo
echo "== 3. First-time visitors only: every one opens a new encrypted connection at the same instant"
for c in $LEVELS; do
  out="$(mktemp)"
  timeout 120 h2load -t 2 -c "$c" -n "$c" -m 1 -H "accept-encoding: gzip" "https://$HOST/jobs" >"$out" 2>&1
  echo "-- $c visitors"; summ "$out"; rm -f "$out"; sleep 8
done

echo
echo "after: load $(cut -d' ' -f1-3 /proc/loadavg), free memory $(free -m | awk 'NR==2{print $7}') MB, restarts $(restarts)"
sample; echo
echo "Good result: 'failed' is 0, 'status codes' are all 2xx, restarts did not change."
