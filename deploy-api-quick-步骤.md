# 快速部署 API（仅 index.js）— 具体步骤

## 一、执行快速部署（日常改完 index.js 后）

1. **打开 PowerShell**  
   在项目目录下打开（或先 `cd` 到项目根目录）：
   ```powershell
   cd "c:\Users\Administrator\Desktop\网站源码\YouNov"
   ```

2. **执行脚本**  
   ```powershell
   .\deploy-api-quick.ps1
   ```

3. **按提示输入密码**  
   - 脚本会经跳板机 107.174.174.123 连到两台 API（10.50.0.2、10.50.0.3）。  
   - 若未配置 SSH 密钥，会多次提示 `root@107.174.174.123's password:`，输入跳板机 root 密码即可。  
   - 两台 API 会**并行**上传并重启，总时间约等于传一台（约 30–40 秒）。

4. **看结果**  
   - 出现 `10.50.0.2 OK`、`10.50.0.3 OK` 和 `Done. API updated and restarted.` 即表示部署完成。

---

## 二、可选：配置 SSH 密钥（免密、少输密码）

若希望以后执行脚本时不用反复输密码，可在本机配好密钥并放到跳板机（和 API 机如需要）上。

1. **本机生成密钥（若还没有）**  
   ```powershell
   # 若已有 C:\Users\Administrator\.ssh\id_ed25519 可跳过
   ssh-keygen -t ed25519 -f "$env:USERPROFILE\.ssh\id_ed25519" -N '""'
   ```

2. **把公钥拷到跳板机**  
   ```powershell
   type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh root@107.174.174.123 "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
   ```
   按提示输入一次跳板机 root 密码。

3. **（可选）在跳板机上把同一公钥放到两台 API**  
   先 SSH 到跳板机：
   ```powershell
   ssh root@107.174.174.123
   ```
   在跳板机上执行（把下面 `你的公钥内容` 换成 id_ed25519.pub 里那一行）：
   ```bash
   echo "你的公钥内容" >> ~/.ssh/authorized_keys
   for ip in 10.50.0.2 10.50.0.3; do ssh -o StrictHostKeyChecking=no root@$ip "mkdir -p ~/.ssh && echo '你的公钥内容' >> ~/.ssh/authorized_keys"; done
   ```
   若 API 机当前需要密码，会各提示输入一次。

4. **验证**  
   本机执行：
   ```powershell
   ssh -i "$env:USERPROFILE\.ssh\id_ed25519" root@107.174.174.123 "echo ok"
   ```
   若直接输出 `ok` 且不要求密码，说明跳板机免密已生效；再跑 `.\deploy-api-quick.ps1` 就不会再问跳板机密码。

---

## 三、验证部署是否生效

1. **看服务状态（需能 SSH 到 API 机）**  
   经跳板机连到任一台 API：
   ```powershell
   ssh -J root@107.174.174.123 root@10.50.0.2 "systemctl status younov-api"
   ```
   应显示 `active (running)`。

2. **看接口是否有数据**  
   在浏览器或本机用 curl（把域名换成你实际前端访问的域名）：
   ```powershell
   curl "https://younov.com/api/leaderboard"
   curl "https://younov.com/api/novels?limit=3"
   ```
   若返回 JSON 且含小说数据，说明 API 已更新并对外正常。

---

## 小结

| 步骤 | 做什么 |
|------|--------|
| 日常部署 | `cd` 到项目目录 → `.\deploy-api-quick.ps1` → 按需输入密码 → 看到两台 OK 和 Done |
| 免密（可选） | 本机生成 ed25519 密钥 → 公钥追加到跳板机 `authorized_keys` → 可选再同步到两台 API |
| 验证 | `systemctl status younov-api` 看服务；访问 `/api/leaderboard`、`/api/novels` 看是否有数据 |
