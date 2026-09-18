# 课程作业管理系统

[English README](README.md)

面向单一课程、几十至数百名学生的轻量作业提交系统。它采用单机 Linux 部署：Next.js 提供页面与业务逻辑，PostgreSQL 保存数据，私有本地目录保存作业，Nginx 负责反向代理。项目不依赖 Supabase、Vercel、Docker 或其他云服务。

## 功能

- 学生以用户名和密码登录；课程名单导入时，默认以学号作为用户名。
- 学生查看已发布作业、截止时间和自己的状态；仅能上传 ZIP 文件，最大 50 MB，可重新提交。
- 截止后仍允许提交，最新提交会标记为“补交”。学生只能下载自己的文件，且可自行修改密码。
- 管理员创建、编辑、删除作业，管理课程学生名单，查看全部学生的提交状态，记录分数，并下载学生文件。
- 管理员可分别导出单个作业的 ZIP、单个作业成绩 Excel，或导出全部作业及成绩汇总 ZIP。
- ZIP 导出会将每位学生的上传包展开到 `作业名/学号_姓名/`；未提交学生也会保留空目录。
- 页面支持中文与 English 切换；界面、反馈、时间格式和新导出的 Excel/归档名会随语言切换。作业标题、说明、姓名及原始文件名等用户数据保持原文。

## 架构与安全

```text
Browser → Nginx :80/:443 → Next.js :3000 (127.0.0.1)
                                  ├─ PostgreSQL :5432 (127.0.0.1)
                                  └─ UPLOAD_ROOT（私有本地目录）
```

- 密码使用 bcrypt hash 保存；会话是 HttpOnly、SameSite=Lax 的随机 cookie token。
- 所有用户与管理员权限均在服务器端验证；学生不能读取其他学生的提交。
- 上传目录不通过 Nginx 静态暴露；文件下载必须经过应用层鉴权。
- 上传使用流式 multipart 解析，只允许 ZIP，并校验 MIME、扩展名、路径穿越、符号链接、加密压缩包及解压大小。
- 时间以 PostgreSQL UTC `timestamptz` 保存，界面统一以 `Asia/Shanghai` 显示。

## 依赖

- Node.js 22+ 和 pnpm 11+
- PostgreSQL 16+ 或兼容版本
- Nginx（生产部署或 WSL production-like 验证时）
- Ubuntu 24.04 或兼容 Linux（正式部署）

## 配置环境变量

复制模板，并填写真实值。不要提交 `.env`、`.env.local` 或 `.env.production`。

```bash
cp .env.example .env
openssl rand -base64 48
```

| 变量 | 说明 |
| --- | --- |
| `DATABASE_URL` | 本机 PostgreSQL 连接，例如 `postgresql://coursework_user:password@127.0.0.1:5432/coursework` |
| `UPLOAD_ROOT` | 仓库外、仅应用用户可读写的上传目录 |
| `BACKUP_ROOT` | 备份输出目录 |
| `SESSION_SECRET` | 至少 32 字符的随机 secret；可用上面的 `openssl` 命令生成 |
| `SESSION_TTL_DAYS` | 会话有效天数，范围为 1–30，默认 7 |
| `APP_URL` | 实际访问地址，必须与浏览器 origin 完全一致；用于上传 CSRF Origin 校验 |
| `COOKIE_SECURE` | HTTP 本地测试为 `false`；HTTPS 正式部署为 `true` |
| `MAX_UPLOAD_SIZE` | 最大上传字节数；默认 `52428800`（50 MB） |

本地经 Nginx 访问时，通常设置 `APP_URL=http://localhost` 和 `COOKIE_SECURE=false`。正式 HTTPS 站点示例为 `APP_URL=https://homework.example.edu.cn` 和 `COOKIE_SECURE=true`。

## 本地开发

1. 安装项目依赖：

   ```bash
   pnpm install --frozen-lockfile
   ```

2. 创建 PostgreSQL 用户与数据库（Ubuntu/WSL）：

   ```bash
   sudo -u postgres createuser --pwprompt coursework_user
   sudo -u postgres createdb --owner=coursework_user coursework
   ```

3. 创建私有数据目录。`$USER` 应为运行 Next.js 的 Linux 用户：

   ```bash
   sudo ./scripts/setup-data-dir.sh /data/homework-system/uploads "$USER" "$USER"
   sudo install -d -o "$USER" -g "$USER" -m 0750 /data/homework-system/backups
   ```

4. 配置 `.env` 后运行 migration、创建管理员并启动开发服务器：

   ```bash
   pnpm db:migrate
   read -rs -p '管理员密码: ' PASSWORD; echo
   printf '%s' "$PASSWORD" | pnpm admin:create -- --student-number admin --name '课程管理员' --password-stdin
   unset PASSWORD
   pnpm dev
   ```

访问 `http://localhost:3000/login`。开发服务器仅用于开发，不用于正式验收或生产。

## 导入学生

推荐在管理员导航中的**学生管理**页面完成操作：可查看名单、添加或删除单个学生，以及导入 Excel 名单。所有新添加学生的初始密码均为 `123456`。

导入 Excel 时，首个工作表前两列必须依次为 `姓名`、`学号`；其他列会忽略。导入会在单个数据库 transaction 中完成：重复学号、空字段、无效文件或数据库已有学号都会让整批导入失败，不会只导入部分学生。

服务器管理时仍可使用命令行导入工具，初始密码同样固定为 `123456`。CSV 格式必须为 `student_number,name`：

```csv
student_number,name
20260001,学生甲
20260002,学生乙
```

```bash
pnpm students:import -- students.csv
```

命令行导入 Excel 使用相同的表格格式：

```bash
pnpm students:import-xlsx -- student_list.xlsx
```

## WSL production-like 部署

此流程验证与正式 Ubuntu 服务器相同的生产模式：PostgreSQL、Nginx、`pnpm build` 与 `pnpm start`。不要用 `pnpm dev` 代替验收。

```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib nginx
sudo systemctl enable --now postgresql
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm build
pnpm start
```

另开终端确认 Next.js 仅监听本机：

```bash
curl -I http://127.0.0.1:3000/login
```

安装 Nginx 模板后，通过 `http://localhost/login` 访问：

```bash
sudo cp deploy/nginx/homework-system.conf /etc/nginx/sites-available/homework-system
sudo ln -s /etc/nginx/sites-available/homework-system /etc/nginx/sites-enabled/homework-system
sudo nginx -t
sudo systemctl reload nginx
```

若 WSL 未启用 systemd，请使用 `sudo service postgresql start` 与 `sudo service nginx reload`，或先在 `/etc/wsl.conf` 启用 systemd 后，在 Windows PowerShell 执行 `wsl --shutdown`。

## Ubuntu 服务器部署

WSL 与实验室服务器使用同一份代码和 migration；只有环境变量、系统用户与域名不同。

1. 安装 Node.js、pnpm、PostgreSQL、Nginx，并创建服务用户与数据目录：

   ```bash
   sudo useradd --system --home /opt/homework-system --shell /usr/sbin/nologin homework
   sudo install -d -o homework -g homework /opt/homework-system
   sudo install -d -o homework -g homework -m 0750 /data/homework-system/uploads
   sudo install -d -o homework -g homework -m 0750 /data/homework-system/backups
   ```

2. Clone 代码、安装依赖、创建 PostgreSQL 用户与数据库：

   ```bash
   sudo -u homework git clone <repository-url> /opt/homework-system
   cd /opt/homework-system
   sudo -u homework pnpm install --frozen-lockfile
   sudo -u postgres createuser --pwprompt coursework_user
   sudo -u postgres createdb --owner=coursework_user coursework
   ```

3. 创建 `/etc/homework-system/homework-system.env`，内容以 `.env.example` 为准。建议 owner 设为 `root:homework`、权限 `0640`；生产环境应设置真实数据库密码、HTTPS `APP_URL` 和 `COOKIE_SECURE=true`。

4. 执行 migration 与 build：

   ```bash
   cd /opt/homework-system
   sudo -u homework env ENV_FILE=/etc/homework-system/homework-system.env pnpm db:migrate
   sudo -u homework pnpm build
   ```

5. 安装 systemd 与 Nginx：

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

在 Nginx 配置中将 `server_name localhost;` 替换为实际域名，并将环境文件的 `APP_URL` 设置为相同 origin。每个网站应使用独立的 Nginx server block 与唯一的 `server_name`；只有一个全局站点可使用 `default_server`。不要向公网开放 3000 或 5432。

## HTTPS、备份与日志

TLS 在 Nginx 终止，Next.js 始终监听 `127.0.0.1:3000`。有公网域名时可使用 Certbot：

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d homework.example.edu.cn
```

启用 HTTPS 后更新 `APP_URL`、`COOKIE_SECURE=true`，然后重启 `homework-system`。

运行备份前先加载生产环境变量：

```bash
set -a
. /etc/homework-system/homework-system.env
set +a
./scripts/backup.sh
```

脚本会创建 PostgreSQL custom-format dump 与 uploads 压缩包。与 uploads 位于同一块磁盘的备份不能抵御硬盘损坏；请同步到另一台服务器、NAS 或其他独立存储。

常用日志命令：

```bash
sudo journalctl -u homework-system -f
sudo tail -f /var/log/nginx/access.log /var/log/nginx/error.log
sudo journalctl -u postgresql -f
```

## 验证

提交或部署前运行：

```bash
pnpm verify
```

它依次执行 TypeScript、测试、lint 与 production build。生产验收还应通过 Nginx 验证：学生上传、重新提交、本人下载、补交标记和修改密码；管理员创建作业、评分、单作业/全量导出；并确认学生 A 请求学生 B 的下载 URL 返回 404。
