# Deploying Bhalojob to AWS (one server)

This guide puts Bhalojob on the internet on one AWS server in Tokyo. You do not need to know AWS or Linux. Follow the steps in order and copy the commands as they are. The first time takes about an hour, most of it waiting.

You do the AWS clicks once (Parts 3 to 5). After that, one command on the server installs and starts everything, the database included:

```bash
sudo bash deploy/aws/setup.sh example.com
```

In this guide, replace:

| Written here | Replace with |
|---|---|
| `example.com` | your domain |
| `203.0.113.10` | your server's Elastic IP (Part 4) |
| `bhalojob-key.pem` | the key file you download in Part 3 |
| `OWNER/REPO` | the GitHub repository, for example `my-company/bhalojob-web` |

Contents: [1 What you get](#1-what-you-get) · [2 Before you start](#2-before-you-start) · [3 Launch the server](#3-launch-the-server) · [4 Fixed IP address](#4-give-the-server-a-fixed-ip-address) · [5 Domain](#5-point-the-domain-at-the-server) · [6 Connect](#6-connect-to-the-server) · [7 Get the code](#7-put-the-code-on-the-server) · [8 Run the setup](#8-run-the-setup) · [9 First Administrator](#9-create-the-first-administrator-now) · [10 Updating](#10-update-to-a-new-version) · [11 Backups](#11-backups-and-restore) · [12 Logs and restart](#12-logs-status-and-restart) · [13 Security checklist](#13-security-checklist) · [14 Troubleshooting](#14-troubleshooting) · [15 Growing later](#15-growing-later) · [16 Files of the kit](#16-files-of-the-kit)

---

## 1. What you get

One EC2 server (Ubuntu 24.04, type t3.small, 2 GB RAM, 30 GB disk) running four containers with Docker Compose:

```
 Internet ──► ports 80 / 443
                 │
              ┌──▼───┐  HTTPS certificate (Let's Encrypt, automatic), HTTP → HTTPS,
              │ caddy│  compression, security headers, 12 MB request limit
              └──┬───┘
                 │ private Docker network (not reachable from outside)
              ┌──▼───┐        ┌─────────┐
              │ app  │───────►│   db    │  PostgreSQL 18
              └──┬───┘        └────┬────┘
                 │                 │
          uploaded files      database files         (Docker volumes on the server's disk)

 migrate: a job that runs before the app on every deploy. It applies new
 database migrations and loads the dropdown lists the first time. Then it exits.
```

Where things live on the server:

| What | Where |
|---|---|
| The code | `~/bhalojob` (the folder you create in Part 7) |
| Settings and secrets | `/etc/bhalojob/bhalojob.env` (only root can read it) |
| Database | Docker volume `bhalojob-db-data` |
| Uploaded résumés and photos | Docker volume `bhalojob-uploads` |
| HTTPS certificates | Docker volume `bhalojob-caddy-data` |
| Nightly backups | `/var/backups/bhalojob` (last 14 days) |
| Backup log | `/var/log/bhalojob-backup.log` |

The code folder holds no data and no secrets. You can delete it and upload it again without losing anything.

### What costs money

AWS charges for these while they exist. This guide does not quote prices, because they change. Put the list into the [AWS Pricing Calculator](https://calculator.aws/) (region: Asia Pacific (Tokyo)) to see your monthly cost.

- The EC2 instance (t3.small), per hour it is running.
- The disk (EBS gp3, 30 GB), per month, also while the instance is stopped.
- The public IPv4 address (the Elastic IP), per hour.
- Data sent from the server to visitors (data transfer out).
- CPU credits: T3 instances run in "unlimited" mode by default, which can add a charge when the CPU stays busy for long stretches.
- Optional, only if you set them up: an S3 bucket for backup copies, disk snapshots.

Set a budget alert so a surprise shows up early: AWS console → search **Budgets** → **Create budget** → **Use a template** → **Monthly cost budget**.

---

## 2. Before you start

You need:

1. **An AWS account** with a payment method. Sign in at <https://console.aws.amazon.com/>. Turn on MFA for the account (top right, your account name → **Security credentials** → **Assign MFA device**).
2. **A domain name** and the login of the place where its DNS is managed (the registrar, Route 53, Cloudflare, …). A subdomain such as `jobs.example.com` works too.
3. **The code on GitHub.** A private repository is fine.
4. **A PC with a terminal.** Windows 10/11 already has `ssh` and `scp` in PowerShell.

Why a domain is required: the site only works over HTTPS. Its login cookies are marked "Secure", so over plain `http://` nobody can stay signed in. The free HTTPS certificate is issued for a name, not for a bare IP address. So the domain has to point at the server before the site is usable.

---

## 3. Launch the server

1. Sign in to the AWS console.
2. At the top right, open the region list and choose **Asia Pacific (Tokyo) ap-northeast-1**.
3. In the search box at the top, type `EC2` and open **EC2**.
4. Click **Launch instance**.
5. **Name and tags** → Name: `bhalojob`.
6. **Application and OS Images** → click **Ubuntu** → choose **Ubuntu Server 24.04 LTS (HVM), SSD Volume Type**. Architecture: **64-bit (x86)**.
7. **Instance type** → `t3.small`.
8. **Key pair (login)** → **Create new key pair** → Name: `bhalojob-key`, type **ED25519**, format **.pem** → **Create key pair**. The browser downloads `bhalojob-key.pem`. Keep this file safe. It is the key to the server and AWS cannot give it to you again.
9. **Network settings** → keep **Create security group** and set:
   - **Allow SSH traffic from** → ticked, and change `Anywhere` to **My IP**.
   - **Allow HTTPS traffic from the internet** → ticked.
   - **Allow HTTP traffic from the internet** → ticked.
10. **Configure storage** → change the size to `30` GiB, type `gp3`. Click **Advanced** and set **Encrypted** to **Encrypted** (keep the default key). The site stores personal data, so the disk should be encrypted.
11. **Advanced details** (optional, recommended) → **Termination protection** → **Enable**. This stops the server from being deleted by one wrong click.
12. Click **Launch instance**, then **View all instances**. Wait until **Instance state** is `Running` and **Status check** says the checks passed (2 to 3 minutes).

The security group now lets the world reach ports 80 and 443 (the website) and only your current IP address reach port 22 (SSH). Never add rules for ports 5432 (database) or 3000 (app). They are not needed.

---

## 4. Give the server a fixed IP address

Without this step the server's address changes every time it is stopped and started.

1. In the EC2 left menu: **Network & Security** → **Elastic IPs**.
2. Click **Allocate Elastic IP address** → **Allocate**.
3. Select the new address → **Actions** → **Associate Elastic IP address**.
4. Resource type: **Instance** → choose `bhalojob` → **Associate**.
5. Write the address down. This guide calls it `203.0.113.10`.

An Elastic IP that is not attached to a running server still costs money. If you ever delete the server, also release the address (**Actions** → **Release Elastic IP addresses**).

---

## 5. Point the domain at the server

1. Open the DNS settings of your domain (at your registrar or DNS provider).
2. Add a record:

   | Field | Value |
   |---|---|
   | Type | `A` |
   | Name / Host | `@` for `example.com` itself, or the subdomain part (for example `jobs`) |
   | Value / Points to | `203.0.113.10` (your Elastic IP) |
   | TTL | `300` (or the default) |

3. If the provider is Cloudflare, set the record to **DNS only** (grey cloud), not "Proxied".
4. Wait a few minutes, then check from your PC:

   ```bash
   nslookup example.com
   ```

   The answer must show your Elastic IP. If it shows something else or nothing, wait and try again. It can take from a minute to an hour.

Do this before Part 8. The setup script asks Let's Encrypt for the certificate, and Let's Encrypt checks that the domain really points at the server.

**Only for a test, when you have no domain yet:** the free service sslip.io turns an IP address into a name. For `203.0.113.10` the name is `203-0-113-10.sslip.io` (dashes instead of dots). Use that name as the domain in Part 8 and skip the DNS record. Do not use it for the real site: the name is not yours, and the certificate limits are shared with everyone else who uses the service, so the certificate can fail. Switch to the real domain later with one command (see [Change the domain](#change-the-domain)).

---

## 6. Connect to the server

Choose one way. Both end in a terminal on the server where you type the commands of this guide.

### Way A: SSH from your PC (recommended)

1. Open PowerShell (Windows) or Terminal (Mac).
2. Run this, with the real path of the key file:

   ```bash
   ssh -i ~/Downloads/bhalojob-key.pem ubuntu@203.0.113.10
   ```

3. The first time it asks `Are you sure you want to continue connecting?` Type `yes`.
4. You are in when the prompt looks like `ubuntu@ip-172-31-…:~$`.

The user name is always `ubuntu`.

If it says the key file's permissions are too open:

- Windows (PowerShell): `icacls $HOME\Downloads\bhalojob-key.pem /inheritance:r /grant:r "$($env:USERNAME):(R)"`
- Mac / Linux: `chmod 400 ~/Downloads/bhalojob-key.pem`

If it hangs and then says `Connection timed out`, your internet address changed since Part 3. Fix: EC2 → **Security Groups** → the group of the server → **Edit inbound rules** → on the SSH rule choose **My IP** again → **Save rules**.

### Way B: EC2 Instance Connect (in the browser, no key file)

1. First let the AWS service reach port 22: EC2 → **Security Groups** → the group of the server → **Edit inbound rules** → **Add rule** → Type **SSH** → in the Source box type `ec2-instance-connect` and choose the entry that ends in `ap-northeast-1.ec2-instance-connect` → **Save rules**.
2. EC2 → **Instances** → tick `bhalojob` → **Connect** → tab **EC2 Instance Connect** → User name `ubuntu` → **Connect**.

A terminal opens in a browser tab.

---

## 7. Put the code on the server

Choose one way. Way A makes later updates one command.

### Way A: clone from GitHub with a read-only deploy key (recommended)

A deploy key lets this one server read this one repository. It cannot change it and it gives no access to your other repositories.

1. On the server, create the key and show its public half:

   ```bash
   ssh-keygen -t ed25519 -f ~/.ssh/bhalojob_deploy -N "" -C "bhalojob-server"
   cat ~/.ssh/bhalojob_deploy.pub
   ```

2. Copy the whole line that starts with `ssh-ed25519`.
3. On GitHub: open the repository → **Settings** → **Deploy keys** → **Add deploy key**. Title: `bhalojob-server`. Paste the line into **Key**. Leave **Allow write access** unticked. Click **Add key**.
4. Back on the server, tell git to use that key for GitHub:

   ```bash
   cat >> ~/.ssh/config <<'EOF'
   Host github.com
     IdentityFile ~/.ssh/bhalojob_deploy
     IdentitiesOnly yes
   EOF
   chmod 600 ~/.ssh/config
   ```

5. Clone the repository. Replace `OWNER/REPO`, and replace `main` with the branch you want to run in production:

   ```bash
   git clone --branch main git@github.com:OWNER/REPO.git ~/bhalojob
   ```

   The first time it asks whether to trust `github.com`. Type `yes`.

### Way B: upload an archive from your PC (no GitHub access on the server)

1. On your PC, in the project folder, make an archive of the committed code:

   ```bash
   git archive --format=tar.gz -o bhalojob.tar.gz HEAD
   ```

   Use this command and not a zip of the folder. It leaves out `node_modules`, `.env.local` and other local files, and it gives the scripts the line endings Linux needs.

2. Copy it to the server:

   ```bash
   scp -i ~/Downloads/bhalojob-key.pem bhalojob.tar.gz ubuntu@203.0.113.10:~/
   ```

3. On the server, unpack it:

   ```bash
   mkdir -p ~/bhalojob && tar -xzf ~/bhalojob.tar.gz -C ~/bhalojob
   ```

---

## 8. Run the setup

On the server:

```bash
cd ~/bhalojob
sudo bash deploy/aws/setup.sh example.com
```

That is the whole installation. It takes 10 to 20 minutes, most of it the first build. Leave the terminal open. The script:

1. Installs Docker from Docker's official package repository.
2. Adds a 2 GB swap file, because the build needs more memory than a 2 GB server has.
3. Switches on the Ubuntu firewall (`ufw`) with only SSH, 80 and 443 open.
4. Creates `/etc/bhalojob/bhalojob.env` with new random secrets: the database password, the encryption key for passport numbers, and the secret address of the staff console.
5. Builds the app.
6. Starts PostgreSQL, creates the tables (`prisma migrate deploy`) and loads the master data (dropdown lists) from `db/seed.sql`. The demo data in `db/sample-data.sql` is never loaded and is not even inside the images.
7. Starts the app and Caddy, and waits until the site answers over HTTPS.
8. Installs the nightly backup.

At the end it prints a box like this:

```
======================================================================
 Bhalojob is running.

   Site:           https://example.com
   Staff console:  https://example.com/console-xxxxxxxxxxxx/login
                   (secret address: do not publish it or link to it)
 ...
```

Now do these two things, in this order.

**1. Save the settings file outside the server.** Show it:

```bash
sudo cat /etc/bhalojob/bhalojob.env
```

Copy everything it prints into a password manager (or another safe place that is not this server). It contains `APP_ENCRYPTION_KEY`. If that key is lost, for example because the server's disk dies, the passport numbers stored in the database can never be read again, even if you have a database backup. Clear the terminal afterwards with `clear`.

**2. Create the first Administrator** (Part 9).

The script is safe to run again at any time. It does not create anything twice and it never changes the secrets. If it stops with an error, read the last lines, look at [Troubleshooting](#14-troubleshooting), fix the cause and run the same command again.

If the box says **HTTPS IS NOT READY YET**: the server is fine, but the certificate could not be issued. See the first row of [Troubleshooting](#14-troubleshooting).

---

## 9. Create the first Administrator, now

While the database has no staff account, the staff login page offers to create the first Administrator. Whoever opens that page first gets the account. The address is secret, but do not leave it open.

1. Open the **Staff console** address from the box in your browser: `https://example.com/console-xxxxxxxxxxxx/login`.
2. The page shows 初期管理者の作成. Enter a name, an email address and a password of at least 8 characters. Use a long password that you use nowhere else.
3. You are now signed in as Administrator. Sign out and in again once to check the password.
4. In the console open マスタ → the settings screen (BHALO816) and enter the real inboxes for contact requests. The seed data only puts placeholders there.
5. Add the other staff accounts on the ユーザ screen.

Keep the console address like a password. It is not linked from the public site and `https://example.com/admin` answers "not found" on purpose. If you forget it:

```bash
sudo grep ADMIN_PATH /etc/bhalojob/bhalojob.env
```

The address is `https://example.com/` + that value + `/login`.

To check the site from outside at any time, open `https://example.com/api/health`. It shows `{"status":"ok"}` when the app runs and reaches the database. You can give this address to an uptime-monitoring service.

---

## 10. Update to a new version

### If you cloned from GitHub (Part 7, Way A)

Push your changes to GitHub as usual. Then on the server:

```bash
cd ~/bhalojob
sudo bash deploy/aws/update.sh
```

### If you upload archives (Part 7, Way B)

Make and upload a new archive as in Part 7. Then on the server:

```bash
rm -rf ~/bhalojob && mkdir -p ~/bhalojob && tar -xzf ~/bhalojob.tar.gz -C ~/bhalojob
cd ~/bhalojob
sudo bash deploy/aws/update.sh
```

Deleting the folder is safe: the data and the secrets are not in it.

### What the update does

1. Gets the newest code (`git pull`, Way A only).
2. Dumps the database into the backup folder.
3. Builds the new version while the current one keeps serving visitors. The site can feel slow for a few minutes.
4. Applies new database migrations.
5. Swaps the app container. This takes a few seconds. Requests that arrive in that moment wait instead of failing.
6. Deletes old images.

If the build or a migration fails, the script stops and the site keeps running the previous version.

### Go back to the previous version

If the new version starts but misbehaves, switch back to the image that ran before:

```bash
cd ~/bhalojob
sudo docker tag bhalojob-app:previous bhalojob-app:latest
sudo docker compose up -d --no-build app
```

This does not undo database migrations. Then fix the code and run `update.sh` again.

### Once a month: security updates

```bash
cd ~/bhalojob
sudo bash deploy/aws/update.sh --refresh-images
sudo apt-get update && sudo apt-get -y upgrade
```

The first command also fetches the newest PostgreSQL 18, Caddy and Node.js images. The second updates Ubuntu itself. If it then says a restart is needed, run `sudo reboot`. After a reboot everything starts again by itself in about a minute.

### Change a setting

```bash
sudo nano /etc/bhalojob/bhalojob.env
sudo bash deploy/aws/update.sh --no-pull
```

Every line is explained in `deploy/aws/env.example`. Do not change `POSTGRES_PASSWORD`, `DATABASE_URL` or `APP_ENCRYPTION_KEY`. To get a new secret staff-console address, change `ADMIN_PATH` (letters, digits and `-` only) and run the second command.

### Change the domain

Point the new domain's A record at the server first (Part 5). Then:

```bash
cd ~/bhalojob
sudo bash deploy/aws/setup.sh new-domain.example
```

---

## 11. Backups and restore

### What happens by itself

Every night at 03:30 Japan time the server writes two files into `/var/backups/bhalojob`:

- `db-YYYYMMDD-HHMMSS.dump`: the whole database (compressed `pg_dump`).
- `uploads-YYYYMMDD-HHMMSS.tar.gz`: every uploaded file.

Files older than 14 days are deleted. The times in the file names are UTC (Japan time minus 9 hours).

Check once a week that it works:

```bash
sudo bash deploy/aws/restore.sh --list
sudo tail -n 20 /var/log/bhalojob-backup.log
```

Make a backup right now:

```bash
sudo bash deploy/aws/backup.sh
```

These backups are on the same disk as the site. They protect against a bad update or a deleted record, not against losing the server. For that, copy them elsewhere: see [Copy the backups to S3](#copy-the-backups-to-s3) below, or download one to your PC from time to time:

```bash
# On the server: put a copy where your user can read it (use a real file name from --list)
sudo cp /var/backups/bhalojob/db-20261122-183000.dump ~/ && sudo chown ubuntu: ~/db-20261122-183000.dump

# On your PC
scp -i ~/Downloads/bhalojob-key.pem ubuntu@203.0.113.10:~/db-20261122-183000.dump .

# On the server again: remove the copy
rm ~/db-20261122-183000.dump
```

A dump contains personal data of candidates and employers. Store it as carefully as the live database.

### Restore on the same server

```bash
cd ~/bhalojob
sudo bash deploy/aws/restore.sh --list          # see what there is
sudo bash deploy/aws/restore.sh latest          # newest backup
sudo bash deploy/aws/restore.sh 20261122-183000 # or one specific backup
```

The script asks you to type `restore` first. Then it:

1. Dumps the current database as one more backup, so the restore itself can be undone.
2. Stops the app and replaces the whole database with the dump.
3. Puts the uploaded files from the archive back. Files that are on the server now are kept.
4. Applies newer migrations if the code is newer than the backup, starts the app and waits until it is healthy.

Everything entered on the site after that backup was made is gone afterwards. The site is offline for a minute or two.

### Restore on a new server (the old one is lost)

You need three things you saved earlier: the settings file (Part 8), a database dump and an uploads archive.

1. Create a new server: Parts 3, 6 and 7. In Part 4, attach the same Elastic IP to the new server instead of allocating a new one.
2. Before running the setup, put your saved settings file in place:

   ```bash
   sudo mkdir -p /etc/bhalojob
   sudo nano /etc/bhalojob/bhalojob.env     # paste the saved content, save with Ctrl+O, Enter, Ctrl+X
   ```

3. Run the setup. It keeps your file and creates an empty site:

   ```bash
   cd ~/bhalojob
   sudo bash deploy/aws/setup.sh
   ```

4. Copy the two backup files to the server (`scp`, as in Part 7 Way B), then restore them:

   ```bash
   sudo bash deploy/aws/restore.sh ~/db-20261122-183000.dump ~/uploads-20261122-183000.tar.gz
   ```

With the same `APP_ENCRYPTION_KEY` in the settings file, the stored passport numbers are readable again.

### Copy the backups to S3

Optional, and worth doing soon after launch. The server gets permission through an IAM role, so no access keys are stored on it.

1. **Create the bucket.** AWS console → **S3** → **Create bucket** → region Tokyo → a unique name, for example `bhalojob-backups-` plus some random letters → keep **Block all public access** on → **Create bucket**.
2. **Create the role.** AWS console → **IAM** → **Roles** → **Create role** → **AWS service** → **EC2** → **Next** → **Next** → Role name `bhalojob-server` → **Create role**. Open the new role → **Add permissions** → **Create inline policy** → **JSON**, paste this with your bucket name, and save it as `bhalojob-backup-upload`:

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": ["s3:PutObject", "s3:AbortMultipartUpload"],
         "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
       }
     ]
   }
   ```

   The server may only add files. It cannot read or delete older backups, which protects them if the server is ever broken into.
3. **Give the role to the server.** EC2 → **Instances** → tick `bhalojob` → **Actions** → **Security** → **Modify IAM role** → choose `bhalojob-server` → **Update IAM role**.
4. **On the server**, install the AWS command line tool and name the bucket:

   ```bash
   sudo snap install aws-cli --classic
   sudo nano /etc/bhalojob/bhalojob.env      # set the line:  BACKUP_S3_BUCKET=YOUR-BUCKET-NAME
   sudo bash deploy/aws/backup.sh            # must end with "Copied to s3://..."
   ```

5. **Let S3 delete old copies.** In the bucket → **Management** → **Create lifecycle rule** → apply to all objects → **Expire current versions of objects** after, for example, 90 days.

To restore from S3, download the two files in the S3 console, copy them to the server with `scp` and run `restore.sh` with their paths.

---

## 12. Logs, status and restart

Run these on the server, in the project folder (`cd ~/bhalojob`).

| I want to… | Command |
|---|---|
| See what is running | `sudo docker compose ps` |
| Watch the app's log (stop with Ctrl+C) | `sudo docker compose logs -f app` |
| See the last 100 lines of the HTTPS proxy's log | `sudo docker compose logs --tail 100 caddy` |
| See what the last migration did | `sudo docker compose logs migrate` |
| See the database's log | `sudo docker compose logs --tail 100 db` |
| Restart the app | `sudo docker compose restart app` |
| Restart everything | `sudo docker compose restart` |
| Stop everything (the data stays) | `sudo docker compose stop` |
| Start everything | `sudo docker compose up -d` |
| Open a database prompt (leave with `\q`) | `sudo docker compose exec db psql -U bhalojob bhalojob` |
| See memory and disk | `free -h` and `df -h /` |
| Restart the whole server | `sudo reboot` |

`docker compose ps` should list three services (`app`, `caddy`, `db`), all with `Up` in the `STATUS` column, and `app` and `db` with `(healthy)`. The `migrate` job is not listed because it exits after its work.

Docker keeps at most 50 MB of log per container and removes the oldest lines by itself.

**Never run `docker compose down -v` or `docker volume rm`.** The `-v` deletes the volumes, which are the database, the uploaded files and the certificates.

---

## 13. Security checklist

- [ ] The content of `/etc/bhalojob/bhalojob.env` is saved in a password manager, outside the server.
- [ ] The first Administrator exists and has a long, unique password.
- [ ] The staff console address is known only to staff. It is in no public page, chat or screenshot.
- [ ] In the security group, SSH (port 22) is open to **My IP** only, not to `0.0.0.0/0`. Ports 80 and 443 are the only ones open to everyone.
- [ ] The key file `bhalojob-key.pem` is stored safely and not in the project folder or on GitHub.
- [ ] The AWS account has MFA switched on, and a budget alert exists.
- [ ] The disk is encrypted and termination protection is on (Part 3, steps 10 and 11).
- [ ] The backups run (check weekly) and a copy leaves the server (S3 or your PC).
- [ ] You have tried a restore once, so you know it works before you need it.
- [ ] Security updates are installed monthly (Part 10). Ubuntu also installs urgent security fixes by itself.
- [ ] `db/sample-data.sql` has never been loaded into the production database. It creates demo accounts with published passwords.

What is already taken care of: HTTPS with automatic renewal, HTTP redirected to HTTPS, HSTS and the other security headers, the database and the app not reachable from the internet, the app running as an unprivileged user, secrets readable by root only, a firewall on the server.

---

## 14. Troubleshooting

| What you see | Why | What to do |
|---|---|---|
| The setup ends with **HTTPS IS NOT READY YET**, or the browser warns about the certificate. `sudo docker compose logs caddy` shows lines with `challenge failed`, `NXDOMAIN` or `no such host`. | The domain does not point at this server yet, or the record is new and has not spread. | Check with `nslookup example.com` that it answers your Elastic IP (Part 5). When it does, run `sudo docker compose restart caddy` and wait a minute. Caddy also retries by itself. After several failed tries Let's Encrypt makes you wait up to an hour. |
| The site does not load at all (the browser waits, then times out). | Ports 80/443 are closed, or the Elastic IP is not attached. | EC2 → Security Groups → inbound rules must have HTTP 80 and HTTPS 443 from `0.0.0.0/0` (Part 3 step 9). Check that the Elastic IP is associated with the server (Part 4). |
| The build stops with `Killed`, `exit code 137` or `JavaScript heap out of memory`. | Out of memory during the build. | Check that swap is on: `free -h` must show about 2 GB in the `Swap` line. If not, run the setup again. If it still fails, use a bigger server for a moment: stop the instance → **Actions** → **Instance settings** → **Change instance type** → `t3.medium` → start → run the command again. You can change back to `t3.small` afterwards. The Elastic IP stays. |
| `ssh` says `Connection timed out`. | Your internet address changed, so the security group blocks you. | Set the SSH rule's source to **My IP** again (Part 6). |
| `ssh` says `Permission denied (publickey)`. | Wrong user name or wrong key file. | The user is `ubuntu`. Use the `.pem` file from Part 3 with `-i`. |
| `git clone` or `update.sh` says `Permission denied (publickey)` for github.com. | The deploy key is not on the repository, or git does not use it. | Repeat Part 7 Way A, steps 1 to 4. Test with `ssh -T git@github.com`. |
| You forgot the staff console address. | It is a random value. | `sudo grep ADMIN_PATH /etc/bhalojob/bhalojob.env`. The address is `https://example.com/<that value>/login`. |
| `https://example.com/admin` says "not found". | On purpose. The console only answers at the secret address. | Use the address from the row above. |
| After signing in you are sent back to the login page. | The site was opened with `http://` or by IP address, so the browser does not keep the login cookie. | Always use `https://` and the domain. |
| The browser shows `502 Bad Gateway`. | The app is restarting or has stopped. | `sudo docker compose ps`, then `sudo docker compose logs --tail 50 app`. Start it with `sudo docker compose up -d`. |
| The app or migrate log says `password authentication failed for user "bhalojob"`. | `POSTGRES_PASSWORD` or `DATABASE_URL` in the settings file was changed after the database was created. | Put the original values back from your saved copy, then `sudo bash deploy/aws/update.sh --no-pull`. |
| `update.sh` stops at "Database migrations". | A migration failed. The site still runs the previous version. | Read the error above that line. Fix the migration in the code and deploy again. The dump made just before is the newest file in `/var/backups/bhalojob`. |
| A script fails at once with `bad interpreter` or `$'\r': command not found`. | The files were copied from Windows with Windows line endings. | `sed -i 's/\r$//' deploy/aws/*.sh` and run it again. Next time make the archive with `git archive` (Part 7 Way B). |
| `no space left on device`, or `df -h /` shows the disk nearly full. | Old Docker build files or many backups. | `sudo docker builder prune -af` frees build files. `sudo du -sh /var/backups/bhalojob` shows the backups. To make the disk bigger: EC2 → **Volumes** → select it → **Actions** → **Modify volume** → larger size, then `sudo reboot`. |
| The setup says a port is `already in use`. | Another web server (Apache or nginx) runs on this machine. | Remove it (`sudo apt-get remove -y apache2 nginx`) and run the setup again. Use a fresh server for Bhalojob. |
| An upload fails for a large file. | Files are limited to 10 MB. | Use a smaller file. |
| The backup log says the copy to S3 failed. | The role is not attached, the bucket name is wrong, or the AWS tool is missing. | Repeat [Copy the backups to S3](#copy-the-backups-to-s3), steps 2 to 4. The backup on the server itself is still made. |

Still stuck? These three outputs show almost every problem. They contain no passwords:

```bash
cd ~/bhalojob
sudo docker compose ps
sudo docker compose logs --tail 80 app
sudo docker compose logs --tail 80 caddy
```

---

## 15. Growing later

One server is enough to start. None of the following is built now. Each can be added later without changing how the site works.

- **A bigger server.** Stop the instance, change the instance type (for example `t3.medium`), start it. Then raise the memory limits in `docker-compose.yml`.
- **Database on Amazon RDS for PostgreSQL.** AWS then does the database backups, updates and failover. Restore a dump into RDS, set `DATABASE_URL` to the RDS address, and remove the `db` service from `docker-compose.yml`.
- **Uploaded files on S3.** The files are written through one small driver in `src/server/storage.ts`. Replacing the local-disk driver with an S3 driver moves them off the server's disk. This is needed before a second app server can exist.
- **A load balancer and more than one app server.** An Application Load Balancer with a certificate from AWS Certificate Manager in front of two or more servers. Before that: database on RDS, uploads on S3, a shared cache and one shared key for Server Actions (see "Multi-Server Deployments" in the Next.js self-hosting guide), and the login rate limit moved out of the app's memory.
- **Building somewhere else.** A GitHub Actions workflow can build the images and push them to Amazon ECR, so the server only downloads them. Updates then no longer slow the site down and the server does not need swap.
- **Monitoring.** An uptime check on `https://example.com/api/health`, and CloudWatch alarms for CPU, disk and status checks.
- **Disk snapshots.** AWS Backup or Data Lifecycle Manager can snapshot the whole disk every day as a second safety net.

---

## 16. Files of the kit

| File | What it is |
|---|---|
| `Dockerfile` | Builds two images: the app (Next.js standalone server) and the `migrate` job. |
| `.dockerignore` | Keeps secrets, local files and `db/sample-data.sql` out of the images. |
| `docker-compose.yml` | The four services (`db`, `migrate`, `app`, `caddy`), their volumes, limits and health checks. |
| `deploy/aws/setup.sh` | First-time installation. Safe to run again. |
| `deploy/aws/update.sh` | Deploys a new version. |
| `deploy/aws/backup.sh` | Database dump + uploads archive, 14 days kept, optional S3 copy. |
| `deploy/aws/restore.sh` | Restores a backup. |
| `deploy/aws/lib.sh` | Shared helper functions of the four scripts. |
| `deploy/aws/env.example` | Every setting explained. The real file is `/etc/bhalojob/bhalojob.env`. |
| `deploy/aws/caddy/Caddyfile` | HTTPS, redirects, compression, security headers, request size limit. |
| `deploy/aws/docker/migrate.mjs` | What the `migrate` job runs: migrations, then the master data on an empty database. |
| `src/app/api/health/route.ts` | `/api/health`: answers 200 only when the database answers. |

Operated by ジャパンバングラブリッジ株式会社 (Japan Bangla Bridge Co., Ltd.).

## 17. Two copies of the app, and what happens under a flood

The website runs as two identical containers, `app` and `app2`. Node.js uses one processor core per copy, so two copies use both cores of the server.

- **Updates without downtime.** `update.sh` replaces the copies one after the other. Caddy sends visitors to the copy that is up.
- **A copy that stops answering gets no visitors.** Caddy asks each copy `/api/health` every 5 seconds.
- **Overload protection.** A copy with 30 requests in progress takes no more. New requests go to the other copy or wait up to 8 seconds, and only then get a short "busy" page that reloads by itself. Under a flood the site slows down; it does not go down.
- **Connection limit.** Caddy accepts about 8,000 connections at once. More than that wait in the operating system's queue instead of using up memory.
- **Cached lists stay in step.** When staff approve a job, the copy that handled it tells the other one (`src/server/cache-tags.ts`, `PEER_ORIGINS` in `docker-compose.yml`). If that message is lost, the other copy catches up by itself within a few minutes.
- **Login lockout is counted per copy**, so the limit of 10 wrong passwords can be up to 20 in the worst case.

Useful commands:

```bash
sudo docker compose ps                    # both copies should say "healthy"
sudo docker compose logs -f app app2      # the site's log, both copies
sudo docker compose restart app2          # restart one copy; the other keeps serving
```

This protects one server from falling over; it does not turn one server into several. For 99.99% uptime or thousands of visitors at the same moment, see "Growing later".

## 18. The page cache

A fourth container, `cache` (nginx, `deploy/aws/cache/nginx.conf`), sits between Caddy and the app for visitors who are **not signed in**.

- Building one page costs the app about 25 ms of processor time, which limited the server to about 40 pages a second. A visitor who is not signed in gets the same page as every other such visitor, so the page is built once and handed to everyone else who asks. It is kept until something public changes, and for one minute at most as a safety net.
- **Signed-in members, staff, and every form submission never go through the cache.** Caddy sends them straight to the app (the `@signed_in` and `@writes` rules in the Caddyfile). The cache also refuses to store anything requested with a login cookie, anything that sets a cookie, and any staff-console page.
- Pages are stored already compressed, so handing one out costs almost nothing.
- Build files under `/_next/static/` are kept for 30 days (their names change whenever their content does).
- **Changes show at once.** Whenever staff or a company change something public (a job is approved, edited or closed, a company or a dropdown list is changed), the app tells the cache to forget its pages (`purgePageCache()` in `src/server/cache-tags.ts`, the private port 8082 of the cache). The next visitor gets a freshly built page.
- If the app is overloaded or restarting, the cache keeps handing out the last copy of a page (up to 10 minutes old) instead of an error.
- `update.sh` and `restore.sh` empty the page cache, because its pages belong to the old version or the old data.

Measured on the t3.small with the test tool running on the same server (so real figures are somewhat better): about 365 pages a second for visitors who are not signed in, against about 40 before. Pages for signed-in users are unchanged at about 35 to 40 a second; more of those needs more processor cores.

Useful commands:

```bash
sudo docker compose logs -f cache                         # the cache's log (errors only)
sudo docker compose exec cache wget -q -O- --post-data= http://127.0.0.1:8082/purge   # empty the page cache now
```
