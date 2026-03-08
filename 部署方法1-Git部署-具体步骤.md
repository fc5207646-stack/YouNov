# 方法 1：Git 部署 — 具体步骤

通过 Git 把代码推到仓库，在服务器上拉取并重启，不从本机 SCP 传文件。

---

## 一、本机：准备 Git 并推代码

### 1.1 若项目还不是 Git 仓库

在项目根目录（`YouNov`）打开 PowerShell：

```powershell
cd "c:\Users\Administrator\Desktop\网站源码\YouNov"
git init
```

### 1.2 添加远程仓库

把下面的地址换成你自己的 Git 仓库（GitHub / Gitea / 其他）：

```powershell
git remote add origin https://github.com/你的用户名/你的仓库名.git
```

若用 SSH 地址也可以，例如：

```powershell
git remote add origin git@github.com:你的用户名/你的仓库名.git
```

### 1.3 提交并推送

```powershell
git add work/api/src/index.js
git commit -m "api: update index.js"
git push -u origin main
```

若你的默认分支是 `master`，把上面最后一行的 `main` 改成 `master`。若推送时要账号密码或 token，按提示输入即可。

---

## 二、服务器：拉代码并更新两台 API

需要能 SSH 到跳板机 `107.174.174.123`，再从跳板机连到两台 API（10.50.0.2、10.50.0.3）。

### 2.1 登录跳板机

在本机 PowerShell 执行（按提示输入密码）：

```powershell
ssh root@107.174.174.123
```

### 2.2 在跳板机上拉取代码

在跳板机终端执行（把仓库地址换成你在 1.2 里用的）：

```bash
cd /tmp
rm -rf younov-deploy
git clone --depth 1 https://github.com/你的用户名/你的仓库名.git younov-deploy
```

若仓库是私有的，会提示输入用户名和密码（或 token）。

### 2.3 把 index.js 拷到两台 API 并重启

仍在跳板机上执行（一次处理两台）：

```bash
for ip in 10.50.0.2 10.50.0.3; do
  scp -o StrictHostKeyChecking=no /tmp/younov-deploy/work/api/src/index.js root@${ip}:/opt/younov/api/src/index.js
  ssh -o StrictHostKeyChecking=no root@${ip} "systemctl restart younov-api"
  echo "$ip OK"
done
```

若从跳板机连 API 需要密码，会提示输入两次（每台一次）。

### 2.4 确认

```bash
ssh root@10.50.0.2 "systemctl is-active younov-api"
ssh root@10.50.0.3 "systemctl is-active younov-api"
```

两行都输出 `active` 即表示已重启成功。

---

## 三、以后每次只改 index.js 时

**本机：**

```powershell
cd "c:\Users\Administrator\Desktop\网站源码\YouNov"
git add work/api/src/index.js
git commit -m "api: update"
git push
```

**跳板机上：**

```bash
cd /tmp/younov-deploy
git pull
for ip in 10.50.0.2 10.50.0.3; do
  scp -o StrictHostKeyChecking=no work/api/src/index.js root@${ip}:/opt/younov/api/src/index.js
  ssh -o StrictHostKeyChecking=no root@${ip} "systemctl restart younov-api"
  echo "$ip OK"
done
```

---

## 四、若 API 机上已有克隆的仓库（可选）

若 10.50.0.2 和 10.50.0.3 上已经在 `/opt/younov/api` 或某目录用 Git 管理过代码，可以直接在每台 API 上拉取并重启，无需从跳板机 scp。

在**每台 API 机**上执行（或从跳板机 ssh 过去执行）：

```bash
cd /opt/younov/api   # 改成你实际放仓库的目录
git pull
systemctl restart younov-api
```

这样不需要在跳板机用 scp 传文件，每台自己拉、自己重启即可。

---

## 小结

| 阶段 | 做什么 |
|------|--------|
| 本机首次 | `git init` → `remote add origin 仓库地址` → `add index.js` → `commit` → `push` |
| 跳板机首次 | `ssh root@107.174.174.123` → `git clone 仓库 /tmp/younov-deploy` → 用 for 循环 scp + ssh 到 10.50.0.2、10.50.0.3 |
| 之后每次 | 本机改完 `git add/commit/push`；跳板机 `cd /tmp/younov-deploy && git pull` 再执行同样的 for 循环 |

路径以你实际为准：API 安装目录若不是 `/opt/younov/api`，把命令里的该路径改成你的。
