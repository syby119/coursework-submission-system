# Coursework Management System

[中文 README](README.zh-CN.md)

A lightweight coursework submission system for one course and tens to hundreds of students. Next.js provides the UI and business logic, PostgreSQL stores application data, a private local directory stores submissions, and Nginx is the reverse proxy. The project does not depend on Supabase, Vercel, Docker, or other cloud services.

## Features

- Students sign in with a username and password. A student number is normally used as the username when importing a roster.
- Students see published assignments, deadlines, and their own submission status. ZIP files only, up to 50 MiB, with resubmission supported.
- Late submissions remain allowed and are marked late; the latest submission is retained.
- Students can download only their own files and can change their password.
- Administrators create, edit, and delete assignments; manage the course roster; record scores; and download student work.
- Administrators can export one assignment's submissions as ZIP, one assignment's grades as Excel, or all assignments plus a grade summary as ZIP.
- Exported ZIP files expand each submitted archive into `assignment-name/student-number_student-name/`. Students without a submission still receive an empty folder.
- The interface supports Chinese and English. UI text, feedback, date formatting, and generated Excel/archive names follow the selected language; user-entered data remains unchanged.

## Architecture and security

```text
Browser → Nginx → Next.js (localhost only)
                     ├─ PostgreSQL (localhost only)
                     └─ UPLOAD_ROOT (private local directory)
```

- Passwords are stored with bcrypt. Sessions use random HttpOnly, SameSite=Lax cookie tokens.
- User and administrator authorization is verified on the server for every protected operation. Students cannot read another student's submission.
- Nginx never serves the upload directory directly; every download goes through an authenticated application endpoint.
- Uploads use streaming multipart parsing. The system permits ZIP files only and validates MIME type, extension, path traversal, symbolic links, encrypted archives, and extraction size.
- Timestamps are stored as PostgreSQL UTC `timestamptz` values and displayed in `Asia/Shanghai`.

## Requirements

- Node.js 22+ and pnpm 11+.
- PostgreSQL 16+ or a compatible server.
- Nginx for production deployment or production-like testing.
- A supported Linux distribution. The production guide below is validated for an existing Ubuntu 20.04.6 LTS intranet server.

`package.json` does not currently declare a Node.js `engines` field. This guide uses Node.js 22 as the deployment baseline and uses the repository's pinned `pnpm@11.24.0`.

## Environment configuration

For local development, copy the template and fill in real values. Do not commit `.env`, `.env.local`, `.env.production`, or an operational environment file.

```bash
cp .env.example .env
openssl rand -base64 48
```

| Variable | Purpose |
| --- | --- |
| `NODE_ENV` | Use `production` for a production process. |
| `DATABASE_URL` | PostgreSQL connection string. |
| `UPLOAD_ROOT` | Upload directory outside the repository, writable by the application user. |
| `BACKUP_ROOT` | Backup output directory. |
| `SESSION_SECRET` | Random server secret of at least 32 characters. |
| `SESSION_TTL_DAYS` | Session lifetime in whole days: 1–30; default 7. |
| `APP_URL` | Exact browser origin, used by the upload API's CSRF Origin check. |
| `COOKIE_SECURE` | `false` for HTTP; `true` when the browser uses HTTPS. |
| `MAX_UPLOAD_SIZE` | Upload limit in bytes; valid range is 1–`52428800` (50 MiB). |

If a database password contains URL-reserved characters such as `@`, `:`, `/`, `?`, `#`, or `%`, URL-encode it before putting it in `DATABASE_URL`.

## Local development

This is the shortest path for local development; do not use `pnpm dev` as a production acceptance test.

1. Install dependencies.

   ```bash
   pnpm install --frozen-lockfile
   ```

2. Create the PostgreSQL role and database on Linux/WSL.

   ```bash
   sudo -u postgres createuser --pwprompt coursework_user
   sudo -u postgres createdb --owner=coursework_user coursework
   ```

3. Create private data directories. `$USER` must be the Linux user that runs Next.js.

   ```bash
   sudo ./scripts/setup-data-dir.sh /data/homework-system/uploads "$USER" "$USER"
   sudo install -d -o "$USER" -g "$USER" -m 0750 /data/homework-system/backups
   ```

4. Configure `.env`, run migrations, create an administrator, then start development mode.

   ```bash
   pnpm db:migrate
   read -rs -p 'Administrator password: ' PASSWORD; echo
   printf '%s' "$PASSWORD" | pnpm admin:create --student-number admin --name 'Course administrator' --password-stdin
   unset PASSWORD
   pnpm dev
   ```

Open `http://localhost:3000/login`.

## Import students

The preferred method is **Student management** in the administrator navigation. It can view the roster, add or remove one student, or import an Excel roster. New students receive the initial password `123456`.

For web Excel import, the first worksheet must begin with the Chinese headers `姓名` and `学号`, in that order; other columns are ignored. The import is atomic. Duplicate numbers, empty fields, an invalid file, or an existing account cause the whole import to fail without a partial roster.

The server-side command-line tools remain available. They use the same initial password. CSV input uses `student_number,name`:

```csv
student_number,name
20260001,Student A
20260002,Student B
```

```bash
pnpm students:import -- students.csv
pnpm students:import-xlsx -- student_list.xlsx
```

Keep real roster files outside Git.

## Ubuntu 20.04 intranet deployment for multiple independent courses

This guide documents an intranet deployment pattern for an existing Ubuntu 20.04.6 LTS server. It is intended to run several courses as independent instances on one host, without Docker, a cloud platform, DNS, or public exposure. Replace `10.214.242.231` with your own server's intranet IP everywhere.

The complete example below is for **GPU 2026**:

| Item | Example |
| --- | --- |
| Linux deployment user | `yy` |
| Course identifier | `gpu_2026` |
| Application repository | `/opt/coursework/gpu_2026/app` |
| Upload directory | `/data/coursework/gpu_2026/uploads` |
| Backup directory | `/data/coursework/gpu_2026/backups` |
| Production environment file | `/etc/coursework/gpu_2026.env` |
| PostgreSQL role | `coursework_user` |
| PostgreSQL database | `gpu_2026` |
| Next.js listener | `127.0.0.1:3001` |
| Nginx listener | `0.0.0.0:8001` |
| Browser URL | `http://10.214.242.231:8001` |

```text
Browser
  |
  v
10.214.242.231:8001
  |
  v
Nginx
  |
  v
127.0.0.1:3001
  |
  v
Next.js
  |
  v
PostgreSQL 127.0.0.1:5432
  |
  v
gpu_2026
```

Only Nginx port `8001` is reachable from the intranet. Next.js port `3001` and PostgreSQL port `5432` stay on localhost.

### Directory and account model

This separation prevents a code update or a fresh clone from touching student submissions:

- `/opt/coursework/gpu_2026/app`: Git repository, application code, `node_modules`, and `.next`.
- `/data/coursework/gpu_2026/uploads`: persistent student submissions; never put this in Git.
- `/data/coursework/gpu_2026/backups`: local database dumps and uploads archives.
- `/etc/coursework/gpu_2026.env`: production secrets and environment-specific configuration; never put this in Git.

The following are different identities and must not be confused:

- `yy` is the ordinary Linux user that owns and runs the application.
- `coursework_user` is the PostgreSQL login used by Next.js.
- `admin` is a website account stored in the application's `users` table.

Create the Linux user if it does not already exist. It does not need sudo access to run the website; a system administrator performs apt, Nginx, systemd, `/etc`, and `/usr/local/sbin` work.

```bash
sudo adduser yy
```

### 1. Install base system tools

This installs the operating-system tools needed to fetch code, generate secrets, and proxy HTTP.

```bash
sudo apt update
sudo apt install -y curl ca-certificates git openssl nginx
git --version
openssl version
nginx -v
```

### 2. Install Node.js 22 and pnpm 11.24.0

Ubuntu 20.04's built-in Node.js is too old for this deployment baseline. Install Node.js 22 from NodeSource, then install the exact pnpm version declared in `package.json`.

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version
npm --version

sudo npm install -g pnpm@11.24.0
pnpm --version
```

### 3. Install PostgreSQL 16 on Ubuntu 20.04

Ubuntu 20.04 (focal) is in PostgreSQL's archive repository rather than the current PGDG repository. Add the archive explicitly before installing PostgreSQL 16.

```bash
sudo install -d -m 0755 /usr/share/postgresql-common/pgdg
curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc \
  | sudo tee /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc >/dev/null
echo "deb [arch=amd64 signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt-archive.postgresql.org/pub/repos/apt focal-pgdg main" \
  | sudo tee /etc/apt/sources.list.d/pgdg.list
sudo apt update
apt-cache policy postgresql-16
sudo apt install -y postgresql-16 postgresql-client-16
sudo systemctl enable --now postgresql
psql --version
pg_lsclusters
```

The expected cluster is `16 main 5432 online`. On Debian/Ubuntu, `postgresql.service` may show `active (exited)` even while the cluster is healthy; use `pg_lsclusters` or `sudo systemctl status postgresql@16-main --no-pager` to check the actual server.

Ubuntu 20.04 is outside standard support. This section is for an existing intranet or GPU/CUDA server where an OS upgrade is not appropriate for this application alone. Prefer a newer Ubuntu LTS or Ubuntu Pro/ESM for a new public-facing server.

### 4. Create the application database

Create a least-privilege PostgreSQL login for the application, rather than using the `postgres` superuser.

```bash
sudo -u postgres createuser --pwprompt coursework_user
sudo -u postgres createdb --owner=coursework_user gpu_2026

psql -h 127.0.0.1 -U coursework_user -d gpu_2026 -W
```

At the `psql` prompt, verify the connection and leave it:

```sql
SELECT current_user, current_database();
\q
```

PostgreSQL must not be exposed to the intranet for this application:

```bash
sudo ss -ltnp | grep 5432
```

It should listen on `127.0.0.1:5432` and/or `[::1]:5432`, not `0.0.0.0:5432`.

### 5. Clone the application and create persistent directories

The code directory is owned by the ordinary deployment user. Data directories are outside the repository.

```bash
sudo mkdir -p /opt/coursework/gpu_2026
sudo chown -R yy:yy /opt/coursework/gpu_2026
sudo install -d -o yy -g yy -m 0750 /data/coursework/gpu_2026/uploads
sudo install -d -o yy -g yy -m 0750 /data/coursework/gpu_2026/backups

sudo -iu yy
git clone https://github.com/syby119/coursework-submission-system.git /opt/coursework/gpu_2026/app
cd /opt/coursework/gpu_2026/app
pnpm install --frozen-lockfile
exit
```

Use `--frozen-lockfile` in production so installed dependencies match the repository lockfile exactly.

### 6. Create the production environment file

Back in an administrator shell, create an environment directory readable by `yy`, but writable only by root.

```bash
sudo install -d -o root -g yy -m 0750 /etc/coursework
openssl rand -base64 48
sudoedit /etc/coursework/gpu_2026.env
```

Use generated values in the file; do not copy real secrets into documentation or Git:

```dotenv
NODE_ENV=production
DATABASE_URL=postgresql://coursework_user:<URL_ENCODED_DB_PASSWORD>@127.0.0.1:5432/gpu_2026
UPLOAD_ROOT=/data/coursework/gpu_2026/uploads
BACKUP_ROOT=/data/coursework/gpu_2026/backups
SESSION_SECRET=<GENERATED_RANDOM_SECRET>
SESSION_TTL_DAYS=7
APP_URL=http://10.214.242.231:8001
COOKIE_SECURE=false
MAX_UPLOAD_SIZE=52428800
```

`SESSION_SECRET` protects session tokens and is independent of `SESSION_TTL_DAYS`. Do not reuse it as a database password, do not commit it, and do not rotate it casually; changing it invalidates existing sessions. `SESSION_TTL_DAYS` is accepted only from 1 through 30. `APP_URL` must exactly match the browser origin, including `:8001`, because uploads validate the request Origin. The example uses intranet HTTP and therefore `COOKIE_SECURE=false`; use `https://...` and `COOKIE_SECURE=true` when TLS is later terminated by Nginx.

Set and verify the file permissions:

```bash
sudo chown root:yy /etc/coursework/gpu_2026.env
sudo chmod 640 /etc/coursework/gpu_2026.env
sudo -u yy test -r /etc/coursework/gpu_2026.env && echo OK
```

`ENV_FILE` is read by the repository's Node scripts such as migration and administrator creation. Next.js itself does not load `ENV_FILE`; the build/manual-start steps below explicitly load the file, while systemd uses `EnvironmentFile=`.

### 7. Run migrations and create the first website administrator

Run migrations before starting the application. The migration runner creates `schema_migrations`, skips recorded files, and executes each new migration inside a transaction.

```bash
sudo -iu yy
cd /opt/coursework/gpu_2026/app
ENV_FILE=/etc/coursework/gpu_2026.env pnpm db:migrate
```

Create the website administrator without placing its password in shell history. Do not add a redundant `--` after `pnpm admin:create`; the script accepts these arguments directly.

```bash
read -rs -p 'Administrator password: ' PASSWORD; echo
printf '%s' "$PASSWORD" | ENV_FILE=/etc/coursework/gpu_2026.env pnpm admin:create --student-number admin --name 'GPU course administrator' --password-stdin
unset PASSWORD
exit
```

The website administrator is not the Linux user `yy` and not the PostgreSQL role `coursework_user`.

### 8. Build and test the application directly

From the administrator shell, first switch back to `yy` and load the production configuration. This is necessary for a direct Next.js command because `ENV_FILE=... pnpm build` alone does not make Next.js read that file.

```bash
sudo -iu yy
cd /opt/coursework/gpu_2026/app
set -a
. /etc/coursework/gpu_2026.env
set +a
pnpm build
pnpm exec next start --hostname 127.0.0.1 --port 3001
```

From another terminal, validate the direct listener:

```bash
curl -I http://127.0.0.1:3001/login
ss -ltnp | grep 3001
```

The listener must be `127.0.0.1:3001`, never `0.0.0.0:3001`. Stop this manual process with `Ctrl+C`, then run `exit` to return to the administrator shell before configuring Nginx.

### 9. Use one external and one internal port per course

Without internal DNS, use a separate external Nginx port and internal Next.js port for each course. Do not use path prefixes such as `/gpu2026/`: Next.js `basePath`, redirects, static assets, cookies, and API paths become more complicated.

| Course | Nginx → Next.js |
| --- | --- |
| GPU 2026 | `8001 → 3001` |
| Course B | `8002 → 3002` |
| Course C | `8003 → 3003` |

Create `/etc/nginx/sites-available/coursework-gpu-2026`:

```nginx
server {
    listen 8001;
    listen [::]:8001;

    server_name _;

    client_max_body_size 60m;

    proxy_read_timeout 120s;
    proxy_send_timeout 120s;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;

        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $http_host;
    }
}
```

The application maximum is 50 MiB (`52428800` bytes). Nginx uses `60m` so multipart and request overhead do not reject an otherwise valid upload first. This server listens on `8001`, so the default Ubuntu port-80 site does not need to be deleted for this course. The production application has no WebSocket endpoint, so it does not need `Upgrade` or `Connection: upgrade` proxy headers; the repository's generic template includes them only for Next.js development-mode HMR.

```bash
sudo ln -s /etc/nginx/sites-available/coursework-gpu-2026 /etc/nginx/sites-enabled/coursework-gpu-2026
sudo nginx -t
sudo systemctl enable --now nginx
sudo systemctl reload nginx
curl -I http://127.0.0.1:8001/login
```

Only reload Nginx after `nginx -t` succeeds. For future HTTPS, terminate TLS at Nginx, change `APP_URL` to the `https://` origin, set `COOKIE_SECURE=true`, and restart the application service.

### 10. Run the course with systemd

Find the actual pnpm path first. The following example assumes it prints `/usr/bin/pnpm`; replace `ExecStart` if it differs.

```bash
command -v pnpm
sudoedit /etc/systemd/system/coursework-gpu-2026.service
```

```ini
[Unit]
Description=Coursework Submission System - GPU 2026
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=yy
Group=yy
WorkingDirectory=/opt/coursework/gpu_2026/app
Environment=PATH=/usr/local/bin:/usr/bin:/bin
EnvironmentFile=/etc/coursework/gpu_2026.env
ExecStart=/usr/bin/pnpm exec next start --hostname 127.0.0.1 --port 3001
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now coursework-gpu-2026
sudo systemctl status coursework-gpu-2026 --no-pager
sudo journalctl -u coursework-gpu-2026 -f
```

After this, the site survives SSH logout, starts after reboot, and restarts after an application-process failure.

### 11. Production acceptance checks

Confirm both layers and their listeners:

```bash
curl -I http://127.0.0.1:3001/login
curl -I http://127.0.0.1:8001/login
ss -ltn | grep -E ':3001|:8001'
```

Expected listeners are Next.js on `127.0.0.1:3001` and Nginx on `0.0.0.0:8001` and/or `[::]:8001`. Then open `http://10.214.242.231:8001` in a browser and verify the full workflow: create a test student and assignment, sign in as that student, upload a test ZIP, verify the administrator can see and download it, and confirm the stored file is under `/data/coursework/gpu_2026/uploads`.

## Automated local backups

The irreplaceable data is the PostgreSQL database and the uploads directory; application code can be cloned again. The following root-managed script creates a timestamped database dump, uploads archive, and checksum file, then keeps 14 days of local backups.

Create `/usr/local/sbin/backup-coursework-gpu-2026` and paste:

```bash
#!/usr/bin/env bash
set -euo pipefail
umask 077

BACKUP_ROOT="/data/coursework/gpu_2026/backups"
UPLOAD_ROOT="/data/coursework/gpu_2026/uploads"
DB_NAME="gpu_2026"

STAMP="$(date '+%Y%m%d-%H%M%S')"
TMP_DIR="${BACKUP_ROOT}/.tmp-${STAMP}"
FINAL_DIR="${BACKUP_ROOT}/${STAMP}"

cleanup() {
    rm -rf "${TMP_DIR}"
}
trap cleanup EXIT

echo "=== GPU 2026 backup started: ${STAMP} ==="
echo "Cleaning stale temporary backup directories older than 1 day..."
find "${BACKUP_ROOT}" \
    -mindepth 1 \
    -maxdepth 1 \
    -type d \
    -name '.tmp-*' \
    -mtime +1 \
    -print \
    -exec rm -rf -- {} +

mkdir -p "${TMP_DIR}"

echo "[1/3] Backing up PostgreSQL database..."
runuser -u postgres -- pg_dump \
    --format=custom \
    --no-owner \
    --no-privileges \
    "${DB_NAME}" > "${TMP_DIR}/${DB_NAME}.dump"

echo "[2/3] Backing up uploaded files..."
tar \
    -C "$(dirname "${UPLOAD_ROOT}")" \
    -czf "${TMP_DIR}/uploads.tar.gz" \
    "$(basename "${UPLOAD_ROOT}")"

echo "[3/3] Generating checksums..."
(
    cd "${TMP_DIR}"
    sha256sum "${DB_NAME}.dump" uploads.tar.gz > SHA256SUMS
)

mv "${TMP_DIR}" "${FINAL_DIR}"

echo "Cleaning backups older than 14 days..."
find "${BACKUP_ROOT}" \
    -mindepth 1 \
    -maxdepth 1 \
    -type d \
    -name '20??????-??????' \
    -mtime +14 \
    -print \
    -exec rm -rf -- {} +

echo "=== Backup completed ==="
echo "${FINAL_DIR}"
```

Test it manually before scheduling it:

```bash
sudo chmod 750 /usr/local/sbin/backup-coursework-gpu-2026
sudo /usr/local/sbin/backup-coursework-gpu-2026
cd /data/coursework/gpu_2026/backups/<timestamp>
sha256sum -c SHA256SUMS
pg_restore -l gpu_2026.dump | head
tar -tzf uploads.tar.gz | head
```

Create `/etc/systemd/system/coursework-gpu-2026-backup.service`:

```ini
[Unit]
Description=Backup Coursework GPU 2026
After=postgresql.service

[Service]
Type=oneshot
ExecStart=/usr/local/sbin/backup-coursework-gpu-2026
```

Create `/etc/systemd/system/coursework-gpu-2026-backup.timer`:

```ini
[Unit]
Description=Daily backup for Coursework GPU 2026

[Timer]
OnCalendar=*-*-* 03:30:00
Persistent=true
Unit=coursework-gpu-2026-backup.service

[Install]
WantedBy=timers.target
```

Load, test, and schedule the timer:

```bash
sudo systemctl daemon-reload
sudo systemctl start coursework-gpu-2026-backup.service
sudo systemctl status coursework-gpu-2026-backup.service --no-pager
sudo journalctl -u coursework-gpu-2026-backup.service -n 50 --no-pager

sudo systemctl enable --now coursework-gpu-2026-backup.timer
systemctl status coursework-gpu-2026-backup.timer --no-pager
systemctl list-timers coursework-gpu-2026-backup.timer
timedatectl
```

`Type=oneshot` services can correctly show `inactive (dead)` after a successful run; check for `status=0/SUCCESS` and the journal. Enable the **timer**, not the backup service. `OnCalendar` uses the server's local timezone; `Persistent=true` runs a missed backup after a later boot.

This is an online backup: it runs `pg_dump` and then archives uploads, so it is not a strict atomic snapshot. A submission made between those operations can cause a short-lived database/files timing difference. That is normally sufficient for a coursework system. For strict consistency, stop the application only during a low-traffic window and use a failure-safe operational procedure that restarts it via `trap`; do not use an unsafe stop/backup/start sequence that can leave the site stopped after a failed backup.

## Restore drills and backup limits

A backup is reliable only after a restore drill. Locate the latest backup and restore it into a disposable database:

```bash
BACKUP_DIR=$(find /data/coursework/gpu_2026/backups \
  -mindepth 1 -maxdepth 1 -type d -name '20*' | sort | tail -n 1)
echo "$BACKUP_DIR"

sudo -u postgres createdb --owner=coursework_user gpu_2026_restore_test
read -rs -p 'coursework_user database password: ' DBPASS; echo
PGPASSWORD="$DBPASS" pg_restore \
  -h 127.0.0.1 \
  -U coursework_user \
  -d gpu_2026_restore_test \
  --no-owner \
  --no-privileges \
  < "$BACKUP_DIR/gpu_2026.dump"
PGPASSWORD="$DBPASS" psql \
  -h 127.0.0.1 \
  -U coursework_user \
  -d gpu_2026_restore_test \
  -c '\dt'
unset DBPASS
```

The shell opens the dump and passes it on standard input because the `postgres` Linux user may not be able to traverse the private backup directory.

Restore uploads to a disposable directory and inspect them:

```bash
RESTORE_DIR=/tmp/coursework-gpu-2026-restore-test
rm -rf "$RESTORE_DIR"
mkdir -p "$RESTORE_DIR"
tar -xzf "$BACKUP_DIR/uploads.tar.gz" -C "$RESTORE_DIR"
find "$RESTORE_DIR/uploads" -type f | wc -l
du -sh "$RESTORE_DIR/uploads"

rm -rf "$RESTORE_DIR"
sudo -u postgres dropdb gpu_2026_restore_test
```

Local backups on the same server help with accidental deletion, bad migrations, and rollback. They do not protect against a failed disk, failed `/data` partition, server loss, or machine-wide formatting. For long-term production use, copy backups to a NAS, another server, another disk, or independent storage.

## Updating a deployed course from GitHub

Do not reboot the server for a normal application update. An administrator starts the backup, the ordinary deployment user updates, builds, and migrates the code, then the administrator restarts the application and checks both listeners.

```bash
sudo systemctl start coursework-gpu-2026-backup.service
sudo -iu yy
cd /opt/coursework/gpu_2026/app
git status
git pull --ff-only
pnpm install --frozen-lockfile

set -a
. /etc/coursework/gpu_2026.env
set +a
pnpm build
ENV_FILE=/etc/coursework/gpu_2026.env pnpm db:migrate
exit

sudo systemctl restart coursework-gpu-2026
sudo systemctl status coursework-gpu-2026 --no-pager
curl -I http://127.0.0.1:3001/login
curl -I http://127.0.0.1:8001/login
```

The current `pnpm build` compiles the application but does not access PostgreSQL or require a newly migrated schema: pages that query user or course data are dynamic because they read cookies/session state, and database access occurs at request time. Building before migration therefore avoids changing the schema when the new release cannot build. If `git status` is not clean, resolve the server-local change before `git pull --ff-only`. If a newer `.env.example` adds variables, update `/etc/coursework/gpu_2026.env` before build and restart. Use `sudo journalctl -u coursework-gpu-2026 -n 100 --no-pager` on failure.

| Change | Required action |
| --- | --- |
| Next.js / React source | Build, then restart `coursework-gpu-2026`. |
| `package.json` or lockfile | Install with frozen lockfile, build, restart. |
| Migration | Run migration, then normally build/restart with the release. |
| `/etc/coursework/gpu_2026.env` | Restart `coursework-gpu-2026`. |
| Nginx configuration | `sudo nginx -t`, then `sudo systemctl reload nginx`. |
| Student files or business data | No service restart required. |

Normal application updates do not require `sudo reboot`, PostgreSQL restart, or Nginx restart. Reload Nginx only after changing its configuration.

## Multi-course expansion

Each course is an independent instance with its own code checkout, database, environment file, uploads, backups, Next.js port, Nginx port, application service, backup service, and backup timer.

| Course | App directory | Database | Next.js | Nginx | App service |
| --- | --- | --- | --- | --- | --- |
| GPU 2026 | `/opt/coursework/gpu_2026/app` | `gpu_2026` | `3001` | `8001` | `coursework-gpu-2026` |
| Course B | `/opt/coursework/course_b_2026/app` | `course_b_2026` | `3002` | `8002` | `coursework-course-b-2026` |
| Course C | `/opt/coursework/course_c_2026/app` | `course_c_2026` | `3003` | `8003` | `coursework-course-c-2026` |

This guide shares one PostgreSQL role, `coursework_user`, across independent course databases to reduce operational overhead. A separate PostgreSQL role per course is also valid when stricter database isolation is needed; it is not mandatory.

## Logs and project verification

Useful service logs:

```bash
sudo journalctl -u coursework-gpu-2026 -f
sudo journalctl -u coursework-gpu-2026-backup.service -n 50 --no-pager
sudo tail -f /var/log/nginx/access.log /var/log/nginx/error.log
sudo journalctl -u postgresql -f
```

Before committing or deploying application changes, run:

```bash
pnpm verify
```

It runs TypeScript checks, tests, lint, and a production build. Production acceptance should also verify Nginx access, student upload/resubmission/own-file download/late markers/password changes, administrator assignment creation/grading/single and full exports, and that student A receives a 404 for student B's download URL.
