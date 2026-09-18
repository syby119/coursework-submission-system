# 课程作业管理系统

一个面向单一课程的轻量作业提交 MVP。学生可以查看和重复提交作业；管理员可以管理作业、查看提交/未提交名单并下载文件。访问控制由 Supabase Auth、PostgreSQL RLS 与私有 Storage policy 共同保证。

## 技术栈

- Next.js 16、TypeScript strict、React 19、App Router、Tailwind CSS
- Supabase Auth（Email + Password）、PostgreSQL、Storage
- pnpm、Vercel

首版采用单一课程模型：全部 `role = student` 的用户均计入学生名单。时间在 PostgreSQL 中以 UTC (`timestamptz`) 保存，界面始终以 `Asia/Shanghai` 显示。

## 本地启动

需要 Node.js 22+、pnpm 及一个 Supabase 项目。

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

在 `.env.local` 填入 Supabase 项目 Project Settings → API 中的值：

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

这两个变量可用于浏览器；项目不使用 `SUPABASE_SERVICE_ROLE_KEY`。绝不能把 service-role key 放进 `NEXT_PUBLIC_*`、Git 或浏览器代码。

## 初始化 Supabase

1. 在 Supabase 新建项目。
2. 安装并登录 Supabase CLI，例如 `pnpm dlx supabase login`。
3. 在仓库根目录执行：

   ```bash
   pnpm dlx supabase link --project-ref <project-ref>
   pnpm dlx supabase db push
   ```

   这会按顺序应用 `supabase/migrations/` 中的表、索引、trigger、RLS、私有 `submissions` bucket 及 Storage policy。

4. 在 Supabase Dashboard → Authentication → Providers 启用 Email provider。首版没有注册页面；在 Authentication → Users 手动创建或邀请学生账号。建议关闭不需要的公开注册入口。
5. 在 Authentication → URL Configuration 中加入本地 `http://localhost:3000` 和生产 Vercel 域名的 Site URL/Redirect URLs。

新建 Auth 用户会自动创建 `profiles` 记录，默认角色为 `student`。请在用户 metadata 里提供 `name` 和 `student_number`，或直接在 profile 中补充姓名和学号。

### 指定管理员

管理员只通过 Supabase SQL Editor 或受控运维脚本设置，普通用户无法在应用内修改角色：

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'teacher@example.edu');
```

## 安全与上传行为

- Bucket 完全私有；文件路径为 `{assignment_id}/{student_id}/{random_uuid}.{extension}`。
- 只支持 PDF、ZIP、DOC、DOCX，最大 50 MB。浏览器、Server Action、数据库约束和 Storage policy 均校验限制。
- 学生只可读写自身路径下、未截止作业的对象；RLS 强制 submission 的 `student_id = auth.uid()`。
- 管理员由数据库 `profiles.role` 判断，可读取全部 profile、submission 和 Storage 对象。
- 重新提交会更新唯一的 `(assignment_id, student_id)` 当前记录；旧文件会被最佳努力删除，不保留版本历史。

## 检查与验收

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

手工验收需创建管理员和两名学生：

1. 学生登录，查看作业，上传 PDF，再上传 ZIP，确认最后提交时间与文件都更新。
2. 截止后在页面和直接调用 Supabase REST/Storage API 尝试上传/更新，均应被拒绝。
3. 使用 student A 的 session 尝试读取 student B 的 submission row 或 Storage path；即使篡改 URL/请求，也必须被 RLS 拒绝。
4. 管理员创建并编辑作业，确认提交统计、未提交学生和文件下载正确。

## Vercel 部署

1. 将仓库推送到 Git 服务并导入 Vercel，Framework 选择 Next.js。
2. 在 Vercel Project Settings → Environment Variables 为 Preview 与 Production 设置两个 `NEXT_PUBLIC_SUPABASE_*` 变量。
3. 将 Vercel 生产域名加入 Supabase Auth 的 Site URL 和 Redirect URLs。
4. 部署后以管理员和两个学生账号执行上述验收；不要配置或暴露 service-role key。
