# YouNov 基础设施（独立服务器布局）

本目录用于满足“应用服务器 / 数据库服务器 / 缓存服务器 / 负载均衡服务器”独立布局的部署结构，便于后续水平扩展与升级。

## 目录结构

- `infra/docker-compose.yml`：本地/单机演示用编排（逻辑上仍是独立服务）
- `infra/lb/`：负载均衡（Nginx）配置
- `infra/api/`：后端 API 的 Dockerfile
- `infra/web/`：前端 Web 的 Dockerfile（构建后用 Nginx 提供静态资源）

## 本地启动（演示）

在仓库根目录执行：

```bash
cd infra
docker compose up -d --build
```

访问：

- Web：`http://localhost/`
- API 健康检查：`http://localhost/api/health`

> 注意：首次启动需要数据库迁移与种子数据。推荐直接运行一键脚本完成 “up + migrate + seed”。

### 一键初始化（推荐）

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

> 第三方付费密钥（Stripe 等）目前在 `docker-compose.yml` 中留空，等你后续补充。

### 构建阶段拉取镜像失败（Docker Hub 网络问题）

如果你在 `docker compose up -d --build` 时遇到类似 `failed to fetch anonymous token` / `auth.docker.io` 超时的问题，可以通过环境变量把基础镜像切到国内镜像仓库。

- **Windows（PowerShell）示例**（以阿里云公共镜像为例）：

```powershell
$env:NODE_IMAGE="registry.cn-hangzhou.aliyuncs.com/library/node:20-alpine"
$env:NGINX_IMAGE="registry.cn-hangzhou.aliyuncs.com/library/nginx:1.27-alpine"
$env:POSTGRES_IMAGE="registry.cn-hangzhou.aliyuncs.com/library/postgres:16-alpine"
$env:REDIS_IMAGE="registry.cn-hangzhou.aliyuncs.com/library/redis:7-alpine"
docker compose up -d --build
```

