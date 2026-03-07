# Postgres 16 主从（Ubuntu 24.04）运行手册

目标：

- 主库：`10.50.0.4`
- 从库：`10.50.0.5`
- 应用（API-1/2）：`10.50.0.2` / `10.50.0.3`（只连主库）

> 强烈建议：在云控制台/防火墙层面限制 5432 仅允许 API 与从库访问主库。

## 1) 主库（Primary）

### 安装

```bash
apt update
apt install -y postgresql
systemctl enable --now postgresql
```

### 创建应用库/用户

```bash
sudo -u postgres psql <<'SQL'
CREATE USER younov WITH PASSWORD 'CHANGE_ME_APP_DB_PASSWORD';
CREATE DATABASE younov OWNER younov;
GRANT ALL PRIVILEGES ON DATABASE younov TO younov;
SQL
```

### 创建复制用户

```bash
sudo -u postgres psql <<'SQL'
CREATE ROLE replicator WITH REPLICATION LOGIN PASSWORD 'CHANGE_ME_REPL_PASSWORD';
SQL
```

### 配置主库参数

编辑：`/etc/postgresql/16/main/postgresql.conf`

```conf
listen_addresses = '*'
wal_level = replica
max_wal_senders = 10
max_replication_slots = 10
hot_standby = on
```

### 配置访问控制（pg_hba.conf）

编辑：`/etc/postgresql/16/main/pg_hba.conf` 追加（放到规则靠前位置更直观）：

```conf
# API 连接主库
host    younov       younov       10.50.0.2/32        scram-sha-256
host    younov       younov       10.50.0.3/32        scram-sha-256

# 从库复制
host    replication  replicator   10.50.0.5/32        scram-sha-256
```

重启：

```bash
systemctl restart postgresql
```

## 2) 从库（Replica / Standby）

### 安装

```bash
apt update
apt install -y postgresql
systemctl stop postgresql
```

### 清空数据目录并拉取基线

> 注意：这会删除从库现有数据目录内容。

```bash
rm -rf /var/lib/postgresql/16/main/*

sudo -u postgres pg_basebackup \
  -h 10.50.0.4 \
  -D /var/lib/postgresql/16/main \
  -U replicator \
  -P -R -X stream
```

如果提示输入密码，输入主库上 `replicator` 的密码。

### 启动从库并验证

```bash
systemctl start postgresql

sudo -u postgres psql -c "select pg_is_in_recovery();"
```

输出 `t` 表示从库处于 standby（正确）。

## 3) 应用连接串（API 服务器）

在 API 的环境变量中使用主库：

```text
DATABASE_URL=postgresql://younov:CHANGE_ME_APP_DB_PASSWORD@10.50.0.4:5432/younov?schema=public
```

## 4) 常用检查命令

主库查看复制状态：

```bash
sudo -u postgres psql -c "select client_addr, state, sync_state, sent_lsn, write_lsn, flush_lsn, replay_lsn from pg_stat_replication;"
```

