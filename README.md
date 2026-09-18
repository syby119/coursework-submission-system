# 课程作业管理系统

面向单一课程的小型作业提交系统。它部署在一台普通 Linux 主机上：Next.js 负责页面、认证和业务逻辑，PostgreSQL 保存数据，私有本地目录保存学生文件，Nginx 负责反向代理。项目不依赖 Supabase、Vercel、Docker 或其他云服务。

## 当前功能

- 学生使用用户名登录（课程名单导入时，用户名为学号），查看已发布作业、截止时间和自己的提交状态。
- 学生只能上传 ZIP 作业包，单个文件最大 50 MB；可重新提交，系统始终以最后一次提交为准。
- 截止后仍可提交或重新提交，系统会将该当前提交标记为黄色“补交”。
- 学生只能下载自己的作业；登录后可验证当前密码并修改密码，修改会使其他设备上的旧会话失效。
- 管理员可创建、编辑作业，查看已提交和未提交学生，为已提交作业记录分数，并下载单个学生的作业。
- 新建作业的截止时间默认设为创建时刻后的两周；管理员可按需要修改。
- 管理员可分别导出单个作业的全部作业包、单个作业的成绩 Excel，或导出全部作业和汇总成绩 Excel。分数不会向学生显示。
- 系统生成的单作业和全量作业下载包均使用 ZIP/DEFLATE 的最高压缩级别（zlib level 9）。

## 架构与安全边界

```text
Browser → Nginx :80/:443 → Next.js :3000 (127.0.0.1)
                                  ├─ PostgreSQL :5432 (127.0.0.1)
                                  └─ UPLOAD_ROOT (私有本地目录)
```

- 账号使用用户名和 bcrypt password hash 登录；课程名单默认以学号作为用户名。
- 会话是 HttpOnly、SameSite=Lax 的随机 token cookie；数据库只保存带 `SESSION_SECRET` HMAC 的 token hash。
- 浏览器不连接数据库，PostgreSQL 不应暴露公网；每个请求在服务器端重新读取 session 与 role。
- 上传文件从不由 Nginx 静态暴露。下载必须通过受认证的应用 endpoint。
- 学生只能读取、下载和更新自己的提交；管理员权限由服务端再次验证，不能只靠前端隐藏按钮。
- 上传采用流式 multipart 解析，最大 50 MB；只允许 ZIP，并在服务器端校验压缩包结构与解压后大小。
- 管理员导出会在 ZIP 内将每位学生的压缩包内容直接展开到 `作业名/学号_姓名/`。为防范 ZIP bomb，压缩包最多 1,000 个条目，单文件最多 250 MB、解压总量最多 500 MB；拒绝路径穿越、符号链接、加密和不支持的压缩方法。
- 管理员可在作业提交表中为已提交学生保存分数。分数仅对管理员可见；管理员可单独导出成绩 Excel，其中包含所有学生的学号、姓名、提交状态、最后提交时间和分数；未评分或未提交时分数为 `0`。作业 ZIP 不包含成绩表。
- 截止时间后仍允许学生提交或重新提交；当前提交时间晚于截止时间时，学生与管理员页面、单作业成绩 Excel 会显示黄色“补交”。
- 作业管理页可一键导出全部作业和成绩。下载 ZIP 的最外层为 `全部作业和成绩/`，每个作业各有以作业标题命名的目录；根目录的 `成绩汇总.xlsx` 按学生汇总每个作业的分数，未评分或未提交时为 `0`。
- 旧版本中已保存的 PDF、DOC、DOCX 仍可单独下载，但不能在新导出流程中展开；对应学生须重新提交 ZIP 后才能导出该作业。
- 时间以 PostgreSQL UTC `timestamptz` 存储，界面使用 `Asia/Shanghai` 显示。

## 依赖

- Ubuntu 24.04 或兼容 Linux
- Node.js 22+、pnpm 11+
- PostgreSQL 16+（Ubuntu 自带版本可用）
- Nginx（生产或 WSL production-like 验证）

## 环境变量

复制模板。`.env`、`.env.local`、`.env.production` 都被 Git 忽略；服务器推荐使用 `/etc/homework-system/homework-system.env`。

```bash
cp .env.example .env
```

```dotenv
NODE_ENV=production
DATABASE_URL=postgresql://homework_user:password@127.0.0.1:5432/homework
UPLOAD_ROOT=/data/homework-system/uploads
BACKUP_ROOT=/data/homework-system/backups
SESSION_SECRET=replace-with-a-random-secret-of-at-least-32-characters
SESSION_TTL_DAYS=7
APP_URL=http://localhost
COOKIE_SECURE=false
MAX_UPLOAD_SIZE=52428800
```

生成 session secret：

```bash
openssl rand -base64 48
```

`APP_URL` 必须与浏览器实际访问的 origin 完全一致，用于上传 API 的 CSRF Origin 校验。WSL 通过 Nginx 用 HTTP 访问时设为 `http://localhost` 与 `COOKIE_SECURE=false`；实验室 HTTPS 正式域名应设为 `https://homework.example.edu.cn` 与 `COOKIE_SECURE=true`。`pnpm build` 明确使用 Next.js 的 Webpack build 模式，避免不同 Linux/WSL 环境的 Turbopack 进程限制差异。

## 数据库与账号

SQL migrations 位于 `migrations/`，通过 Git 版本控制。执行：

```bash
pnpm install --frozen-lockfile
pnpm db:migrate
```

创建管理员时，避免将密码写进 shell history：

```bash
read -rs -p '管理员密码: ' PASSWORD; echo
printf '%s' "$PASSWORD" | pnpm admin:create -- --student-number admin --name '课程管理员' --password-stdin
unset PASSWORD
```

批量导入学生 CSV 必须包含初始密码列：

```csv
student_number,name,password
20260001,学生甲,a-long-initial-password
20260002,学生乙,another-long-password
```

```bash
pnpm students:import -- students.csv
```

CSV 导入会在单一数据库 transaction 中执行；学号重复或字段不完整时会整体失败。

若教务名单为 Excel，可使用 `students:import-xlsx`。首个工作表的前两列必须依次为 `姓名`、`学号`；例如“学院”等其他列会被忽略。初始密码以标准输入传入，不会出现在命令历史中：

```bash
read -rs -p '学生初始密码: ' INITIAL_PASSWORD; echo
printf '%s' "$INITIAL_PASSWORD" | pnpm students:import-xlsx -- student_list.xlsx --password-stdin
unset INITIAL_PASSWORD
```

Excel 中存在重复学号、空姓名/学号，或数据库已经存在其中任一学号时，导入会整体失败，不会创建部分账号。`student_list.xlsx` 默认被 Git 忽略，避免提交学生个人信息。

学生登录后可通过页头的“修改密码”更新密码。修改需要验证当前密码并二次确认；成功后当前浏览器会获得新会话，其他设备上的旧会话会全部失效。该网页入口仅对学生显示。

## WSL production-like 部署

以下步骤在 WSL Ubuntu 中执行，需要 sudo。不要使用 `pnpm dev` 作为验收方式。

### 0. 可选：启用 WSL systemd

先检查 WSL 是否已启用 systemd：

```bash
ps -p 1 -o comm=
```

若输出不是 `systemd`，编辑 `/etc/wsl.conf`：

```bash
sudo editor /etc/wsl.conf
```

加入：

```ini
[boot]
systemd=true
```

`editor` 会调用当前 Ubuntu 系统配置的默认文本编辑器；可用 `sudo update-alternatives --config editor` 选择它。保存后，在 **Windows PowerShell**（而不是 WSL shell）执行 `wsl --shutdown`，再重新打开 WSL。若暂时不启用 systemd，后续把 `systemctl` 启动/reload 命令改为 `sudo service <服务名> start` 或 `sudo service <服务名> reload` 即可。

### 1. 安装系统软件

```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib nginx
sudo systemctl enable --now postgresql
```

如果 WSL 未启用 systemd，可先直接启动 PostgreSQL 服务；Nginx/systemd 的正式服务器步骤不受影响。

### 2. 创建数据库

```bash
sudo -u postgres createuser --pwprompt homework_user
sudo -u postgres createdb --owner=homework_user homework
```

确认 PostgreSQL 只监听 localhost：

```bash
sudo ss -ltnp | grep 5432
```

### 3. 创建私有数据目录

开发时将 `.env` 中 `UPLOAD_ROOT` 改成当前 Linux 用户可写、仓库外的路径，例如 `/data/homework-system/uploads`。然后：

```bash
sudo ./scripts/setup-data-dir.sh /data/homework-system/uploads "$USER" "$USER"
sudo install -d -o "$USER" -g "$USER" -m 0750 /data/homework-system/backups
```

### 4. build、migration、启动

```bash
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm build
pnpm start
```

另开终端确认应用仅监听本机：

```bash
curl -I http://127.0.0.1:3000/login
```

### 5. 配置 Nginx

```bash
sudo cp deploy/nginx/homework-system.conf /etc/nginx/sites-available/homework-system
sudo ln -s /etc/nginx/sites-available/homework-system /etc/nginx/sites-enabled/homework-system
sudo nginx -t
sudo systemctl reload nginx
```

模板的 `server_name localhost` 会让 `http://localhost` 命中本系统；不需要删除 Nginx 的 `default` 站点。未启用 systemd 时，最后一条命令使用 `sudo service nginx reload`。现在通过 `http://localhost/login` 访问。Nginx 已设置 60 MB 请求限制，且没有任何 uploads 静态目录配置。

模板也会转发 WebSocket Upgrade header，因此 `pnpm dev` 的 Next.js HMR 可通过 Nginx 工作。若浏览器日志出现 `GET /_next/hmr ... 404`，重新复制模板、执行 `sudo nginx -t` 并 reload Nginx，再刷新浏览器页面。

### 同一服务器部署多个网站

每个网站都应有独立的 Nginx server block 和唯一的 `server_name`。实验室服务器复制模板后，编辑 `/etc/nginx/sites-available/homework-system`，将 `server_name localhost;` 改为学校分配的域名，例如：

```nginx
server_name homework.example.edu.cn;
```

同时把环境文件中的 `APP_URL` 设为完全相同的公网 origin（HTTPS 启用后为 `https://homework.example.edu.cn`），再重启应用。保留一个全局默认站点来处理没有匹配域名的请求即可；只有该站点使用 `default_server`。其他网站不应使用 `default_server`，也不应使用 `server_name _` 来接管所有域名。

## 实验室 Ubuntu 服务器部署

代码不因 WSL 与实验室服务器改变；只替换环境文件、系统用户和域名。

1. 安装 Node.js 22、pnpm、PostgreSQL、`postgresql-contrib`、Nginx。
2. 创建服务用户和部署目录：

   ```bash
   sudo useradd --system --home /opt/homework-system --shell /usr/sbin/nologin homework
   sudo install -d -o homework -g homework /opt/homework-system
   sudo install -d -o homework -g homework -m 0750 /data/homework-system/uploads
   sudo install -d -o homework -g homework -m 0750 /data/homework-system/backups
   ```

3. 将同一仓库 clone 到 `/opt/homework-system`，并让 `homework` 用户可读代码：

   ```bash
   sudo -u homework git clone <repository-url> /opt/homework-system
   sudo -u homework pnpm install --frozen-lockfile
   ```

4. 用 PostgreSQL 创建 `homework_user` 和 `homework` 数据库。
5. 创建 `/etc/homework-system/homework-system.env`，owner 为 `root:homework`、权限为 `0640`；内容与 `.env.example` 相同，但使用生产数据库密码、生产 `APP_URL`、`COOKIE_SECURE=true`。该服务用户本来就需要在运行时读取这些值，不能把这个文件设为它不可读。
6. 以服务用户执行 migration 与 build：

   ```bash
   sudo -u homework env ENV_FILE=/etc/homework-system/homework-system.env pnpm db:migrate
   sudo -u homework env ENV_FILE=/etc/homework-system/homework-system.env pnpm build
   ```

7. 安装服务：

   ```bash
   sudo cp deploy/systemd/homework-system.service.example /etc/systemd/system/homework-system.service
   sudo systemctl daemon-reload
   sudo systemctl enable --now homework-system
   sudo systemctl status homework-system
   sudo journalctl -u homework-system -f
   ```

8. 安装 Nginx 配置并执行 `sudo nginx -t && sudo systemctl reload nginx`。

生产网络仅公开 80/443 和按实验室安全策略管理的 SSH；不要公开 3000 或 5432。

## HTTPS

TLS 由 Nginx 终止，Next.js 仍只监听 `127.0.0.1:3000`。有公网域名时可安装 Certbot：

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d homework.example.edu.cn
```

也可使用学校提供的证书。启用 HTTPS 后更新环境文件的 `APP_URL` 与 `COOKIE_SECURE=true`，再重启 `homework-system`。

## 备份

使用部署环境变量运行：

```bash
set -a
. /etc/homework-system/homework-system.env
set +a
./scripts/backup.sh
```

脚本将创建 PostgreSQL custom-format dump 和 uploads 压缩包。`BACKUP_ROOT` 与 uploads 位于同一磁盘不能防止硬盘损坏；正式使用必须将备份同步到另一台服务器、NAS 或独立存储。

## 日志与排错

- 应用日志：`sudo journalctl -u homework-system -f`
- Nginx access/error log：`/var/log/nginx/access.log`、`/var/log/nginx/error.log`
- PostgreSQL：`sudo journalctl -u postgresql -f`

普通用户只会收到通用错误消息；数据库错误、磁盘路径、session token、环境变量和堆栈只写入服务器日志。

## 验证

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

生产验收须通过 Nginx 完成：创建管理员和两名学生；创建作业；学生上传 ZIP、重交 ZIP、下载本人文件和修改密码；确认管理员能查看名单、记录分数、下载和导出 ZIP（学生目录内直接是压缩包内容）；确认学生页面不显示分数，student A 请求 student B 下载 URL 得到 404；将 deadline 设为过去后上传，确认服务器接受提交并显示黄色“补交”。
