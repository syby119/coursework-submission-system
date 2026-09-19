# 课程作业管理系统

[English README](README.md)

面向单一课程、几十至数百名学生的轻量作业提交系统。Next.js 提供页面与业务逻辑，PostgreSQL 保存应用数据，私有本地目录保存学生提交，Nginx 负责反向代理。项目不依赖 Supabase、Vercel、Docker 或其他云服务。

## 功能

- 学生以用户名和密码登录；课程名单导入时通常以学号作为用户名。
- 学生查看已发布作业、截止时间和自己的提交状态；仅支持 ZIP，最大 50 MiB，可重新提交。
- 截止后仍允许提交，最新提交会标记为“补交”。
- 学生只能下载自己的文件，并可自行修改密码。
- 管理员创建、编辑、删除作业，管理课程学生名单，记录分数并下载学生作业。
- 管理员可分别导出单个作业的 ZIP、单个作业成绩 Excel，或导出全部作业和成绩汇总 ZIP。
- ZIP 导出会将每位学生的上传包展开到 `作业名/学号_姓名/`；未提交学生也会保留空目录。
- 页面支持中文与 English 切换；界面、反馈、时间格式和新生成的 Excel/归档名会随语言切换，用户输入的数据保持原文。

## 架构与安全

```text
Browser → Nginx → Next.js（仅 localhost）
                    ├─ PostgreSQL（仅 localhost）
                    └─ UPLOAD_ROOT（私有本地目录）
```

- 密码使用 bcrypt hash 保存；会话使用随机的 HttpOnly、SameSite=Lax cookie token。
- 所有用户和管理员权限都在服务端验证；学生不能读取其他学生的提交。
- 上传目录不通过 Nginx 静态暴露；每次下载都必须经过应用层鉴权。
- 上传采用流式 multipart 解析，只允许 ZIP，并校验 MIME、扩展名、路径穿越、符号链接、加密压缩包和解压大小。
- 时间以 PostgreSQL UTC `timestamptz` 保存，界面统一以 `Asia/Shanghai` 显示。

## 依赖

- Node.js 22+ 和 pnpm 11+。
- PostgreSQL 16+ 或兼容版本。
- Nginx，用于生产部署或 production-like 验证。
- 受支持的 Linux 发行版；下方生产流程已在既有 Ubuntu 20.04.6 LTS 内网服务器场景中验证。

当前 `package.json` 没有 `engines` 字段。本文以 Node.js 22 为部署基线，并使用仓库锁定的 `pnpm@11.24.0`。

## 环境变量配置

本地开发时复制模板并填写真实值。不要提交 `.env`、`.env.local`、`.env.production` 或运维环境文件。

```bash
cp .env.example .env
openssl rand -base64 48
```

| 变量 | 说明 |
| --- | --- |
| `NODE_ENV` | 生产进程应设为 `production`。 |
| `DATABASE_URL` | PostgreSQL 连接字符串。 |
| `UPLOAD_ROOT` | 仓库外、由应用用户可写的上传目录。 |
| `BACKUP_ROOT` | 备份输出目录。 |
| `SESSION_SECRET` | 至少 32 个字符的随机服务端 secret。 |
| `SESSION_TTL_DAYS` | 会话有效天数，必须是 1–30 的整数；默认 7。 |
| `APP_URL` | 实际浏览器 origin；上传 API 使用它校验 CSRF Origin。 |
| `COOKIE_SECURE` | HTTP 使用 `false`；浏览器通过 HTTPS 访问时使用 `true`。 |
| `MAX_UPLOAD_SIZE` | 上传上限（字节）；合法范围为 1–`52428800`（50 MiB）。 |

如果数据库密码包含 `@`、`:`、`/`、`?`、`#`、`%` 等 URL 保留字符，写入 `DATABASE_URL` 前必须进行 URL encode。

## 本地开发

这是本地开发的最短流程；不要把 `pnpm dev` 当作生产验收。

1. 安装项目依赖。

   ```bash
   pnpm install --frozen-lockfile
   ```

2. 在 Linux/WSL 创建 PostgreSQL role 和 database。

   ```bash
   sudo -u postgres createuser --pwprompt coursework_user
   sudo -u postgres createdb --owner=coursework_user coursework
   ```

3. 创建私有数据目录。`$USER` 必须是运行 Next.js 的 Linux 用户。

   ```bash
   sudo ./scripts/setup-data-dir.sh /data/homework-system/uploads "$USER" "$USER"
   sudo install -d -o "$USER" -g "$USER" -m 0750 /data/homework-system/backups
   ```

4. 配置 `.env` 后执行 migration、创建管理员并启动开发服务器。

   ```bash
   pnpm db:migrate
   read -rs -p '管理员密码: ' PASSWORD; echo
   printf '%s' "$PASSWORD" | pnpm admin:create --student-number admin --name '课程管理员' --password-stdin
   unset PASSWORD
   pnpm dev
   ```

访问 `http://localhost:3000/login`。

## 导入学生

推荐在管理员导航中的**学生管理**页面完成操作：可查看名单、添加或删除单个学生，以及导入 Excel 名单。所有新添加学生的初始密码均为 `123456`。

网页导入 Excel 时，首个工作表前两列必须依次为 `姓名`、`学号`；其他列会忽略。导入是原子操作：重复学号、空字段、无效文件或数据库已有账号都会让整批导入失败，不会部分导入。

服务器端仍保留命令行导入工具，初始密码同样固定为 `123456`。CSV 使用 `student_number,name` 格式：

```csv
student_number,name
20260001,学生甲
20260002,学生乙
```

```bash
pnpm students:import -- students.csv
pnpm students:import-xlsx -- student_list.xlsx
```

真实学生名单必须放在 Git 仓库之外。

## Ubuntu 20.04 内网服务器的多课程独立实例部署

本节说明在既有 Ubuntu 20.04.6 LTS 内网服务器上部署的模式：同一台主机可运行多门课程的独立实例，不使用 Docker、云平台、内部 DNS，也不直接暴露到公网。文中 `10.214.242.231` 只是示例；请全部替换为自己的内网服务器 IP。

以下以 **GPU 2026** 为完整示例：

| 项目 | 示例 |
| --- | --- |
| Linux 部署用户 | `yy` |
| 课程标识 | `gpu_2026` |
| 应用仓库 | `/opt/coursework/gpu_2026/app` |
| 上传目录 | `/data/coursework/gpu_2026/uploads` |
| 备份目录 | `/data/coursework/gpu_2026/backups` |
| 生产环境文件 | `/etc/coursework/gpu_2026.env` |
| PostgreSQL role | `coursework_user` |
| PostgreSQL database | `gpu_2026` |
| Next.js 监听地址 | `127.0.0.1:3001` |
| Nginx 监听地址 | `0.0.0.0:8001` |
| 浏览器访问地址 | `http://10.214.242.231:8001` |

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

只有 Nginx 的 `8001` 对内网开放。Next.js 的 `3001` 和 PostgreSQL 的 `5432` 只监听 localhost。

### 目录与账号设计

此结构保证代码更新或重新 clone 不会影响学生文件：

- `/opt/coursework/gpu_2026/app`：Git 仓库、应用代码、`node_modules` 和 `.next`。
- `/data/coursework/gpu_2026/uploads`：学生提交的持久数据；绝不放进 Git。
- `/data/coursework/gpu_2026/backups`：本地数据库 dump 和 uploads 归档。
- `/etc/coursework/gpu_2026.env`：生产 secret 与环境相关配置；绝不放进 Git。

以下三个身份彼此独立，不能混淆：

- `yy` 是拥有并运行应用的普通 Linux 用户。
- `coursework_user` 是 Next.js 连接 PostgreSQL 使用的数据库账号。
- `admin` 是保存在应用 `users` 表中的网站管理员账号。

若尚未创建 Linux 用户，可执行以下命令。运行网站本身不要求 `yy` 有 sudo 权限；apt、Nginx、systemd、`/etc` 和 `/usr/local/sbin` 等系统级操作由现有管理员/root 完成。

```bash
sudo adduser yy
```

### 1. 安装基础系统工具

此阶段安装拉取代码、生成 secret 和反向代理所需的系统工具。

```bash
sudo apt update
sudo apt install -y curl ca-certificates git openssl nginx
git --version
openssl version
nginx -v
```

### 2. 安装 Node.js 22 与 pnpm 11.24.0

Ubuntu 20.04 自带的 Node.js 过旧。使用 NodeSource 安装 Node.js 22，再安装 `package.json` 声明的精确 pnpm 版本。

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version
npm --version

sudo npm install -g pnpm@11.24.0
pnpm --version
```

### 3. 在 Ubuntu 20.04 安装 PostgreSQL 16

Ubuntu 20.04（focal）需要使用 PostgreSQL archive，而不是当前 PGDG 主仓库。先显式添加 archive，再安装 PostgreSQL 16。

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

理想状态为 `16 main 5432 online`。在 Debian/Ubuntu 中，`postgresql.service` 显示 `active (exited)` 不代表数据库没有运行；应使用 `pg_lsclusters` 或 `sudo systemctl status postgresql@16-main --no-pager` 检查真实 cluster。

Ubuntu 20.04 已不在标准支持期。本节面向既有内网或 GPU/CUDA 服务器，不建议仅为了本项目贸然升级现有服务器操作系统。新建公网服务器应优先选择更新的 Ubuntu LTS 或 Ubuntu Pro/ESM。

### 4. 创建应用数据库

为应用创建最小权限的 PostgreSQL 登录账号，不要把 `postgres` 超级用户写入应用的连接字符串。

```bash
sudo -u postgres createuser --pwprompt coursework_user
sudo -u postgres createdb --owner=coursework_user gpu_2026

psql -h 127.0.0.1 -U coursework_user -d gpu_2026 -W
```

进入 `psql` 后验证连接并退出：

```sql
SELECT current_user, current_database();
\q
```

PostgreSQL 不应为了这个应用暴露到内网：

```bash
sudo ss -ltnp | grep 5432
```

它应监听 `127.0.0.1:5432` 和/或 `[::1]:5432`，不应是 `0.0.0.0:5432`。

### 5. clone 应用并创建持久数据目录

代码目录归普通部署用户所有；数据目录位于仓库之外。

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

生产环境使用 `--frozen-lockfile`，确保实际依赖版本与仓库 lockfile 完全一致。

### 6. 创建生产环境文件

回到管理员 shell 后，创建一个 `yy` 可读、但只能由 root 写入的环境文件目录。

```bash
sudo install -d -o root -g yy -m 0750 /etc/coursework
openssl rand -base64 48
sudoedit /etc/coursework/gpu_2026.env
```

在文件中填入真实生成值；不要把真实 secret 写入文档或 Git：

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

`SESSION_SECRET` 用于保护 session token，和 `SESSION_TTL_DAYS` 无关。不要把它作为数据库密码复用、不要提交 Git，也不要随意轮换；更换它会使现有 session 失效。`SESSION_TTL_DAYS` 只能取 1 到 30。`APP_URL` 必须和浏览器 origin 完全一致，且不能漏掉 `:8001`，因为上传会校验 Origin。示例是内网 HTTP，所以 `COOKIE_SECURE=false`；未来由 Nginx 终止 HTTPS 时，应改成 `https://...` 与 `COOKIE_SECURE=true`，并重启应用服务。

设置并验证权限：

```bash
sudo chown root:yy /etc/coursework/gpu_2026.env
sudo chmod 640 /etc/coursework/gpu_2026.env
sudo -u yy test -r /etc/coursework/gpu_2026.env && echo OK
```

`ENV_FILE` 由仓库中的 Node 脚本（例如 migration、创建管理员）读取。Next.js 自身不会自动读取 `ENV_FILE`：下方 build/手工启动章节会显式加载该文件，systemd 则使用 `EnvironmentFile=`。

### 7. 执行 migration 并创建第一个网站管理员

启动应用前先执行 migration。迁移工具会创建 `schema_migrations`，跳过已记录的文件，并在 transaction 中执行每个新的 migration。

```bash
sudo -iu yy
cd /opt/coursework/gpu_2026/app
ENV_FILE=/etc/coursework/gpu_2026.env pnpm db:migrate
```

创建网站管理员时不要把密码写进 shell history。`pnpm admin:create` 后不要添加多余的 `--`；脚本直接接受以下参数。

```bash
read -rs -p '管理员密码: ' PASSWORD; echo
printf '%s' "$PASSWORD" | ENV_FILE=/etc/coursework/gpu_2026.env pnpm admin:create --student-number admin --name 'GPU课程管理员' --password-stdin
unset PASSWORD
exit
```

网站管理员既不是 Linux 用户 `yy`，也不是 PostgreSQL role `coursework_user`。

### 8. build 并手工验证应用

在管理员 shell 中重新切换到 `yy`，再将生产环境变量加载到当前 shell。对直接运行 Next.js 而言，仅写 `ENV_FILE=... pnpm build` 不会让 Next.js 读取该文件。

```bash
sudo -iu yy
cd /opt/coursework/gpu_2026/app
set -a
. /etc/coursework/gpu_2026.env
set +a
pnpm build
pnpm exec next start --hostname 127.0.0.1 --port 3001
```

在另一个终端验证直接监听：

```bash
curl -I http://127.0.0.1:3001/login
ss -ltnp | grep 3001
```

必须看到 `127.0.0.1:3001`，而不是 `0.0.0.0:3001`。验证后用 `Ctrl+C` 停止手工进程，再执行 `exit` 回到管理员 shell 后配置 Nginx。

### 9. 每门课程使用一个外部端口和一个内部端口

没有内部 DNS 时，为每门课程分配一个 Nginx 外部端口和一个 Next.js 内部端口。不要采用 `/gpu2026/` 这样的路径前缀，因为它会增加 Next.js `basePath`、redirect、static assets、cookie 和 API path 的复杂度。

| 课程 | Nginx → Next.js |
| --- | --- |
| GPU 2026 | `8001 → 3001` |
| Course B | `8002 → 3002` |
| Course C | `8003 → 3003` |

创建 `/etc/nginx/sites-available/coursework-gpu-2026`：

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

应用上限为 50 MiB（`52428800` 字节）。Nginx 用 `60m`，给 multipart 和 HTTP request overhead 留余量。该站点监听 `8001`，因此不需要为了本课程删除 Ubuntu 默认的 port-80 site。生产应用没有 WebSocket endpoint，因此不需要 `Upgrade` 或 `Connection: upgrade` 代理头；仓库中的通用模板保留它们只是为了 Next.js 开发模式 HMR。

```bash
sudo ln -s /etc/nginx/sites-available/coursework-gpu-2026 /etc/nginx/sites-enabled/coursework-gpu-2026
sudo nginx -t
sudo systemctl enable --now nginx
sudo systemctl reload nginx
curl -I http://127.0.0.1:8001/login
```

只有 `nginx -t` 成功后才能 reload。未来启用 HTTPS 时，在 Nginx 终止 TLS，把 `APP_URL` 改为 `https://` origin、`COOKIE_SECURE=true`，再重启应用服务。

### 10. 使用 systemd 运行课程网站

先确认实际 pnpm 路径。以下配置假设输出为 `/usr/bin/pnpm`；如果不同，替换 `ExecStart`。

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

此后退出 SSH 不影响网站，服务器重启后会自动启动，Next.js 异常退出后会自动重启。

### 11. 生产验收检查

确认两个访问层和监听地址：

```bash
curl -I http://127.0.0.1:3001/login
curl -I http://127.0.0.1:8001/login
ss -ltn | grep -E ':3001|:8001'
```

预期 Next.js 为 `127.0.0.1:3001`，Nginx 为 `0.0.0.0:8001` 和/或 `[::]:8001`。随后在浏览器打开 `http://10.214.242.231:8001`，完成一整条业务验证：创建测试学生和测试作业、用该学生登录、上传测试 ZIP、管理员查看并下载文件，并确认文件实际位于 `/data/coursework/gpu_2026/uploads`。

## 自动本地备份

真正不可丢的是 PostgreSQL database 和 uploads；代码可以重新 clone。以下由 root 管理的脚本会创建带时间戳的数据库 dump、uploads 归档和 checksum，并保留 14 天本地备份。

创建 `/usr/local/sbin/backup-coursework-gpu-2026` 并填入：

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

不要直接依赖 timer，先手工测试：

```bash
sudo chmod 750 /usr/local/sbin/backup-coursework-gpu-2026
sudo /usr/local/sbin/backup-coursework-gpu-2026
cd /data/coursework/gpu_2026/backups/<timestamp>
sha256sum -c SHA256SUMS
pg_restore -l gpu_2026.dump | head
tar -tzf uploads.tar.gz | head
```

创建 `/etc/systemd/system/coursework-gpu-2026-backup.service`：

```ini
[Unit]
Description=Backup Coursework GPU 2026
After=postgresql.service

[Service]
Type=oneshot
ExecStart=/usr/local/sbin/backup-coursework-gpu-2026
```

创建 `/etc/systemd/system/coursework-gpu-2026-backup.timer`：

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

加载、手工测试并启用 timer：

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

`Type=oneshot` service 成功完成后显示 `inactive (dead)` 可能完全正常；应看 `status=0/SUCCESS` 和 journal。应 enable 的是 **timer**，不是 backup service。`OnCalendar` 使用服务器本地时区；`Persistent=true` 会在服务器之后启动时补执行错过的备份。

这是在线备份：先运行 `pg_dump`，再归档 uploads，因此不是严格原子快照。两步之间若恰好发生提交，数据库和文件可能短暂存在时间差。对一般课程系统通常足够。若要求严格一致，应在低峰期短暂停止应用，并使用含 `trap` 的失败安全运维流程确保服务一定会重新启动；不要使用可能在备份失败后永久停站的简单 stop/backup/start 流程。

## 恢复演练与备份局限

只有真正恢复过的备份才可靠。先找到最新备份，恢复到临时 database：

```bash
BACKUP_DIR=$(find /data/coursework/gpu_2026/backups \
  -mindepth 1 -maxdepth 1 -type d -name '20*' | sort | tail -n 1)
echo "$BACKUP_DIR"

sudo -u postgres createdb --owner=coursework_user gpu_2026_restore_test
read -rs -p 'coursework_user 数据库密码: ' DBPASS; echo
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

这里由当前 shell 打开 dump 并通过 stdin 传给 `pg_restore`，因为 `postgres` Linux 用户可能没有权限 traverse 私有备份目录。

将 uploads 恢复到临时目录并检查：

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

同机本地备份可以应对误删、错误 migration 和版本回退，但不能应对硬盘故障、`/data` 分区损坏、整台服务器丢失或整机误格式化。长期正式使用应把备份同步到 NAS、另一台服务器、另一块磁盘或其他独立存储。

## 从 GitHub 更新已部署的课程

正常应用更新不需要重启整台服务器。管理员先启动备份，普通部署用户更新、build 并执行 migration，随后管理员重启应用服务并检查两个入口。

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

当前 `pnpm build` 只编译应用，不会访问 PostgreSQL，也不依赖刚执行的 migration：查询用户或课程数据的页面都会因读取 cookie/session state 而动态渲染，数据库访问发生在请求运行时。因此先 build 再 migration，可避免新版本 build 失败时数据库已被提前修改。若 `git status` 不是干净状态，先处理服务器上的本地修改，再执行 `git pull --ff-only`。如果新版 `.env.example` 新增变量，必须在 build/restart 前同步更新 `/etc/coursework/gpu_2026.env`。失败时查看 `sudo journalctl -u coursework-gpu-2026 -n 100 --no-pager`。

| 修改内容 | 所需操作 |
| --- | --- |
| Next.js / React 源码 | build，然后重启 `coursework-gpu-2026`。 |
| `package.json` 或 lockfile | frozen-lockfile 安装依赖、build、重启。 |
| migration | 执行 migration，通常随该版本 build/restart。 |
| `/etc/coursework/gpu_2026.env` | 重启 `coursework-gpu-2026`。 |
| Nginx 配置 | `sudo nginx -t`，再 `sudo systemctl reload nginx`。 |
| 学生文件或业务数据 | 不需要重启服务。 |

正常 Next.js 代码更新不要求 `sudo reboot`、重启 PostgreSQL 或重启 Nginx。只有 Nginx 配置改变时才 reload Nginx。

## 多课程扩展

每门课程都是独立实例，拥有自己的代码 checkout、database、环境文件、uploads、backups、Next.js 端口、Nginx 端口、应用 service、备份 service 和备份 timer。

| 课程 | 应用目录 | Database | Next.js | Nginx | 应用 service |
| --- | --- | --- | --- | --- | --- |
| GPU 2026 | `/opt/coursework/gpu_2026/app` | `gpu_2026` | `3001` | `8001` | `coursework-gpu-2026` |
| Course B | `/opt/coursework/course_b_2026/app` | `course_b_2026` | `3002` | `8002` | `coursework-course-b-2026` |
| Course C | `/opt/coursework/course_c_2026/app` | `course_c_2026` | `3003` | `8003` | `coursework-course-c-2026` |

本文示例让多个独立 database 共用一个 PostgreSQL role `coursework_user`，维护更简单。若需要更严格的数据库隔离，也可以每门课程使用独立 PostgreSQL role；这不是强制要求。

## 日志与项目验证

常用日志命令：

```bash
sudo journalctl -u coursework-gpu-2026 -f
sudo journalctl -u coursework-gpu-2026-backup.service -n 50 --no-pager
sudo tail -f /var/log/nginx/access.log /var/log/nginx/error.log
sudo journalctl -u postgresql -f
```

提交或部署应用改动前执行：

```bash
pnpm verify
```

它依次执行 TypeScript、测试、lint 和 production build。生产验收还应通过 Nginx 验证学生上传、重新提交、本人下载、补交标记和修改密码；管理员创建作业、评分、单作业/全量导出；并确认学生 A 请求学生 B 的下载 URL 返回 404。
