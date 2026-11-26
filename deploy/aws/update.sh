#!/usr/bin/env bash
#
# Deploys a new version of Bhalojob on the server (see docs/aws-deploy.md).
# Run it from the project folder:
#
#   sudo bash deploy/aws/update.sh
#
# The running site stays up while the new version is built and the database is
# migrated; only the last step, swapping the app container, takes a few seconds.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=deploy/aws/lib.sh
. "$SCRIPT_DIR/lib.sh"

usage() {
  cat <<'EOF'
Usage: sudo bash deploy/aws/update.sh [options]

  1. Gets the newest code with `git pull` (skipped when the folder is not a
     git checkout, for example after uploading a new archive).
  2. Dumps the database as a backup.
  3. Builds the new version while the current one keeps running.
  4. Applies new database migrations.
  5. Replaces the two app containers one after the other (the other one keeps
     serving, so visitors notice nothing), then reloads Caddy.
  6. Deletes old images.

Options:
  --no-pull          Use the code as it is in the folder now.
  --no-backup        Skip the database dump in step 2.
  --refresh-images   Also fetch the newest PostgreSQL 18, Caddy 2 and Node 24
                     images (security fixes). The database restarts briefly.
                     Do this about once a month.
EOF
}

CODE_CHANGED=0

# Runs git as the user who owns the folder: that user has the GitHub deploy
# key, and git refuses to work as root in somebody else's folder.
git_as_owner() {
  local owner
  owner="$(stat -c %U "$ROOT_DIR")"
  if [ "$owner" = "root" ] || [ "$owner" = "UNKNOWN" ]; then
    git -C "$ROOT_DIR" "$@"
  else
    sudo -u "$owner" -H git -C "$ROOT_DIR" "$@"
  fi
}

pull_code() {
  log "Getting the newest code"
  if [ ! -d "$ROOT_DIR/.git" ]; then
    info "This folder is not a git checkout. Using the files as they are now."
    return 0
  fi
  command -v git >/dev/null 2>&1 || die "git is not installed (sudo apt-get install -y git), or run with --no-pull."

  local before after
  before="$(git_as_owner rev-parse --short HEAD)"
  git_as_owner pull --ff-only ||
    die "git pull failed, so nothing was changed. Fix the message above (often: files edited on the server, or the deploy key), or run with --no-pull to deploy the code as it is."
  after="$(git_as_owner rev-parse --short HEAD)"

  if [ "$before" = "$after" ]; then
    info "Already at the newest commit ($after)."
  else
    info "Updated $before -> $after"
    CODE_CHANGED=1
  fi
}

main() {
  local do_pull=1 do_backup=1 refresh=0 arg
  local -a original_args=("$@")
  for arg in "$@"; do
    case "$arg" in
      -h | --help)
        usage
        exit 0
        ;;
      --no-pull) do_pull=0 ;;
      --no-backup) do_backup=0 ;;
      --refresh-images) refresh=1 ;;
      *) die "Unknown option: $arg  (try --help)" ;;
    esac
  done
  require_root "${original_args[@]}"
  require_env_file
  require_docker
  [ -f "$COMPOSE_FILE" ] || die "$COMPOSE_FILE is missing. Run this from the Bhalojob project folder."

  log "Bhalojob update in $ROOT_DIR"

  if [ "$do_pull" -eq 1 ]; then
    pull_code
    if [ "$CODE_CHANGED" -eq 1 ]; then
      # The pull may have changed this script too: continue with the new copy.
      exec bash "$SCRIPT_DIR/update.sh" --no-pull "${original_args[@]}"
    fi
  fi
  link_env_file

  local free_kb
  free_kb="$(df -Pk /var/lib/docker 2>/dev/null | awk 'NR == 2 { print $4 }' || true)"
  if [ -n "$free_kb" ] && [ "$free_kb" -lt $((3 * 1024 * 1024)) ]; then
    warn "Less than 3 GB of disk is free. The build may fail. See 'Disk is full' in docs/aws-deploy.md."
  fi

  # Keep the version that is running fine now, in case the new one has to be undone.
  local running
  running="$(service_container app)"
  if [ -n "$running" ] && [ "$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{end}}' "$running" 2>/dev/null || true)" = "healthy" ]; then
    docker tag "$(docker inspect --format '{{.Image}}' "$running")" "$APP_IMAGE:previous"
  fi

  if [ "$do_backup" -eq 1 ]; then
    if [ -n "$(service_container db)" ]; then
      log "Database backup before the update"
      bash "$SCRIPT_DIR/backup.sh" --db-only ||
        die "The backup failed, so nothing was changed. Fix it, or run with --no-backup to update without one."
    else
      info "The database is not running yet: no backup taken."
    fi
  fi

  log "Building the new version (the site keeps running; it may feel slow for a few minutes)"
  if [ "$refresh" -eq 1 ]; then
    dc pull db caddy
    dc build --pull
  else
    dc build
  fi

  log "Database migrations"
  dc run --rm migrate ||
    die "The migration failed. The site is still running the previous version. Read the lines above; the dump made before this update is the newest db-*.dump in $(backup_dir)."

  log "Switching to the new version, one copy at a time"
  local service
  for service in $APP_SERVICES; do
    dc up -d --no-deps "$service"
    if ! wait_for_service "$service" 300; then
      show_app_trouble
      printf '\nTo go back to the version that was running before this update:\n' >&2
      printf '  sudo docker tag %s:previous %s:latest\n' "$APP_IMAGE" "$APP_IMAGE" >&2
      printf '  cd "%s" && sudo docker compose up -d --no-build %s\n' "$ROOT_DIR" "$APP_SERVICES" >&2
      die "The new version ($service) did not become healthy within 5 minutes. The other copy was not touched."
    fi
    info "$service is running the new version."
  done
  # Everything else (the proxy, anything new in docker-compose.yml).
  dc up -d --remove-orphans
  info "The new version is up and reaches the database."

  # Pages stored by the cache belong to the old version: throw them away.
  purge_page_cache

  # Picks up edits to deploy/aws/caddy/Caddyfile without dropping connections.
  if [ -n "$(service_container caddy)" ]; then
    dc exec -T caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null 2>&1 ||
      dc restart caddy
  fi

  log "Removing old images and build files"
  docker image prune -f >/dev/null || true
  docker builder prune -af --filter 'until=168h' >/dev/null 2>&1 || true

  log "Done. https://$(env_get DOMAIN) is running the new version."
}

main "$@"
