#!/usr/bin/env bash
#
# First-time setup of Bhalojob on a fresh Ubuntu Server 24.04 LTS machine
# (see docs/aws-deploy.md). Run it from the project folder:
#
#   sudo bash deploy/aws/setup.sh example.com
#
# It installs Docker, adds swap on a small server, creates the secrets, builds
# the app, prepares the database, starts everything and installs the nightly
# backup. Running it again is safe: nothing is created twice and the secrets
# are never regenerated.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=deploy/aws/lib.sh
. "$SCRIPT_DIR/lib.sh"

usage() {
  cat <<'EOF'
Usage: sudo bash deploy/aws/setup.sh [DOMAIN] [--skip-firewall]

  DOMAIN            The site's host name, for example example.com. Its DNS "A"
                    record must point at this server. Asked for when it is
                    left out and no earlier setup stored one. Passing a new
                    domain on a later run changes the site's address.
  --skip-firewall   Do not switch on the ufw firewall (same as SKIP_FIREWALL=1).

Environment:
  DOMAIN            Same as the argument.
  SWAP_SIZE_GB      Size of the swap file on servers with less than 4 GB RAM (default 2).
EOF
}

# apt-get that never stops to ask a question, and waits for another package
# job (a new server runs one right after boot) instead of failing.
apt_get() {
  DEBIAN_FRONTEND=noninteractive NEEDRESTART_SUSPEND=1 apt-get -o DPkg::Lock::Timeout=300 "$@"
}

# A new server is often still updating its package lists; try a few times.
apt_update() {
  local attempt
  for attempt in 1 2 3 4 5 6; do
    if apt_get update -q; then return 0; fi
    info "The package lists are busy. Trying again in 10 seconds ($attempt of 6)..."
    sleep 10
  done
  die "apt-get update keeps failing. Wait a minute and run this script again."
}

check_server() {
  local os_id os_version os_name
  [ -r /etc/os-release ] || die "This script is written for Ubuntu Server 24.04 LTS."
  os_id="$(. /etc/os-release && printf '%s' "${ID:-}")"
  os_version="$(. /etc/os-release && printf '%s' "${VERSION_ID:-}")"
  os_name="$(. /etc/os-release && printf '%s' "${PRETTY_NAME:-unknown}")"
  [ "$os_id" = "ubuntu" ] || die "This script is written for Ubuntu Server 24.04 LTS. This machine runs $os_name."
  [ "$os_version" = "24.04" ] || warn "This script was written for Ubuntu 24.04 LTS. This machine runs $os_name. Continuing."

  [ -f "$COMPOSE_FILE" ] && [ -f "$ROOT_DIR/Dockerfile" ] && [ -f "$ROOT_DIR/package-lock.json" ] ||
    die "$ROOT_DIR does not look like the Bhalojob project folder (docker-compose.yml, Dockerfile or package-lock.json is missing)."
  case "$ROOT_DIR" in
    *%* | *\"* | *$'\n'*) die "The project folder's path contains a character the backup schedule cannot handle (% or \"). Move it, for example to ~/bhalojob." ;;
  esac

  # First boot: let the server finish its own start-up work before touching packages.
  if command -v cloud-init >/dev/null 2>&1; then
    timeout 300 cloud-init status --wait >/dev/null 2>&1 || true
  fi
}

install_packages() {
  log "Installing basic packages"
  apt_update
  apt_get install -y -q --no-install-recommends ca-certificates curl openssl cron
  systemctl enable --now cron >/dev/null 2>&1 || true
}

setup_swap() {
  log "Swap (the build needs more memory than a small server has)"
  local mem_kb swap_kb size_gb free_kb
  mem_kb="$(awk '/^MemTotal:/ { print $2 }' /proc/meminfo)"
  swap_kb="$(awk '/^SwapTotal:/ { print $2 }' /proc/meminfo)"
  size_gb="${SWAP_SIZE_GB:-2}"
  [[ "$size_gb" =~ ^[1-9][0-9]?$ ]] || die "SWAP_SIZE_GB must be a whole number of gigabytes."

  # "4 GB" machines report a little less than 4,000,000 kB.
  if [ "$mem_kb" -ge 3600000 ]; then
    info "This server has 4 GB of RAM or more. No swap file needed."
    return 0
  fi
  if [ "$swap_kb" -gt 0 ]; then
    info "Swap is already on ($((swap_kb / 1024)) MB)."
    return 0
  fi

  if [ ! -f /swapfile ]; then
    free_kb="$(df -Pk / | awk 'NR == 2 { print $4 }')"
    [ "$free_kb" -gt $(((size_gb + 6) * 1024 * 1024)) ] ||
      die "Not enough free disk for a ${size_gb} GB swap file plus the build. Use a 30 GB disk as the guide says."
    info "Creating a ${size_gb} GB swap file at /swapfile..."
    fallocate -l "${size_gb}G" /swapfile 2>/dev/null ||
      dd if=/dev/zero of=/swapfile bs=1M count=$((size_gb * 1024)) status=none
    chmod 600 /swapfile
    mkswap /swapfile >/dev/null
  fi
  swapon /swapfile || die "/swapfile exists but could not be switched on. Remove it (sudo rm /swapfile) and run this script again."
  grep -q '^/swapfile[[:space:]]' /etc/fstab || printf '/swapfile none swap sw 0 0\n' >>/etc/fstab

  # Use swap only under real pressure, so the database stays in RAM.
  printf 'vm.swappiness=10\n' >/etc/sysctl.d/99-bhalojob.conf
  sysctl -q -p /etc/sysctl.d/99-bhalojob.conf || true
  info "Swap is on."
}

install_docker() {
  log "Docker"
  if docker compose version >/dev/null 2>&1; then
    info "Already installed: $(docker --version)"
  else
    info "Installing Docker Engine and the compose plugin from Docker's official apt repository..."
    local arch codename
    arch="$(dpkg --print-architecture)"
    codename="$(. /etc/os-release && printf '%s' "${UBUNTU_CODENAME:-$VERSION_CODENAME}")"
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc
    printf 'deb [arch=%s signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu %s stable\n' \
      "$arch" "$codename" >/etc/apt/sources.list.d/docker.list
    apt_update
    apt_get install -y -q docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  fi
  systemctl enable --now docker >/dev/null 2>&1 || true
  docker info >/dev/null 2>&1 || die "Docker is installed but not running. Look at:  sudo systemctl status docker"
  docker compose version >/dev/null 2>&1 || die "The Docker compose plugin is missing. Install the package docker-compose-plugin."
}

setup_firewall() {
  log "Firewall (ufw)"
  if [ "${SKIP_FIREWALL:-0}" = "1" ]; then
    info "Skipped on request. The AWS security group is then the only firewall."
    return 0
  fi
  command -v ufw >/dev/null 2>&1 || apt_get install -y -q ufw

  # Open SSH first, on whatever port(s) this server really uses, so enabling
  # the firewall can never lock you out.
  local ports port
  ports="$(sshd -T 2>/dev/null | awk '$1 == "port" { print $2 }' | sort -u || true)"
  [ -n "$ports" ] || ports="22"
  for port in $ports; do
    ufw allow "${port}/tcp" >/dev/null
  done
  ufw allow 80/tcp >/dev/null
  ufw allow 443/tcp >/dev/null
  ufw default deny incoming >/dev/null
  ufw default allow outgoing >/dev/null
  ufw --force enable >/dev/null
  info "On. Open ports: SSH ($(printf '%s' "$ports" | tr '\n' ' ')), 80 and 443."
  info "The AWS security group still decides who can reach these ports from the internet."
}

normalize_domain() {
  local d="$1"
  d="$(printf '%s' "$d" | tr '[:upper:]' '[:lower:]' | tr -d '[:space:]')"
  d="${d#http://}"
  d="${d#https://}"
  d="${d%%/*}"
  d="${d%.}"
  printf '%s' "$d"
}

# Sets SITE_DOMAIN from the argument, the stored value or a question, in that order.
choose_domain() {
  local wanted="$1" stored=""
  [ -f "$ENV_FILE" ] && stored="$(env_get DOMAIN)"

  if [ -z "$wanted" ] && [ -z "$stored" ]; then
    if [ -t 0 ]; then
      printf '\nWhich domain will the site use? Its DNS "A" record must point at this server.\n'
      read -r -p "Domain (for example example.com): " wanted || true
    fi
    [ -n "$wanted" ] || die "No domain given. Run:  sudo bash deploy/aws/setup.sh example.com"
  fi

  SITE_DOMAIN="$(normalize_domain "${wanted:-$stored}")"
  [[ "$SITE_DOMAIN" =~ ^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$ ]] ||
    die "'$SITE_DOMAIN' is not a host name. Give a name such as example.com, not an IP address. HTTPS needs a name; for a test you can use an sslip.io name (see docs/aws-deploy.md)."
}

# LENGTH random characters from a-z and 0-9.
random_lower_alnum() {
  local length="$1" out=""
  while [ "${#out}" -lt "$length" ]; do
    out="${out}$(openssl rand -base64 48 | LC_ALL=C tr -dc 'a-z0-9')"
  done
  printf '%s' "${out:0:length}"
}

# Creates the env file once. On later runs it is kept exactly as it is, apart
# from a changed DOMAIN and a missing ADMIN_PATH. Never prints a secret.
prepare_env_file() {
  log "Settings and secrets ($ENV_FILE)"
  install -d -m 700 -o root -g root "$ENV_DIR"

  if [ ! -f "$ENV_FILE" ]; then
    local pg_password encryption_key admin_path
    pg_password="$(openssl rand -hex 24)"
    encryption_key="$(openssl rand -base64 32)"
    admin_path="console-$(random_lower_alnum 12)"
    [ "${#pg_password}" -eq 48 ] && [ "${#encryption_key}" -eq 44 ] && [ "${#admin_path}" -eq 20 ] ||
      die "Could not generate the secrets (openssl gave an unexpected result). Nothing was written."

    (
      umask 077
      cat >"$ENV_FILE" <<EOF
# Bhalojob production settings. Created by deploy/aws/setup.sh on $(date -u +%Y-%m-%d).
# Every line is explained in deploy/aws/env.example.
#
# KEEP A COPY OF THIS FILE OUTSIDE THE SERVER (a password manager is ideal).
# Without APP_ENCRYPTION_KEY the stored passport numbers can never be read again.
# Do not change POSTGRES_PASSWORD, DATABASE_URL or APP_ENCRYPTION_KEY afterwards.

DOMAIN=$SITE_DOMAIN

POSTGRES_USER=bhalojob
POSTGRES_DB=bhalojob
POSTGRES_PASSWORD=$pg_password
DATABASE_URL=postgresql://bhalojob:$pg_password@db:5432/bhalojob?schema=public

APP_ENCRYPTION_KEY=$encryption_key

ADMIN_PATH=$admin_path

DATABASE_POOL_MAX=5
NEXT_BUILD_CPUS=1

BACKUP_DIR=$DEFAULT_BACKUP_DIR
BACKUP_KEEP_DAYS=$DEFAULT_BACKUP_KEEP_DAYS
BACKUP_S3_BUCKET=
EOF
    )
    chown root:root "$ENV_FILE"
    chmod 600 "$ENV_FILE"
    info "Created with new random secrets. Only root can read it."
  else
    chown root:root "$ENV_FILE"
    chmod 600 "$ENV_FILE"
    info "Already exists. Secrets are kept as they are."

    local stored
    stored="$(env_get DOMAIN)"
    if [ "$stored" != "$SITE_DOMAIN" ]; then
      env_set DOMAIN "$SITE_DOMAIN"
      info "Domain changed: ${stored:-(none)} -> $SITE_DOMAIN"
    fi
    if [ -z "$(env_get ADMIN_PATH)" ]; then
      env_set ADMIN_PATH "console-$(random_lower_alnum 12)"
      info "ADMIN_PATH was missing: a new secret staff-console address was generated."
    fi
  fi

  local key value bytes
  for key in DOMAIN POSTGRES_USER POSTGRES_DB POSTGRES_PASSWORD DATABASE_URL APP_ENCRYPTION_KEY ADMIN_PATH; do
    value="$(env_get "$key")"
    [ -n "$value" ] ||
      die "$key is missing or empty in $ENV_FILE. Put back the value from your safe copy of the file. (A lost APP_ENCRYPTION_KEY must not be replaced by a new one while the database holds passport numbers.)"
    case "$value" in
      *CHANGE_ME*) die "$key in $ENV_FILE still holds the placeholder from env.example. Fill in a real value. (Only on a brand-new server with no data yet: delete the file instead and run this script again, and it generates every secret for you.)" ;;
    esac
  done
  bytes="$(env_get APP_ENCRYPTION_KEY | base64 -d 2>/dev/null | wc -c | tr -d '[:space:]' || true)"
  [ "$bytes" = "32" ] || die "APP_ENCRYPTION_KEY in $ENV_FILE must be 32 random bytes in base64 (44 characters)."
  [[ "$(env_get ADMIN_PATH)" =~ ^[A-Za-z0-9_-]{3,64}$ ]] ||
    die "ADMIN_PATH in $ENV_FILE must be one URL segment: 3 to 64 letters, digits, '-' or '_'."
  [ "$(env_get ADMIN_PATH)" != "admin" ] || warn "ADMIN_PATH is 'admin', which anyone can guess. Use a random value such as the one setup generates."

  link_env_file
}

server_public_ip() {
  local token ip=""
  token="$(curl -fsS -m 3 -X PUT -H 'X-aws-ec2-metadata-token-ttl-seconds: 60' http://169.254.169.254/latest/api/token 2>/dev/null || true)"
  if [ -n "$token" ]; then
    ip="$(curl -fsS -m 3 -H "X-aws-ec2-metadata-token: $token" http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || true)"
  fi
  [ -n "$ip" ] || ip="$(curl -fsS -m 5 https://checkip.amazonaws.com 2>/dev/null || true)"
  printf '%s' "$ip" | tr -d '[:space:]'
}

# HTTPS only works once the domain points here. Says so early instead of
# leaving a certificate error to be found later. Sets DNS_OK.
check_dns() {
  log "DNS check for $SITE_DOMAIN"
  local ip resolved
  DNS_OK=0
  ip="$(server_public_ip)"
  resolved="$(getent ahostsv4 "$SITE_DOMAIN" 2>/dev/null | awk '{ print $1 }' | sort -u | tr '\n' ' ' || true)"
  resolved="${resolved% }"

  if [ -z "$ip" ]; then
    warn "Could not find this server's public IP address, so the DNS check was skipped."
  elif [ -z "$resolved" ]; then
    warn "$SITE_DOMAIN does not resolve yet. Create an A record that points at $ip. Setup continues; HTTPS starts working a few minutes after the record exists."
  elif [[ " $resolved " == *" $ip "* ]]; then
    DNS_OK=1
    info "$SITE_DOMAIN points at this server ($ip)."
  else
    warn "$SITE_DOMAIN points at $resolved, but this server is $ip. Fix the A record (and attach the Elastic IP if you have not). Setup continues; HTTPS starts working after the record is right."
  fi
}

start_everything() {
  log "Building the app (the first build takes 5 to 15 minutes on a small server)"
  dc build

  log "Starting the database"
  dc up -d db

  log "Database migrations and master data"
  dc run --rm migrate

  log "Starting the site"
  dc up -d --remove-orphans

  log "Waiting for the app to answer"
  if ! wait_for_app 300; then
    show_app_trouble
    die "The app did not become healthy within 5 minutes. The lines above usually say why. Fix it and run this script again."
  fi
  info "The app is up and reaches the database."
}

install_backup_cron() {
  log "Nightly backup"
  install -d -m 700 -o root -g root "$(backup_dir)"
  cat >/etc/cron.d/bhalojob-backup <<EOF
# Nightly Bhalojob backup: database dump + uploaded files. Installed by deploy/aws/setup.sh.
# 18:30 UTC is 03:30 in Japan (the server clock is UTC unless you changed it).
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/snap/bin
30 18 * * * root /bin/bash "$SCRIPT_DIR/backup.sh" >>/var/log/bhalojob-backup.log 2>&1
EOF
  chmod 644 /etc/cron.d/bhalojob-backup
  local keep
  keep="$(env_get BACKUP_KEEP_DAYS)"
  info "Every night at 03:30 Japan time into $(backup_dir), kept for ${keep:-$DEFAULT_BACKUP_KEEP_DAYS} days."
  info "Log: /var/log/bhalojob-backup.log"
}

# Asks Caddy on this machine for the site over HTTPS. Succeeds only once the
# certificate has been issued. Sets HTTPS_OK.
wait_for_https() {
  log "Waiting for the HTTPS certificate (Let's Encrypt)"
  local waited=0 timeout=180
  HTTPS_OK=0
  [ "$DNS_OK" = "1" ] || timeout=30
  while [ "$waited" -lt "$timeout" ]; do
    if curl -fsS -m 10 -o /dev/null --resolve "$SITE_DOMAIN:443:127.0.0.1" "https://$SITE_DOMAIN/api/health" 2>/dev/null; then
      HTTPS_OK=1
      info "https://$SITE_DOMAIN answers with a valid certificate."
      return 0
    fi
    sleep 5
    waited=$((waited + 5))
  done
  return 0
}

print_summary() {
  local admin_path
  admin_path="$(env_get ADMIN_PATH)"

  printf '\n'
  printf '======================================================================\n'
  if [ "$HTTPS_OK" = "1" ]; then
    printf ' Bhalojob is running.\n'
  else
    printf ' Bhalojob is running on this server, but HTTPS IS NOT READY YET.\n'
    printf '\n'
    printf ' Almost always this means the domain does not point at this server yet,\n'
    printf ' or ports 80/443 are closed in the AWS security group. Fix that; Caddy\n'
    printf ' keeps trying by itself. Watch it with:\n'
    printf '   sudo docker compose logs -f caddy      (run in %s)\n' "$ROOT_DIR"
  fi
  printf '\n'
  printf '   Site:           https://%s\n' "$SITE_DOMAIN"
  printf '   Staff console:  https://%s/%s/login\n' "$SITE_DOMAIN" "$admin_path"
  printf '                   (secret address: do not publish it or link to it)\n'
  printf '\n'
  if [ "$HTTPS_OK" = "1" ]; then
    printf ' DO THIS NOW: open the staff console address and create the first\n'
  else
    printf ' AS SOON AS HTTPS WORKS: open the staff console address and create the first\n'
  fi
  printf ' Administrator. Until you do, whoever opens that page first can.\n'
  printf '\n'
  printf ' !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n'
  printf ' !!  COPY THE SETTINGS FILE TO A SAFE PLACE OUTSIDE THIS SERVER    !!\n'
  printf ' !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n'
  printf '   File:  %s\n' "$ENV_FILE"
  printf '   Show:  sudo cat %s\n' "$ENV_FILE"
  printf '   (The staff console address is the ADMIN_PATH line in that file.)\n'
  printf '   It holds the database password and APP_ENCRYPTION_KEY. If that key\n'
  printf '   is lost, the passport numbers stored in the database can never be\n'
  printf '   read again. Paste the file into a password manager today.\n'
  printf '\n'
  printf '   Update the site later:   sudo bash deploy/aws/update.sh\n'
  printf '   Back up now:             sudo bash deploy/aws/backup.sh\n'
  printf '   Guide:                   docs/aws-deploy.md\n'
  printf '======================================================================\n'
}

main() {
  local domain_arg="${DOMAIN:-}" arg
  local -a original_args=("$@")
  for arg in "$@"; do
    case "$arg" in
      -h | --help)
        usage
        exit 0
        ;;
      --skip-firewall) SKIP_FIREWALL=1 ;;
      -*) die "Unknown option: $arg  (try --help)" ;;
      *) domain_arg="$arg" ;;
    esac
  done
  export SKIP_FIREWALL="${SKIP_FIREWALL:-0}"
  require_root "${original_args[@]}"

  SITE_DOMAIN=""
  DNS_OK=0
  HTTPS_OK=0

  log "Bhalojob setup in $ROOT_DIR"
  check_server
  choose_domain "$domain_arg"
  install_packages
  setup_swap
  install_docker
  setup_firewall
  prepare_env_file
  check_dns
  start_everything
  install_backup_cron
  wait_for_https
  print_summary
}

main "$@"
