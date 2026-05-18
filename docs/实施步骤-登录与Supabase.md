# 登录与 Supabase — 分步执行清单

与方案总览见 `docs/移动端与Supabase适配方案.md`。本文是**第一步：控制台 + 本地环境 + 跑通登录**。

> **注意**：未配置 `NEXT_PUBLIC_SUPABASE_*` 时，**本地开发**（`next dev`）中间件**不会**强制登录，便于无云改 UI。**生产构建**（`NODE_ENV=production`，含 Vercel）下未配置时，访问 `/dashboard` 等会被**重定向到登录页**并带 `reason=missing_supabase_env`，避免「裸奔」进仪表盘。上线前必须在运行环境填写密钥并完成登录联调。

---

## 第一步：在 Supabase 创建项目

1. 打开 [Supabase Dashboard](https://supabase.com/dashboard)，新建项目（记下数据库密码，仅用于紧急直连）。
2. 左侧 **Project Settings → API**：复制  
   - **Project URL** → 填入本地 `NEXT_PUBLIC_SUPABASE_URL`  
   - **anon public** 密钥 → 填入 `NEXT_PUBLIC_SUPABASE_ANON_KEY`  
   （若控制台已改为 Publishable key，按界面说明使用对应变量名，并在 `.env.local` 中与代码一致即可。）

---

## 第二步：配置 Auth 与重定向 URL

1. **Authentication → URL Configuration**  
   - **Site URL**：开发阶段填 `http://localhost:3000`（部署后改为正式域名）。  
   - **Redirect URLs** 增加：  
     - `http://localhost:3000/auth/callback`  
     - 若用预览部署，再加 `https://你的预览域名/auth/callback`。
2. **Authentication → Providers → Email**  
   - 保持开启；**不设自助注册**时，仍可在 Dashboard **手动创建用户**（见下一步）。  
3. **邮件模板**：确认「重置密码」邮件中的链接能指向你的 Site URL（默认一般即可）。

---

## 第三步：执行数据库 SQL

1. 左侧 **SQL Editor → New query**。  
2. 将仓库内文件 **`supabase/migrations/001_user_empire.sql`** 全文粘贴执行。  
3. 再执行 **`supabase/migrations/002_activity_journal.sql`**（勤政录 / 邸报 / 政务工时 + **`grand_tour_json`** 列）。  
4. **Table Editor** 中应出现：
   - **`user_empire`**（含 **`grand_tour_json`**）
   - **`event_log`**
   - **`quest_work_session`**

---

## 第四步：创建测试账号（无自助注册）

1. **Authentication → Users → Add user → Create new user**。  
2. 填写 **Email**、**Password**（至少 8 位，与方案一致），可勾选 **Auto Confirm User**（便于本地立刻登录）。  
3. 保存后，用该邮箱 + 密码在本地登录页登录。

---

## 第五步：本地环境变量与依赖

1. 在项目根目录复制：  
   `copy .env.example .env.local`（PowerShell）或手动复制并重命名为 `.env.local`。  
2. 编辑 `.env.local`，填入第二步的两个变量。  
3. 依赖已加入 `package.json`（`@supabase/supabase-js`、`@supabase/ssr`）；若尚未安装：  
   `npm install`

---

## 第六步：启动并验证

```bash
npm run dev
```

1. 浏览器打开 `http://localhost:3000` → 应经 `/dashboard` 被重定向到 **`/login`**。  
2. 使用第四步账号登录 → 进入 **`/dashboard`**。  
3. 打开 **造办处**（齿轮）→ 点击 **退出登录** → 回到 **`/login`**。  
4. **忘记密码**：在登录页进入「忘记密码」，输入邮箱；查收邮件，点击链接后应落到 **`/auth/update-password`** 并允许设置新密码。

---

## 第七步：云端同步（已实现于仓库）

以下由代码自动完成（`components/empire-cloud-sync.tsx`、`lib/supabase/empire-sync.ts`、`lib/activity-journal-bridge.ts`、`store/prefs-store.ts`）：

1. 客户端 **rehydrate** 全部 persist（含 `hanling-prefs`）。  
2. **已登录**：拉取 `user_empire`；无行或快照为空 → 用当前本地 **upsert 种子**；否则 **解析后覆盖**各 Store（与帝国档案同套校验，含 **`grand_tour_json`**）。  
3. **`bindActivityJournalSync`** → 拉取 **`event_log`**、**`quest_work_session`** → 写入 **`useEventStore`** / **`useWorkSessionStore`**。  
4. 随后执行 **`resetDailyQuests` → `ensureQuestBootstrap`**（与方案一致）。  
5. 对 emperor / map / quest / event / prefs **subscribe**，约 **2.2s 防抖** 后 **upsert** 写回 **`user_empire`**（**`client_schema_version: 2`**，含巡游）。邸报/工时 **即时** 写各自表（非 event_json 全量镜像）。  
6. **`onAuthStateChange`**：处理 **同页登录**（`SIGNED_IN` 再拉云）与 **退出**（清订阅、清工时缓存、再跑 catalog）。  
7. Oracle 首单捷报、红线「早朝停办」已迁入 **`prefs_json` ↔ `usePrefsStore`**，旧 localStorage 键在启动时 **迁移后删除**。

**请你自测**

- 双浏览器同账号：A 改沙盘/军机，等 ~3 秒，B 刷新应看到变化（或再操作触发拉取：当前 B 仅在 **刷新 / 重新登录** 时拉云；多端「秒级」一致需二期 Realtime，方案已定不做）。  
- Supabase **Table Editor**：`user_empire.updated_at` 随五域变更；点卯后 **`quest_work_session`** 新增一行且 **`operations`** 随动作增长；邸报在 **`event_log`**。  
- 顶栏 **八百里加急** 仅见 **今日（北京时间）** 邸报；**勤政录 → 政务工时** 可见完整操作时间线。

## 第八步：H5 适配（已实现）

**主页（九州图志）**

- **邸报**：`TreasuryHUD` 顶栏 **卷轴** → **Dialog**（`EventLogPanel`）；默认 **北京时间今日**；完整归档见 **勤政录**。  
- **军机选城**：`lib/use-is-lg.ts`（`useSyncExternalStore` + `matchMedia`）；**`<1024px`** 为 **底栏 Sheet** 列表，**`lg+`** 仍为 **Select**（`components/dashboard/quest-engine.tsx`）。  
- **安全区**：`app/layout.tsx` 增加 `viewportFit: "cover"`；`TreasuryHUD` / 底栏军机按钮区使用 **`env(safe-area-inset-*)`**；顶栏主要按钮 **≥44px**。

**子页面（约 2026-05 增量）**

- **公共**：`lib/mobile-ui.ts`、`components/layout/mobile-subpage-shell.tsx`（返回九州、顶/底 safe-area、**44px** 返回钮）。  
- **勤政录** `/dashboard/activity`：统一壳；邸报/工时双 Tab；筛选与导出小屏全宽。  
- **集团军** `/dashboard/campaign`：统一壳；战役模式/城池/点卯触控加高；小屏隐藏流水线拖拽把手。  
- **巡游四海** `/dashboard/grand-tour`：统一壳；**`< lg` 行在目录 Sheet**。  
- **造办处** `/settings`：顶栏 safe-area；三 Tab 横滑 + 触控高度。

**请你自测（375px 竖屏）**

1. 顶栏邸报卷轴、勤政录/罗盘/集团军图标可点且不贴刘海。  
2. 底栏「军机处·养正与宫务」Sheet 可滚动、不被 Home 条遮挡。  
3. 进入勤政录 / 集团军 / 巡游，顶栏 **←** 回 `/dashboard`；勤政录可切换双 Tab 并导出。  
4. 巡游小屏点 **行在目录** 可换行在；集团军可多选城并点「集群点卯」。  
5. 造办处三 Tab 可横滑切换。

## 第九步：上线前检查（手动）

1. Supabase **Authentication → URL**：**Site URL**、**Redirect URLs** 改为生产域名（含 `https://你的域/auth/callback`）。**说明**：这两项只影响**登录邮件 / OAuth 回调**能否跳回你的网站，**不会**替 Next.js 拦截未登录访问；页面门禁靠 **Vercel 环境变量 + 中间件**。  
2. 确认 **禁止自助注册**、测试账号策略。  
3. 部署环境配置 **`NEXT_PUBLIC_SUPABASE_*`**（勿将密钥提交到公开仓库）。

---

## 常见问题

| 现象 | 处理 |
|------|------|
| PC / 手机不登录也能进仪表盘 | **与 Supabase「URL Configuration」无关**（那里只管邮件/OAuth 回调域名）。请查 **Vercel Environment Variables** 是否已配置 `NEXT_PUBLIC_SUPABASE_*` 并 **Redeploy**；部署环境缺变量时中间件无法验会话。另试 **无痕窗口** 排除旧 Cookie。 |
| 登录报「Invalid API key」 | 检查 `.env.local` 是否保存、是否重启 `npm run dev`。 |
| 邮件链接打开后报错 | Redirect URLs 是否包含当前 origin 的 `/auth/callback`。 |
| `user_empire` 插入被拒 | 检查 RLS 策略与是否已 `to authenticated`；插入时 `user_id` 必须等于 `auth.uid()`。 |

---

*文档随实现推进可继续增补「云同步」小节。*
