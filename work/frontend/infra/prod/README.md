# 生产部署（分布式 6 机：LB+Web / API x2 / Redis / Postgres 主从）

> 安全提醒：请勿在聊天/工单中粘贴 root 密码、私钥、数据库口令等敏感信息。建议创建最小权限用户与专用防火墙规则。

本目录用于你提供的“落地版部署拓扑（WireGuard 内网 10.50.0.0/24）”：

- **负载均衡 + Web 静态**（公网 + wg0）：`107.174.174.123 / 10.50.0.1`
- **API 应用-1**（wg0）：`10.50.0.2`
- **API 应用-2**（wg0）：`10.50.0.3`
- **Postgres 主库**（wg0）：`10.50.0.4`
- **Postgres 从库**（wg0）：`10.50.0.5`
- **Redis 缓存**（wg0）：`10.50.0.6`

## 当前最终部署拓扑（落地版）

- **VPS-1（LB+Web）**：Nginx + HTTPS + 静态 `dist` + `/api` 负载均衡反代；UFW 放行 `22/80/443/51820`，并开启 `wg0` 转发
- **API-1/2**：`younov-api`（systemd）+ `pgBouncer`（SCRAM）；UFW 仅允许 VPS-1 访问 `8080`
- **PG Primary/Replica**：`streaming replication`；主库仅允许 API-1/2 + 备库访问 `5432`，备库不对外开放 `5432`
- **Redis**：监听 `10.50.0.6:6379`；仅允许 API-1/2 访问 `6379`
- **CORS**：允许 `https://younov.com` / `https://www.younov.com`

## 总体端口与访问控制（强烈建议）

- **LB+Web**：
  - 入站：`22` / `80` / `443` / `51820`
  - 出站：到 API `8080`（wg0）
  - 其他：开启 `wg0` 转发（UFW）
- **API**：
  - 入站：仅允许来自 LB 的 `8080`（wg0）
  - 出站：到 Postgres 主库 `5432`、到 Redis `6379`（wg0）
- **Postgres 主库**：
  - 入站：仅允许来自 API 的 `5432`、来自从库的复制连接（同为 `5432`，wg0）
- **Postgres 从库**：
  - 入站：仅允许来自主库的复制连接（同为 `5432`，wg0）
- **Redis**：
  - 入站：仅允许来自 API 的 `6379`（wg0，并启用 `requirepass`）

## 部署顺序（推荐）

1. 在 **Postgres 主/从** 上完成安装与复制配置（见下文“Postgres 主从”）。
2. 在 **Redis** 上安装并加固（见下文“Redis”）。
3. 在 **API-1 / API-2** 上启动 API（当前落地版为 systemd + pgBouncer；如需 Docker 可参考 `infra/prod/api/docker-compose.yml`）。
4. 在 **LB+Web** 上部署 Nginx + 静态 `dist`（当前落地版为 Nginx + HTTPS + `/api` 负载均衡；如需 Docker 可参考 `infra/prod/lb-web/docker-compose.yml`）。

如果你希望“少手工敲命令”，可以直接使用本目录提供的脚本（按机器执行）：

- `infra/prod/scripts/postgres_primary_setup.sh`（主库：`10.50.0.4`）
- `infra/prod/scripts/postgres_replica_setup.sh`（从库：`10.50.0.5`）
- `infra/prod/scripts/redis_setup.sh`（Redis：`10.50.0.6`）
- `infra/prod/scripts/api_setup.sh`（API-1/2：`10.50.0.2` / `10.50.0.3`）
- `infra/prod/scripts/lbweb_setup.sh`（LB+Web：`107.174.174.123 / 10.50.0.1`）

## API-1/2（10.50.0.2 / 10.50.0.3）

当前落地版：`younov-api` 以 **systemd 服务** 运行，并通过 `pgBouncer`（SCRAM）连接主库。UFW 仅允许来自 LB 的 `8080`（wg0）。

健康检查：`http://10.50.0.2:8080/api/health`（API-2 同理）。

> 如需 Docker 方式部署，可参考 `infra/prod/api/docker-compose.yml` 与 `infra/prod/api/api.env.example`。

## LB + Web（107.174.174.123 / 10.50.0.1）

当前落地版：Nginx 提供 **HTTPS** 与 **静态 `dist`**，并对 `/api` 做负载均衡反代。UFW 放行 `22/80/443/51820`，开启 `wg0` 转发。

默认对外入口：

- Web：`https://younov.com/`
- API 通过 Nginx 反代：`https://younov.com/api/health`

> 如需 Docker 方式部署，可参考 `infra/prod/lb-web/docker-compose.yml`。

## Postgres 主从（Ubuntu 24.04，Postgres 16）【运行手册概要】

> 应用当前只需要连接主库（`DATABASE_URL` 指向主库）。从库用于高可用/备份/读扩展，应用层读写分离后再接入。

详细步骤见：`infra/prod/runbooks/postgres16-primary-replica.md`

主库（`10.50.0.4`）：

- 安装：`apt install -y postgresql`
- 关键配置（一般在 `/etc/postgresql/16/main/`）：
  - `postgresql.conf`：开启 `wal_level=replica`、`max_wal_senders`、`hot_standby` 等
  - `pg_hba.conf`：允许 API IP 连接、允许从库 IP 做 replication
- 创建应用用户/库：`CREATE USER younov ...; CREATE DATABASE younov OWNER younov;`
- 创建复制用户：`CREATE ROLE replicator WITH REPLICATION LOGIN ...;`

从库（`10.50.0.5`）：

- 安装：`apt install -y postgresql`
- 停服务后清空数据目录，使用 `pg_basebackup` 从主库拉取基线并配置为 standby
- 启动后用 `SELECT pg_is_in_recovery();` 验证

## Redis（Ubuntu 24.04）【运行手册概要】

Redis（`10.50.0.6`）：

- 安装：`apt install -y redis-server`
- 配置：
  - 绑定地址按需（若仅给 API 用，建议配合防火墙只允许 API IP）
  - 设置 `requirepass`
  - 开启 AOF：`appendonly yes`

然后在 API 的 `REDIS_URL` 使用：`redis://:<password>@10.50.0.6:6379`

详细步骤见：`infra/prod/runbooks/redis-ubuntu.md`

## 下一步你需要补充的信息（用于最终上线）

- **域名/证书**（HTTPS 续期与自动化）
- **是否启用 Stripe**（否则保持 `BILLING_MODE=mock` 即可）
- **监控与备份策略**（API/PG/Redis、证书、日志轮转）

