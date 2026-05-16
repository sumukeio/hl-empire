# 瀚翎帝国：移动端适配 + Supabase 数据层 — 技术方案

> **文档性质**：与实现对齐的说明见 `docs/瀚翎帝国-设计与机制说明.md`。下文 **§2 已定案** 为产品决策，实施以本节为准。

---

## 1. 背景与目标

| 需求 | 目标 |
|------|------|
| **移动端适配** | **H5 响应式**：典型手机宽度（约 360–430 CSS px）与竖屏下可读、可点、可滚动；**不做**本期 PWA / 离线安装包（见 §7）。 |
| **Supabase 适配** | **云为主、本地为缓存**：Supabase（Postgres + Auth）为权威数据源；客户端 Zustand + `localStorage` 作离线缓存与首屏加速；**不使用** Supabase Realtime（本期）。 |

**约束**：当前工程为 Next.js 14 App Router + Zustand `persist`（`localStorage`），四域 Store：`emperor` / `map` / `quest` / `event`；另有 `oracle-briefing`、`imperial-red-line-watch` 等少量直接读写 `localStorage` 的键——**本期收编**进云端同步的 JSON 体系（见 §2、§5.4）。

---

## 2. 已定案决策总览（产品）

| # | 主题 | 决策 |
|---|------|------|
| 1 | 登录方式 | **邮箱 + 密码**（与 Supabase Auth 默认一致；登录名即邮箱）。 |
| 2 | 注册 | **不提供自助注册**；账号由管理员在 Supabase Dashboard（或后续管理脚本）创建。 |
| 3 | 密码找回 | **支持邮箱找回**（Supabase「忘记密码」邮件重置流程）。 |
| 4 | 访问控制 | **仅登录后可访问**业务仪表盘与造办处等受保护路由；未登录只能访问登录页、重置密码页等公开路由。 |
| 5 | 云/端权威 | **模式 B：云主、本地缓存**（见 §5.1）。 |
| 6 | 多端写入冲突 | **服务端以 `updated_at` 为准的最后写入胜出（LWW）**；不在本期做 409 + 人工合并 UI（可二期）。 |
| 7 | 首次登录且本机曾有本地数据 | **与 #5 一致**：启动后先拉云；**若云端已有快照 → 以云为准覆盖 hydrate**；**若云端无快照 → 将当前本地四域 + 收编 prefs 一次性写入云**作为初版。 |
| 8 | 登出 | **保留**本机 `localStorage` 缓存（不清空）；下次登录仍先拉云，以云为准刷新内存与缓存。 |
| 9 | 表结构 | **方案一**：每用户一行多 `jsonb`（四域 + prefs），见 §5.3。 |
| 10 | 写云触发 | **Zustand 全局 `subscribe`**（四域 Store 或统一聚合监听）；实现上建议 **防抖 1.5–3s** 批量 upsert，避免每键击打云。 |
| 11 | 零散 localStorage | **收编**：Oracle、红线等键并入 **`prefs_json`**（或与 `event` 同条存储的约定字段），不再独立散落。 |
| 12 | Realtime | **不要**。 |
| 13 | 移动端范围 | **仅 H5 适配**（响应式 + 触控 + 安全区）；不做本期 PWA。 |
| 14 | 邸报 | **收入顶栏**：`TreasuryHUD` 卷轴按钮打开 **Dialog**（`EventLogPanel`），小屏同规则。 |
| 15 | 主攻城池选择 | **Drawer**（替代或补充窄屏下 Radix Select）。 |
| 16 | 安全基线（实施默认） | **密码**：长度 ≥ **8**，建议含字母+数字（可在 Supabase Auth 策略或应用层校验）；**会话**：`@supabase/ssr` Cookie 刷新、HTTPS-only；**暴力破解**：依赖 Supabase 限流 + 可选 Edge 限流；登录失败提示泛化（不区分「无用户」与「密码错」若产品同意）。 |
| 17 | 数据与合规（实施默认） | 按**个人生产力/自用沙盘数据**处理；传输 **HTTPS**；库表 **RLS** 绑定 `auth.uid()`；**本期不对 jsonb 做端侧 E2EE**；若内容涉密由使用方自行控制账号与项目可见性。 |

---

## 3. 现状摘要（与方案相关）

- **布局**：`DashboardShell` 已在 `< lg` 使用底栏 Sheet 承载军机 + 养正司 + 内务府；主区 `pb-24` 防底栏遮挡；大屏三栏分栏。详见设计说明 §5。
- **持久化**：各 Store `skipHydration: true`，`components/empire-cloud-sync.tsx` 挂载后 `rehydrateAllStores()` → `resetDailyQuests()` → `ensureQuestBootstrap()`（通务司 + 勘合键修剪；不强制覆盖任务表）。
- **全量备份**：`lib/empire-backup.ts` + 造办处「帝国档案」JSON 与 Store 形状强相关；上云后仍可保留作人工冷备导出格式。

---

## 4. 需求一：移动端（H5）适配

### 4.1 设计原则

1. **移动优先补洞**：不推翻桌面体验；小屏信息密度、触控目标、滚动分区为主。
2. **与数据层可并行**：路由守卫与登录页布局可与 Supabase 同步开发。
3. **可验证**：真机 + Chrome DevTools 设备栏。

### 4.2 已定 UI/交互（与 §2 对齐）

| 区域 | 已定方向 |
|------|----------|
| **邸报 / 事件日志** | **`TreasuryHUD`** 顶栏 **卷轴** → **Dialog** 展示 `EventLogPanel`（最近 5 条、清空）。 |
| **主攻城池** | **`< lg`**：`QuestEngine` 用 **底栏 Sheet** 列表选城；**`lg+`**：仍为 **Radix Select**。 |
| **TreasuryHUD** | 小屏纵向块级顺序、简报条可折行；主要操作区 **≥44px** 触控高度。 |
| **WarMap / Sheet / settings** | 见下表 **实施检查表**（字号、安全区、`dvh`、造办处 Tabs 等）。 |

**实施检查表（工程逐项核对）**

| 区域 | 风险/现象 | 建议方向 |
|------|-----------|----------|
| **TreasuryHUD** | 顶栏三列在窄屏易过高、挤压可点区域 | 纵向块级；`EmpireBriefingStrip` 可折行或「摘要 + 展开」 |
| **WarMap 卡片** | 2 列下字过小 | 控制 `text-[10px]` 下限；Sheet 内表单全宽 |
| **Sheet / Dialog** | 键盘与安全区 | `env(safe-area-inset-*)`；评估 `100dvh` |
| **QuestEngine** | iOS 上 Select | 主攻城以 **Drawer** 为准（§2）；其余长列表可用 `ScrollArea` |
| **settings 造办处** | Tab/表单拥挤 | Tabs 横向滚动或垂直列表；Textarea 全宽 |
| **横屏 / 折叠屏** | 断点跳跃 | `md`–`lg` 抽样；必要时 `min()` 宽度约束 |

### 4.3 分阶段（本期）

| 阶段 | 内容 | 验证 |
|------|------|------|
| **M1** | HUD 小屏重排、顶栏邸报、安全区、Sheet 高度、触控目标 | iOS Safari + Android Chrome |
| **M2** | Drawer 选城、造办处小屏、长列表与滚动 | 慢网抽样 |

### 4.4 验收标准（建议）

- 竖屏 375×667 无意外横向溢出（Sheet 内可滚动除外）。
- 主要 CTA、军机勾选、城池卡片触控区域 ≥ 44×44px 等效。
- 底栏 Sheet 首屏可见军机分组标题或首组任务。

---

## 5. 需求二：Supabase（模式 B）

### 5.1 模式 B：云主、本地缓存

- **权威数据**在 Postgres（每用户一行 jsonb，§5.3）。
- **客户端**：登录成功后 **先拉云** hydrate 各 Store，并写回 `localStorage`；之后本地操作即时更新 Store，并由 **全局 subscribe + 防抖** 写回云端（§2 之 10）。
- **离线 / 弱网**：可读本地缓存；重连后继续防抖上传；**冲突**按服务端 LWW（§2 之 6）。

### 5.2 身份与权限

- **无自助注册**（§2 之 2）；**仅登录后**进入受保护应用（§2 之 4）。
- **RLS**：业务表 `user_id = auth.uid()`；仅认证用户可读写自己的行。
- **密钥**：浏览器仅 `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`；需服务端特权时使用 Route Handler，**禁止**将 service role 打包进客户端。

### 5.3 数据模型（方案一 + prefs）

表名示例：`user_empire`（可按项目重命名）

| 列 | 类型 | 说明 |
|----|------|------|
| `user_id` | uuid PK FK → auth.users | |
| `emperor_json` | jsonb | `hanling-emperor` 形状 |
| `map_json` | jsonb | `hanling-map` |
| `quest_json` | jsonb | `hanling-quest` |
| `event_json` | jsonb | `hanling-event` |
| `prefs_json` | jsonb | 原 Oracle / 红线等散落键的统一收编 |
| `client_schema_version` | int | 与 `empire-backup` 迁移版本对齐 |
| `updated_at` | timestamptz | 服务端 LWW |

**规范化拆表**：非本期范围。

### 5.4 同步与启动顺序（实现约定）

1. 会话有效 → 拉取 `user_empire` 整行。  
2. **云端有数据**：解析 json → 写入各 Store → `persist` 写本地。  
3. **云端无数据**：将当前内存/本地四域 + `prefs_json` **合并为首次 PUT**，再视为权威。  
4. `rehydrateAllStores()` 与 **`resetDailyQuests` / `ensureQuestBootstrap`**：建议在 **云 hydrate 完成之后**再执行，避免与云端任务集竞态（与旧文 §4.7 一致）。  
5. **登出**：不强制清空 `localStorage`（§2 之 8）；再次登录仍以云为准刷新。

### 5.5 工程结构建议

```
lib/supabase/
  client.ts
  server.ts
app/api/empire/
  sync/route.ts    # 或按域拆分；校验 session 后 upsert/select
```

依赖：`@supabase/supabase-js`，会话与 Next 14 路由建议 **`@supabase/ssr`**。

### 5.6 分阶段（实施）

| 阶段 | 内容 |
|------|------|
| **S0** | Supabase 项目、建表、`prefs_json`、RLS、仅管理员建号流程文档化 |
| **S1** | 登录页、受保护布局、拉云 hydrate + subscribe 防抖写云 |
| **S2** | 收编 Oracle/红线读写至 `prefs_json`、移除散落键 |
| **~~S3 Realtime~~** | **不做**（§2 之 12） |

### 5.7 风险与缓解

| 风险 | 缓解 |
|------|------|
| JSON 体积 | gzip、后续再考虑分域 PATCH |
| 与每日重置竞态 | 云拉取完成后再 `resetDailyQuests`；必要时云端记 `logic_date` |
| Schema 变更 | `client_schema_version` + 与 `empire-backup` 同源 migrate |

---

## 6. 两项需求的耦合与建议顺序

1. **S0 + 登录/路由壳**：无云则无意义；可与 **M1 顶栏邸报** 并行（顶栏需预留邸报入口位）。  
2. **S1 云 hydrate + subscribe** 与 **M1/M2 H5** 交叉测试（登录态、小屏 Sheet）。  
3. **S2 收编 prefs** 在四域上云稳定后进行。

---

## 7. 非目标（本期）

- Supabase **Realtime** 多端推送。
- **PWA**（manifest、standalone、安装图标）。
- 自助注册、OAuth 社交登录（除非未来另开需求）。
- 规范化多表、服务端渲染整盘仪表盘 HTML。
- 多人协作同一帝国。

---

## 8. 文档维护

| 项目 | 说明 |
|------|------|
| 路径 | `docs/移动端与Supabase适配方案.md` |
| 何时更新 | §2 决策变更、表结构变更、或验收标准调整时 |
| 关联 | `docs/瀚翎帝国-设计与机制说明.md`、`lib/empire-backup.ts`、**`docs/实施步骤-登录与Supabase.md`**（按步执行） |

---

*修订：已定案写入 §2；云模式锁定为 B；移动端锁定 H5 + 顶栏邸报 + Drawer 选城；安全/合规默认见 §2 之 16–17。*
