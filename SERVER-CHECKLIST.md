# 线上环境检查清单：前台资源加载 + 管理员登录

## 一、前台首页 Featured/Trending 为空

**原因**：首页数据来自接口 `/api/leaderboard` 或 `/api/novels`。若接口不可用或数据库无已发布小说，就会显示为空。

### 1. 确认 API 是否可达

在**本机**执行（或在服务器上 `curl`）：

```bash
# 应返回 JSON（mostRead、topRated 或 items），而不是 HTML 或连接错误
curl -s -o /dev/null -w "%{http_code}" https://younov.com/api/leaderboard
# 期望：200

curl -s https://younov.com/api/leaderboard
# 期望：{"mostRead":[...],"topRated":[...]}
```

- 若返回 **200** 且是 JSON：说明接口正常，多半是**数据库里没有已发布小说**，见下文「2. 写入初始数据」。
- 若返回 **502/504/连接失败**：说明 Nginx 到后端 API 未通，需在 **107.174.174.123** 上确认：
  - `location /api/` 已启用并 `proxy_pass` 到正确的 upstream（如 10.50.0.2:8080、10.50.0.3:8080）；
  - 两台 API 机（10.50.0.2、10.50.0.3）上 `younov-api` 服务在跑：`systemctl status younov-api`。

### 2. 写入初始数据（含小说）

在**任意一台 API 服务器**（如 10.50.0.2）上，进入项目目录并执行 seed（会创建管理员账号和测试小说）：

```bash
ssh -J root@107.174.174.123 root@10.50.0.2
cd /opt/younov/api
npx prisma db push   # 若无库表则先建表
node prisma/seed.js  # 或 npm run seed（若 package.json 有该脚本）
```

seed 会：

- 创建/更新管理员：**admin@example.com**，密码：**admin123**
- 创建测试小说与章节（便于首页有数据）

---

## 二、管理员登录报 Invalid_credentials

**原因**：`Invalid_credentials` 表示接口可达，但邮箱或密码错误，或该用户不存在。

### 1. 默认管理员（来自 seed）

- 邮箱：**admin@example.com**
- 密码：**admin123**

只有执行过 **prisma/seed.js** 的数据库里才会有该用户。若从未在线上跑过 seed，需先执行上文「一、2. 写入初始数据」。

### 2. 若忘记密码或需重置管理员密码

在 API 服务器上（经跳板登录 10.50.0.2 或 10.50.0.3），进入 API 目录后执行：

```bash
cd /opt/younov/api
npm run reset-admin
```

会将 **admin@example.com** 的密码重置为 **admin123**，并确保角色为 ADMIN。之后用该账号登录。

### 3. 管理员入口

- 前台登录后，若用户角色为 ADMIN，导航中会出现后台入口（如 `/admin`）。
- 或直接访问：**https://younov.com/admin**（需已登录且为管理员）。

---

## 三、快速自检顺序

1. **API 是否 200**：`curl -s -o /dev/null -w "%{http_code}" https://younov.com/api/leaderboard`
2. **API 节点服务是否运行**：在 10.50.0.2 / 10.50.0.3 上执行 `systemctl status younov-api`
3. **是否跑过 seed**：在 API 服务器上执行 `node prisma/seed.js`（或 `npm run seed`）
4. **用 admin@example.com / admin123 登录**，再访问 `/admin`

按上述步骤处理后，前台资源应能加载，管理员也可正常登录。
