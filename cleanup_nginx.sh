#!/bin/bash
# cleanup_nginx.sh

echo "Disabling duplicate Nginx config..."
rm -f /etc/nginx/sites-enabled/younov.conf
rm -f /etc/nginx/sites-enabled/default

# Ensure the correct one is enabled
ln -sf /etc/nginx/sites-available/younov /etc/nginx/sites-enabled/younov

echo "Testing Nginx config..."
nginx -t

if [ $? -eq 0 ]; then
    echo "Reloading Nginx..."
    systemctl reload nginx
    echo "Success! Duplicate configs removed."
else
    echo "Error: Nginx config test failed!"
    exit 1
fi
