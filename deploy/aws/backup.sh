#!/usr/bin/env bash
#
# Backs up the Bhalojob database and the uploaded files (see docs/aws-deploy.md).
# Runs every night from /etc/cron.d/bhalojob-backup, and by hand any time.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=deploy/aws/lib.sh
. "$SCRIPT_DIR/lib.sh"

usage() {
  cat <<'EOF'
Usage:
  sudo bash deploy/aws/backup.sh             database + uploaded files
  sudo bash deploy/aws/backup.sh --db-only   database only

Written to BACKUP_DIR (default /var/backups/bhalojob), readable by root only:

  db-YYYYMMDD-HHMMSS.dump          pg_dump, custom format (compressed)
  uploads-YYYYMMDD-HHMMSS.tar.gz   every uploaded file

Times in the file names are UTC. Files older than BACKUP_KEEP_DAYS (default
14) are deleted, but only after a new backup succeeded. When BACKUP_S3_BUCKET
is set, the new files are also copied to that S3 bucket using the server's
IAM role (no access keys on disk). Restore with restore.sh.
EOF
}

PARTIAL_DIR=""
cleanup() {
  if [ -n "$PARTIAL_DIR" ]; then
    rm -f "$PARTIAL_DIR"/*.partial 2>/dev/null || true
  fi
}
trap cleanup EXIT

human_size() {
  du -h "$1" | awk '{ print $1 }'
}

main() {
  local db_only=0 arg
  local -a original_args=("$@")
  for arg in "$@"; do
    case "$arg" in
      --db-only) db_only=1 ;;
      -h | --help)
        usage
        exit 0
        ;;
      *) die "Unknown option: $arg  (try --help)" ;;
    esac
  done
  require_root "${original_args[@]}"
  require_env_file
  require_docker
  umask 077

  local dir keep bucket user database stamp
  dir="$(backup_dir)"
  keep="$(env_get BACKUP_KEEP_DAYS)"
  keep="${keep:-$DEFAULT_BACKUP_KEEP_DAYS}"
  [[ "$keep" =~ ^[1-9][0-9]*$ ]] || die "BACKUP_KEEP_DAYS in $ENV_FILE must be a number of days, 1 or more."
  bucket="$(env_get BACKUP_S3_BUCKET)"
  user="$(env_get POSTGRES_USER)"
  database="$(env_get POSTGRES_DB)"
  [ -n "$user" ] && [ -n "$database" ] || die "POSTGRES_USER or POSTGRES_DB is missing in $ENV_FILE."
  stamp="$(date -u +%Y%m%d-%H%M%S)"

  install -d -m 700 -o root -g root "$dir"

  # One backup or restore at a time.
  exec 9>"$dir/.lock"
  flock -n 9 || die "Another backup or restore is running. Try again in a minute."
  # From here on this run owns the folder: unfinished files are removed on exit.
  PARTIAL_DIR="$dir"

  printf '\n[%s] Bhalojob backup started\n' "$(date -u '+%Y-%m-%d %H:%M:%S UTC')"

  [ -n "$(service_container db)" ] ||
    die "The database container is not running. Start the site first (sudo docker compose up -d in $ROOT_DIR)."

  # Refuse to fill the disk: a full disk would stop the database itself.
  local mount="" uploads_kb=0 free_kb
  if [ "$db_only" -eq 0 ]; then
    mount="$(docker volume inspect -f '{{ .Mountpoint }}' "$UPLOADS_VOLUME" 2>/dev/null || true)"
    [ -n "$mount" ] && [ -d "$mount" ] || die "The uploads volume ($UPLOADS_VOLUME) was not found."
    uploads_kb="$(du -sk "$mount" | awk '{ print $1 }')"
  fi
  free_kb="$(df -Pk "$dir" | awk 'NR == 2 { print $4 }')"
  [ "$free_kb" -gt $((uploads_kb + 1024 * 1024)) ] ||
    die "Not enough free disk space in $dir for a new backup. Free some space (see 'Disk is full' in docs/aws-deploy.md)."

  local -a made=()

  # ---- database ----
  local db_file="$dir/db-$stamp.dump"
  dc exec -T db pg_dump -U "$user" -d "$database" --format=custom >"$db_file.partial"
  # Read the dump's table of contents back, so a broken file is never kept as a backup.
  dc exec -T db pg_restore --list <"$db_file.partial" >/dev/null ||
    die "The database dump could not be read back. No backup was kept."
  mv "$db_file.partial" "$db_file"
  made+=("$db_file")
  info "Database:  $db_file ($(human_size "$db_file"))"

  # ---- uploaded files ----
  if [ "$db_only" -eq 0 ]; then
    local up_file="$dir/uploads-$stamp.tar.gz" rc=0
    tar -czf "$up_file.partial" -C "$mount" . || rc=$?
    # tar ends with 1 when a file changed while it was read; the archive is still usable.
    [ "$rc" -le 1 ] || die "Archiving the uploaded files failed (tar exit code $rc)."
    mv "$up_file.partial" "$up_file"
    made+=("$up_file")
    info "Uploads:   $up_file ($(human_size "$up_file"))"
  fi

  # ---- optional copy to S3 ----
  local s3_failed=0 file
  if [ -n "$bucket" ]; then
    bucket="${bucket#s3://}"
    bucket="${bucket%/}"
    if ! command -v aws >/dev/null 2>&1; then
      warn "BACKUP_S3_BUCKET is set but the AWS CLI is not installed (sudo snap install aws-cli --classic). The backup on this server is fine; nothing was copied to S3."
      s3_failed=1
    else
      for file in "${made[@]}"; do
        if aws s3 cp --only-show-errors "$file" "s3://$bucket/$(basename "$file")"; then
          info "Copied to s3://$bucket/$(basename "$file")"
        else
          warn "Could not copy $(basename "$file") to s3://$bucket. Check the server's IAM role and the bucket name."
          s3_failed=1
        fi
      done
    fi
  fi

  # ---- delete old backups (only reached when the new one succeeded) ----
  local deleted
  deleted="$(find "$dir" -maxdepth 1 -type f \( -name 'db-*.dump' -o -name 'uploads-*.tar.gz' \) -mmin "+$((keep * 24 * 60))" -print -delete | wc -l | tr -d '[:space:]')"
  [ "$deleted" = "0" ] || info "Deleted $deleted backup file(s) older than $keep days."

  printf '[%s] Bhalojob backup finished\n' "$(date -u '+%Y-%m-%d %H:%M:%S UTC')"
  if [ "$s3_failed" -ne 0 ]; then
    exit 2
  fi
}

main "$@"
