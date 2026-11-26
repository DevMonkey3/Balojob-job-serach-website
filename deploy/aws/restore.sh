#!/usr/bin/env bash
#
# Restores a Bhalojob backup made by backup.sh (see docs/aws-deploy.md).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=deploy/aws/lib.sh
. "$SCRIPT_DIR/lib.sh"

usage() {
  cat <<'EOF'
Usage:
  sudo bash deploy/aws/restore.sh --list
        Show the backups on this server.

  sudo bash deploy/aws/restore.sh latest
        Restore the newest database dump and the newest uploads archive.

  sudo bash deploy/aws/restore.sh 20261122-183000
        Restore the backup with that time stamp (as shown by --list).

  sudo bash deploy/aws/restore.sh /path/to/db-....dump [/path/to/uploads-....tar.gz]
        Restore these files, for example ones copied back from S3 or from your PC.

Options:
  --db-only             Restore the database only; leave the uploaded files alone.
  --yes                 Do not ask for confirmation.
  --no-safety-backup    Do not dump the current database first (use when it is
                        broken and cannot be dumped).

What it does:
  1. Dumps the current database as one more backup (the safety backup).
  2. Stops the app, replaces the WHOLE database with the dump, and puts the
     uploaded files from the archive back. Files already on the server are kept.
  3. Applies any newer migrations, starts the app and waits until it is healthy.

Passport numbers in a dump can only be read with the APP_ENCRYPTION_KEY that
was in /etc/bhalojob/bhalojob.env when the backup was made.
EOF
}

STAGE=""
on_exit() {
  local status=$?
  if [ "$status" -ne 0 ] && [ "$STAGE" = "restoring" ]; then
    printf '\nERROR: the restore stopped half way. The app is stopped and the database may be empty.\n' >&2
    printf 'Fix the problem shown above and run restore.sh again with the same file.\n' >&2
    printf 'The safety backup made at the start is the newest db-*.dump in the backup folder.\n' >&2
  fi
}
trap on_exit EXIT

list_backups() {
  local dir
  dir="$(backup_dir)"
  printf 'Backups in %s (newest last, times are UTC):\n\n' "$dir"
  if [ ! -d "$dir" ] || [ -z "$(find "$dir" -maxdepth 1 -type f \( -name 'db-*.dump' -o -name 'uploads-*.tar.gz' \) -print -quit)" ]; then
    printf '  (none)\n'
    return 0
  fi
  find "$dir" -maxdepth 1 -type f \( -name 'db-*.dump' -o -name 'uploads-*.tar.gz' \) -printf '%f\t%s\n' |
    sort -t- -k2,3 |
    awk -F'\t' '{ printf "  %-36s %8.1f MB\n", $1, $2 / 1048576 }'
}

# newest_file DIR PATTERN: the last matching file by name (the names sort by time).
newest_file() {
  find "$1" -maxdepth 1 -type f -name "$2" | sort | tail -n 1
}

wait_for_db() {
  local user="$1" database="$2" waited=0
  while [ "$waited" -lt 120 ]; do
    if dc exec -T db pg_isready -q -h 127.0.0.1 -U "$user" -d "$database" >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
    waited=$((waited + 2))
  done
  return 1
}

main() {
  local db_only=0 assume_yes=0 safety=1 do_list=0 arg
  local -a original_args=("$@") targets=()
  for arg in "$@"; do
    case "$arg" in
      -h | --help)
        usage
        exit 0
        ;;
      --list) do_list=1 ;;
      --db-only) db_only=1 ;;
      --yes) assume_yes=1 ;;
      --no-safety-backup) safety=0 ;;
      -*) die "Unknown option: $arg  (try --help)" ;;
      *) targets+=("$arg") ;;
    esac
  done
  require_root "${original_args[@]}"
  require_env_file

  if [ "$do_list" -eq 1 ]; then
    list_backups
    exit 0
  fi
  require_docker
  [ "${#targets[@]}" -ge 1 ] && [ "${#targets[@]}" -le 2 ] || {
    usage
    exit 1
  }

  local dir user database dump="" archive=""
  dir="$(backup_dir)"
  user="$(env_get POSTGRES_USER)"
  database="$(env_get POSTGRES_DB)"
  [ -n "$user" ] && [ -n "$database" ] || die "POSTGRES_USER or POSTGRES_DB is missing in $ENV_FILE."

  # ---- which files ----
  case "${targets[0]}" in
    latest)
      [ "${#targets[@]}" -eq 1 ] || die "'latest' takes no second argument."
      dump="$(newest_file "$dir" 'db-*.dump')"
      [ -n "$dump" ] || die "No database dump found in $dir."
      [ "$db_only" -eq 1 ] || archive="$(newest_file "$dir" 'uploads-*.tar.gz')"
      ;;
    [0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]-[0-9][0-9][0-9][0-9][0-9][0-9])
      [ "${#targets[@]}" -eq 1 ] || die "A time stamp takes no second argument."
      dump="$dir/db-${targets[0]}.dump"
      if [ "$db_only" -eq 0 ] && [ -f "$dir/uploads-${targets[0]}.tar.gz" ]; then
        archive="$dir/uploads-${targets[0]}.tar.gz"
      fi
      ;;
    *)
      dump="${targets[0]}"
      if [ "${#targets[@]}" -eq 2 ]; then
        [ "$db_only" -eq 0 ] || die "--db-only and an uploads archive were both given."
        archive="${targets[1]}"
      fi
      ;;
  esac
  [ -f "$dump" ] && [ -r "$dump" ] || die "Database dump not found: $dump  (see --list)"
  local mount=""
  if [ -n "$archive" ]; then
    [ -f "$archive" ] && [ -r "$archive" ] || die "Uploads archive not found: $archive"
    tar -tzf "$archive" >/dev/null 2>&1 || die "$archive is not a readable .tar.gz archive."
    mount="$(docker volume inspect -f '{{ .Mountpoint }}' "$UPLOADS_VOLUME" 2>/dev/null || true)"
    [ -n "$mount" ] && [ -d "$mount" ] && [ "$mount" != "/" ] ||
      die "The uploads volume ($UPLOADS_VOLUME) does not exist yet. On a new server run setup.sh first, then restore.sh again."
  fi

  # ---- the database must be up to check the dump and to restore into ----
  log "Checking the backup"
  dc up -d db
  wait_for_db "$user" "$database" || die "The database container did not become ready."
  dc exec -T db pg_restore --list <"$dump" >/dev/null ||
    die "$dump is not a readable PostgreSQL dump (custom format, made by backup.sh)."
  info "Database dump:    $dump"
  if [ -n "$archive" ]; then
    info "Uploads archive:  $archive"
  else
    info "Uploads archive:  none (the uploaded files stay as they are)"
  fi

  # ---- confirmation ----
  if [ "$assume_yes" -eq 0 ]; then
    printf '\nThis REPLACES the whole database "%s" with the dump above.\n' "$database"
    printf 'Everything entered on the site after that backup was made will be gone.\n'
    printf 'The site is offline while the restore runs.\n\n'
    [ -t 0 ] || die "No terminal to ask for confirmation. Add --yes to restore without asking."
    local answer=""
    read -r -p 'Type "restore" to continue: ' answer || true
    [ "$answer" = "restore" ] || die "Cancelled. Nothing was changed."
  fi

  # ---- safety backup of what is there now ----
  if [ "$safety" -eq 1 ]; then
    log "Safety backup of the current database"
    bash "$SCRIPT_DIR/backup.sh" --db-only ||
      die "The current database could not be dumped, so nothing was changed. If it is broken beyond dumping, run again with --no-safety-backup."
  fi

  install -d -m 700 -o root -g root "$dir"
  exec 9>"$dir/.lock"
  flock -n 9 || die "A backup is running. Try again in a minute."

  STAGE="restoring"

  log "Stopping the app"
  # shellcheck disable=SC2086
  dc stop $APP_SERVICES

  log "Restoring the database"
  dc exec -T db dropdb -U "$user" --if-exists --force "$database"
  dc exec -T db createdb -U "$user" -O "$user" "$database"
  dc exec -T db pg_restore -U "$user" -d "$database" \
    --clean --if-exists --no-owner --no-privileges --single-transaction <"$dump"
  info "Database restored."

  if [ -n "$archive" ]; then
    log "Putting the uploaded files back"
    # Files are added or overwritten, never deleted: upload names are random and unique.
    tar -xzf "$archive" -C "$mount" --no-same-owner
    chown -R "$APP_UID:$APP_GID" "$mount"
    info "Uploaded files restored."
  fi

  log "Applying migrations newer than the backup (if any)"
  dc run --rm migrate

  log "Starting the site"
  dc up -d --remove-orphans
  if ! wait_for_app 300; then
    show_app_trouble
    die "The data was restored, but the app did not become healthy within 5 minutes. See the lines above."
  fi
  STAGE="done"

  log "Restore finished. The site is running on the restored data."
}

main "$@"
