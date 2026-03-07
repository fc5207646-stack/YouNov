# Redis（Ubuntu 24.04）运行手册（给 API 远程使用）

目标：

- Redis：`10.50.0.6`
- API-1/2：`10.50.0.2` / `10.50.0.3`

> 强烈建议：防火墙仅允许 API IP 访问 6379；并启用 `requirepass`。

## 安装与启动

```bash
apt update
apt install -y redis-server
systemctl enable --now redis-server
```

## 配置（/etc/redis/redis.conf）

编辑并确认（按需调整）：

```conf
# 允许远程（配合防火墙限制来源）
bind 0.0.0.0 ::1
protected-mode yes

# 必须设置口令
requirepass CHANGE_ME_REDIS_PASSWORD

# 持久化（项目 docker-compose 本地演示使用了 AOF）
appendonly yes
appendfsync everysec
```

重启：

```bash
systemctl restart redis-server
```

## 防火墙（UFW 示例）

```bash
ufw allow 22/tcp
ufw allow from 10.50.0.2 to any port 6379 proto tcp
ufw allow from 10.50.0.3 to any port 6379 proto tcp
ufw deny 6379/tcp
ufw --force enable
ufw status
```

## API 侧连接串

在 API 的环境变量中：

```text
REDIS_URL=redis://:CHANGE_ME_REDIS_PASSWORD@10.50.0.6:6379
```

