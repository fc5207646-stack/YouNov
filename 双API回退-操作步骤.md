# 双 API 回退 — 你需要做的具体步骤

## 前提

- 两台 API 服务器（例如 **10.50.0.2** 和 **10.50.0.3**），能互相访问对方 `http://IP:8080`。
- 你知道哪台是 A、哪台是 B（用于下面配置对端地址）。

---

## 步骤一：把最新 API 代码部署到两台服务器

**推荐：只改了 API 时用「快速脚本」（不构建前端、不跑 npm install，约 10–30 秒）**

```powershell
cd "c:\Users\Administrator\Desktop\网站源码\YouNov"
.\deploy-api-quick.ps1
```

只会上传 `work\api\src\index.js` 到两台 API 机并执行 `systemctl restart younov-api`，速度最快。

---

**需要同时更新前端 + API 时再用完整脚本（含前端构建，较慢）**

```powershell
cd "c:\Users\Administrator\Desktop\网站源码\YouNov"
.\deploy-categories-update.ps1
```

（若脚本会提示输入 root 密码，按提示输入；部署完成后两台 API 都会是新代码。）

---

## 步骤二：在每台 API 服务器上配置对端地址

SSH 到**第一台** API 服务器（例如 10.50.0.2）：

```bash
ssh -J root@107.174.174.123 root@10.50.0.2
```

1. 进入 API 目录（若你的路径不是 `/opt/younov/api`，改成实际路径）：
   ```bash
   cd /opt/younov/api
   ```
2. 编辑环境变量文件：
   ```bash
   nano .env
   ```
3. 在文件末尾增加一行（把 `10.50.0.3` 和 `8080` 换成**对端**实际 IP 和端口）：
   ```env
   PEER_API_URL=http://10.50.0.3:8080
   ```
4. 保存退出（nano：Ctrl+O 回车，Ctrl+X）。

再 SSH 到**第二台** API 服务器（例如 10.50.0.3）：

```bash
ssh -J root@107.174.174.123 root@10.50.0.3
```

1. `cd /opt/younov/api`（或你的实际路径）
2. `nano .env`
3. 增加一行（填**对端**地址，即第一台的 IP 和端口）：
   ```env
   PEER_API_URL=http://10.50.0.2:8080
   ```
4. 保存退出。

**小结**：  
- 在 10.50.0.2 上填：`PEER_API_URL=http://10.50.0.3:8080`  
- 在 10.50.0.3 上填：`PEER_API_URL=http://10.50.0.2:8080`

---

## 步骤三：重启两台 API 服务

在**每台** API 服务器上执行（若服务名不是 `younov-api`，改成实际名称）：

```bash
sudo systemctl restart younov-api
```

检查状态：

```bash
sudo systemctl status younov-api
```

看到 `active (running)` 即可。

---

## 步骤四：验证是否生效

在本机浏览器或命令行：

1. 打开首页：https://younov.com  
   - 若之前是“无数据”，现在应能看到 Featured / Trending 有内容（来自有数据的那台）。
2. 或在本机执行：
   ```bash
   curl -s "https://younov.com/api/leaderboard" | head -c 500
   ```
   - 应能看到 `mostRead` 或 `topRated` 里有数据（若任一台库里有小说）。

---

## 检查清单（可打勾）

- [ ] 步骤一：已把最新 API 代码部署到两台 API 服务器
- [ ] 步骤二：在 10.50.0.2 的 `.env` 中已设置 `PEER_API_URL=http://10.50.0.3:8080`
- [ ] 步骤二：在 10.50.0.3 的 `.env` 中已设置 `PEER_API_URL=http://10.50.0.2:8080`
- [ ] 步骤三：两台都已执行 `systemctl restart younov-api` 且状态为 active
- [ ] 步骤四：访问 younov.com 或 curl /api/leaderboard 能看到数据

若某一步的路径、IP、端口或服务名和你实际不同，把对应项改成你的环境即可。
