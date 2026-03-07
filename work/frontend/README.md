# YouNov 商业小说在线阅读平台（源码）

本项目提供一个**可扩展的商业小说在线阅读网站**，覆盖：

- 小说在线阅读（章节列表、阅读页、阅读记录）
- 付费订阅（支持 `mock` 演示模式；Stripe 密钥可后续补齐）
- 章节管理 / 小说管理（管理员 API）
- 用户管理（管理员 API：角色、封禁、积分调整）
- 用户主页（订阅状态、推广数据、阅读记录、积分流水）
- 推广（邀请码：点击/注册/订阅统计）
- SEO（构建时生成 `public/sitemap.xml`，`robots.txt` 指向 `/sitemap.xml`）
- 部署架构：应用服务器 / 数据库服务器 / 缓存服务器 / 负载均衡服务器 **独立布局**（见 `infra/`）

## 目录说明

- `src/`：Web 前端（Vite + React）
- `api/`：后端 API（Express + Prisma + Postgres + Redis）
- `infra/`：负载均衡/多服务编排（Nginx + Web + API + Postgres + Redis）
- `tools/`：辅助脚本（如 sitemap 生成）

## 一键启动（推荐：独立服务布局）

```bash
cd infra
docker compose up -d --build
```

访问：

- Web：`http://localhost/`
- API：`http://localhost/api/health`

> 首次启动后需要执行 Prisma 迁移与种子数据（推荐用下方一键脚本）。

### 一键初始化（up + migrate + seed，推荐）

- **macOS / Linux**：

```bash
cd infra
chmod +x ./bootstrap.sh
./bootstrap.sh
```

- **Windows（PowerShell）**：

```powershell
cd infra
powershell -ExecutionPolicy Bypass -File .\bootstrap.ps1
```

## 数据库迁移与种子数据

在 `api/` 下执行（需要本机 Node 环境，作为备选方案）：

```bash
cd api
npm install
npx prisma migrate dev
node prisma/seed.js
```

默认种子账号（可在 `api/.env.example` 中修改）：

- 管理员：`admin@example.com` / `admin123456`
- 普通用户：`user@example.com` / `user123456`

## 付费订阅（Stripe 密钥占位）

后端通过环境变量支持两种计费模式：

- `BILLING_MODE=mock`：演示模式，直接开通订阅并记录结算会话（无真实扣款）
- `BILLING_MODE=stripe`：真实支付（需要你后续补齐）

需要补齐的变量在 `api/.env.example`：

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_BASIC / STRIPE_PRICE_PREMIUM / STRIPE_PRICE_SVIP`

Webhook 入口（Stripe 后台配置）：

- `POST /api/billing/stripe/webhook`

## SEO

构建时会执行 `tools/generate-sitemap.js`：

- 读取 `SITE_ORIGIN` / `VITE_SITE_ORIGIN`
- 通过 `SITEMAP_API_BASE`（默认 `http://localhost/api`）拉取小说/章节
- 生成 `public/sitemap.xml`

## 后续扩展建议

- 评论/弹幕：已在前端预留入口，建议新增 `api` 的评论表与接口
- 分类/排行榜：可在 `Novel` 增加 `category`/`status` 字段并补索引
- 支付：接入 Stripe Subscription + Webhook 完整状态机（已留好骨架）

