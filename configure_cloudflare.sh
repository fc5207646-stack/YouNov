#!/bin/bash
# configure_cloudflare.sh
# This script configures Nginx to work with Cloudflare
# It should be run on the Load Balancer / Nginx server

set -e

echo "Configuring Nginx for Cloudflare..."

# 1. Create a config file for Cloudflare Real IP
CONF_FILE="/etc/nginx/conf.d/cloudflare.conf"

echo "# Cloudflare Real IP Configuration" > $CONF_FILE

# 2. Fetch latest Cloudflare IP ranges (IPv4)
echo "Fetching Cloudflare IPv4 ranges..."
for ip in $(curl -s https://www.cloudflare.com/ips-v4); do
    echo "set_real_ip_from $ip;" >> $CONF_FILE
done

# 3. Fetch latest Cloudflare IP ranges (IPv6)
echo "Fetching Cloudflare IPv6 ranges..."
for ip in $(curl -s https://www.cloudflare.com/ips-v6); do
    echo "set_real_ip_from $ip;" >> $CONF_FILE
done

# 4. Add the real_ip_header directive
echo "" >> $CONF_FILE
echo "real_ip_header CF-Connecting-IP;" >> $CONF_FILE
echo "# trust proxy 127.0.0.1 (if local proxy exists)" >> $CONF_FILE
echo "# set_real_ip_from 127.0.0.1;" >> $CONF_FILE

echo "Configuration written to $CONF_FILE"

# 5. Test and Reload Nginx
echo "Testing Nginx configuration..."
nginx -t

if [ $? -eq 0 ]; then
    echo "Reloading Nginx..."
    systemctl reload nginx
    echo "Success! Nginx is now configured to see real IPs from Cloudflare."
else
    echo "Error: Nginx configuration test failed. Please check $CONF_FILE"
    exit 1
fi
