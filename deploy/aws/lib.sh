#!/usr/bin/env bash
# Shared by setup.sh, update.sh, backup.sh and restore.sh. Not run on its own.
# shellcheck shell=bash

# Cron starts with a short PATH; /snap/bin is where `snap install aws-cli` puts aws.
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/snap/bin"

# The project folder (two levels above this file).
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"
COMPOSE_FILE="$ROOT_DIR/docker-compose.yml"

# Secrets live outside the project folder, so replacing the code can never delete them.
ENV_DIR="/etc/bhalojob"
ENV_FILE="$ENV_DIR/bhalojob.env"

# Fixed names from docker-compose.yml and the Dockerfile.
UPLOADS_VOLUME="bhalojob-uploads"
# The site runs as two identical containers (see docker-compose.yml).
APP_SERVICES="app app2"
APP_IMAGE="bhalojob-app"
APP_UID=1000 # the "node" user the app runs as
APP_GID=1000

DEFAULT_BACKUP_DIR="/var/backups/bhalojob"
DEFAULT_BACKUP_KEEP_DAYS=14

log() { printf '\n==> %s\n' "$*"; }
info() { printf '    %s\n' "$*"; }
warn() { printf '\nWARNING: %s\n' "$*" >&2; }
die() {
  printf '\nERROR: %s\n' "$*" >&2
  exit 1
}

# Re-runs the calling script with sudo when it was started without it.
require_root() {
  if [ "$(id -u)" -ne 0 ]; then
    command -v sudo >/dev/null 2>&1 || die "Run this script as root."
    exec sudo --preserve-env=DOMAIN,SKIP_FIREWALL,SWAP_SIZE_GB bash "$0" "$@"
  fi
}

require_env_file() {
  [ -f "$ENV_FILE" ] || die "$ENV_FILE does not exist. Run setup first:  sudo bash deploy/aws/setup.sh"
}

require_docker() {
  docker compose version >/dev/null 2>&1 || die "Docker with the compose plugin is not installed. Run setup first:  sudo bash deploy/aws/setup.sh"
}

# env_get KEY: prints the value of KEY in the env file, or nothing. The file is
# read as text and never executed.
env_get() {
  [ -r "$ENV_FILE" ] || return 0
  awk -v key="$1" '
    {
      line = $0
      sub(/\r$/, "", line)
      if (index(line, key "=") == 1) value = substr(line, length(key) + 2)
    }
    END {
      if (value ~ /^".*"$/ || value ~ /^'\''.*'\''$/) value = substr(value, 2, length(value) - 2)
      printf "%s", value
    }
  ' "$ENV_FILE"
}

# env_set KEY VALUE: changes that one line (or adds it). Everything else stays as it is.
env_set() {
  local tmp
  tmp="$(mktemp "$ENV_DIR/.bhalojob.env.XXXXXX")"
  ENV_SET_KEY="$1" ENV_SET_VALUE="$2" awk '
    BEGIN { key = ENVIRON["ENV_SET_KEY"]; value = ENVIRON["ENV_SET_VALUE"]; done = 0 }
    index($0, key "=") == 1 { if (!done) print key "=" value; done = 1; next }
    { print }
    END { if (!done) print key "=" value }
  ' "$ENV_FILE" >"$tmp"
  chown root:root "$tmp"
  chmod 600 "$tmp"
  mv -f "$tmp" "$ENV_FILE"
}

# Docker Compose for this project, always with the env file.
dc() {
  docker compose --project-directory "$ROOT_DIR" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

# ./.env -> the env file, so `sudo docker compose ...` typed in the project folder works too.
link_env_file() {
  local link="$ROOT_DIR/.env"
  if [ -e "$link" ] && [ ! -L "$link" ]; then
    warn "$link is a real file, not the link to $ENV_FILE. Left as it is. Remove it if plain 'docker compose' commands complain."
    return 0
  fi
  ln -sfn "$ENV_FILE" "$link"
}

# The container id of a running service, or nothing.
service_container() {
  local ids
  ids="$(dc ps -q --status running "$1" 2>/dev/null || true)"
  printf '%s' "${ids%%$'\n'*}"
}

# wait_for_service SERVICE [SECONDS]: waits until Docker reports that container
# healthy, which means /api/health answered 200 (it is up and reaches the database).
wait_for_service() {
  local service="$1" timeout="${2:-300}" waited=0 id state
  while [ "$waited" -lt "$timeout" ]; do
    id="$(service_container "$service")"
    if [ -n "$id" ]; then
      state="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$id" 2>/dev/null || true)"
      [ "$state" = "healthy" ] && return 0
    fi
    sleep 3
    waited=$((waited + 3))
  done
  return 1
}

# wait_for_app [SECONDS]: waits for every copy of the app.
wait_for_app() {
  local timeout="${1:-300}" service
  for service in $APP_SERVICES; do
    wait_for_service "$service" "$timeout" || return 1
  done
  return 0
}

# What to look at when the app does not come up. App logs hold no secrets.
show_app_trouble() {
  dc ps --all || true
  printf '\n---- last lines of the app log ----\n'
  # shellcheck disable=SC2086
  dc logs --tail 40 $APP_SERVICES || true
  printf '\n---- last lines of the migrate log ----\n'
  dc logs --no-log-prefix --tail 20 migrate || true
}

backup_dir() {
  local dir
  dir="$(env_get BACKUP_DIR)"
  printf '%s' "${dir:-$DEFAULT_BACKUP_DIR}"
}
