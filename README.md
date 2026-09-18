# Coursework Management System

[中文 README](README.zh-CN.md)

A lightweight coursework submission system for one course and tens to hundreds of students. It is designed for a single Linux host: Next.js provides the UI and business logic, PostgreSQL stores data, a private local directory stores submissions, and Nginx acts as the reverse proxy. The project does not depend on Supabase, Vercel, Docker, or other cloud services.

## Features

- Students sign in with a username and password. When a roster is imported, the student number is normally used as the username.
- Students see published assignments, deadlines, and their own submission status. ZIP files only, up to 50 MB, with resubmission supported.
- Late and replacement submissions remain allowed and are marked as late; the latest submission is retained.
- Students can download only their own files and can change their password themselves.
- Administrators create, edit, and delete assignments; view the full roster; record scores; and download student work.
- Administrators can export one assignment's submissions as ZIP, one assignment's grades as Excel, or all assignments plus a grade summary as ZIP.
- Exported ZIP files expand each submitted archive into `assignment-name/student-number_student-name/`. Students without a submission still receive an empty folder.
- The interface supports Chinese and English. UI text, feedback, date formatting, and newly generated Excel/archive names follow the selected language. User data such as assignment titles, descriptions, names, and original filenames remains unchanged.

## Architecture and security

```text
Browser → Nginx :80/:443 → Next.js :3000 (127.0.0.1)
                                  ├─ PostgreSQL :5432 (127.0.0.1)
                                  └─ UPLOAD_ROOT (private local directory)
```

- Passwords are stored with bcrypt. Sessions use random HttpOnly, SameSite=Lax cookie tokens.
- User and administrator authorization is verified on the server for every protected operation. Students cannot read another student's submission.
- Nginx never serves the upload directory directly; every download passes through an authenticated application endpoint.
- Uploads are parsed as streaming multipart requests. The system permits ZIP files only and validates MIME type, extension, path traversal, symbolic links, encrypted archives, and extraction size.
- Timestamps are stored as PostgreSQL UTC `timestamptz` values and displayed in `Asia/Shanghai`.

## Requirements

- Node.js 22+ and pnpm 11+
- PostgreSQL 16+ or a compatible version
- Nginx for production deployment or WSL production-like testing
- Ubuntu 24.04 or compatible Linux for production

## Environment configuration

Copy the template and fill in real values. Do not commit `.env`, `.env.local`, or `.env.production`.

```bash
cp .env.example .env
openssl rand -base64 48
```

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Local PostgreSQL connection, for example `postgresql://coursework_user:password@127.0.0.1:5432/coursework` |
| `UPLOAD_ROOT` | Upload directory outside the repository, writable only by the application user |
| `BACKUP_ROOT` | Backup output directory |
| `SESSION_SECRET` | Random secret with at least 32 characters; generate one with the `openssl` command above |
| `SESSION_TTL_DAYS` | Session lifetime in days, from 1 to 30; defaults to 7 |
| `APP_URL` | Exact browser origin; used by the upload API's CSRF Origin check |
| `COOKIE_SECURE` | `false` for local HTTP testing; `true` for production HTTPS |
| `MAX_UPLOAD_SIZE` | Maximum upload size in bytes; defaults to `52428800` (50 MB) |

For local access through Nginx, use `APP_URL=http://localhost` and `COOKIE_SECURE=false`. A production HTTPS example is `APP_URL=https://homework.example.edu.cn` and `COOKIE_SECURE=true`.

## Local development

1. Install dependencies:

   ```bash
   pnpm install --frozen-lockfile
   ```

2. Create the PostgreSQL user and database on Ubuntu/WSL:

   ```bash
   sudo -u postgres createuser --pwprompt coursework_user
   sudo -u postgres createdb --owner=coursework_user coursework
   ```

3. Create private data directories. `$USER` must be the Linux user that runs Next.js:

   ```bash
   sudo ./scripts/setup-data-dir.sh /data/homework-system/uploads "$USER" "$USER"
   sudo install -d -o "$USER" -g "$USER" -m 0750 /data/homework-system/backups
   ```

4. Configure `.env`, run migrations, create an administrator, and start the development server:

   ```bash
   pnpm db:migrate
   read -rs -p 'Administrator password: ' PASSWORD; echo
   printf '%s' "$PASSWORD" | pnpm admin:create -- --student-number admin --name 'Course administrator' --password-stdin
   unset PASSWORD
   pnpm dev
   ```

Open `http://localhost:3000/login`. The development server is for development only; do not use it for production or production acceptance testing.

## Import students

A CSV file must use the `student_number,name,password` format:

```csv
student_number,name,password
20260001,Student A,initial-password
20260002,Student B,another-password
```

```bash
pnpm students:import -- students.csv
```

Excel import is also supported. The first worksheet must begin with the Chinese headers `姓名` and `学号`, in that order; additional columns are ignored. The initial password is read from standard input so it is not saved in shell history:

```bash
read -rs -p 'Initial student password: ' INITIAL_PASSWORD; echo
printf '%s' "$INITIAL_PASSWORD" | pnpm students:import-xlsx -- student_list.xlsx --password-stdin
unset INITIAL_PASSWORD
```

Each import runs in one database transaction. Duplicate student numbers, empty fields, or an existing student number cause the entire import to fail without importing a partial roster.

## WSL production-like deployment

This verifies the same production mode used by a regular Ubuntu server: PostgreSQL, Nginx, `pnpm build`, and `pnpm start`. Do not use `pnpm dev` as an acceptance test.

```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib nginx
sudo systemctl enable --now postgresql
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm build
pnpm start
```

In another terminal, confirm that Next.js listens only locally:

```bash
curl -I http://127.0.0.1:3000/login
```

Install the Nginx template and open `http://localhost/login`:

```bash
sudo cp deploy/nginx/homework-system.conf /etc/nginx/sites-available/homework-system
sudo ln -s /etc/nginx/sites-available/homework-system /etc/nginx/sites-enabled/homework-system
sudo nginx -t
sudo systemctl reload nginx
```

If WSL does not use systemd, use `sudo service postgresql start` and `sudo service nginx reload`, or enable systemd in `/etc/wsl.conf` and run `wsl --shutdown` from Windows PowerShell.

## Ubuntu server deployment

WSL and the lab server use the same code and migrations. Only environment values, the system user, and the domain name differ.

1. Install Node.js, pnpm, PostgreSQL, and Nginx. Create a service user and data directories:

   ```bash
   sudo useradd --system --home /opt/homework-system --shell /usr/sbin/nologin homework
   sudo install -d -o homework -g homework /opt/homework-system
   sudo install -d -o homework -g homework -m 0750 /data/homework-system/uploads
   sudo install -d -o homework -g homework -m 0750 /data/homework-system/backups
   ```

2. Clone the repository, install dependencies, and create PostgreSQL credentials:

   ```bash
   sudo -u homework git clone <repository-url> /opt/homework-system
   cd /opt/homework-system
   sudo -u homework pnpm install --frozen-lockfile
   sudo -u postgres createuser --pwprompt coursework_user
   sudo -u postgres createdb --owner=coursework_user coursework
   ```

3. Create `/etc/homework-system/homework-system.env` from `.env.example`. Recommended ownership is `root:homework` with mode `0640`. Use the production database password, HTTPS `APP_URL`, and `COOKIE_SECURE=true`.

4. Run migrations and build:

   ```bash
   cd /opt/homework-system
   sudo -u homework env ENV_FILE=/etc/homework-system/homework-system.env pnpm db:migrate
   sudo -u homework pnpm build
   ```

5. Install systemd and Nginx:

   ```bash
   sudo cp deploy/systemd/homework-system.service.example /etc/systemd/system/homework-system.service
   sudo systemctl daemon-reload
   sudo systemctl enable --now homework-system

   sudo cp deploy/nginx/homework-system.conf /etc/nginx/sites-available/homework-system
   sudoedit /etc/nginx/sites-available/homework-system
   sudo ln -s /etc/nginx/sites-available/homework-system /etc/nginx/sites-enabled/homework-system
   sudo nginx -t
   sudo systemctl reload nginx
   ```

Replace `server_name localhost;` in the Nginx configuration with the actual domain and set `APP_URL` to the same origin. Each site needs its own Nginx server block and unique `server_name`; only one global fallback site should use `default_server`. Do not expose ports 3000 or 5432 to the internet.

## HTTPS, backups, and logs

TLS terminates at Nginx. Next.js continues to listen at `127.0.0.1:3000`. With a public domain, Certbot can obtain a certificate:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d homework.example.edu.cn
```

After enabling HTTPS, update `APP_URL` and `COOKIE_SECURE=true`, then restart `homework-system`.

Load production environment variables before backing up:

```bash
set -a
. /etc/homework-system/homework-system.env
set +a
./scripts/backup.sh
```

The script creates a PostgreSQL custom-format dump and a compressed uploads archive. A backup stored on the same disk as uploads does not protect against disk failure; copy backups to another server, NAS, or independent storage.

Useful log commands:

```bash
sudo journalctl -u homework-system -f
sudo tail -f /var/log/nginx/access.log /var/log/nginx/error.log
sudo journalctl -u postgresql -f
```

## Verification

Run before committing or deploying:

```bash
pnpm verify
```

This runs TypeScript checks, tests, lint, and a production build. Production acceptance should also go through Nginx and verify student upload, resubmission, own-file download, late markers, and password changes; administrator assignment creation, grading, and single/full exports; and that student A receives a 404 when requesting student B's download URL.
