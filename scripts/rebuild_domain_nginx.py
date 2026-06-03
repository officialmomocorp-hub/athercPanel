import json
import subprocess
import os

domain = "aetherpanel.duckdns.org"

with open("/opt/aether-panel/sites.json", "r") as f:
    sites = json.load(f)

site = next((s for s in sites if s["domain"] == domain), None)
if not site:
    print("Site not found")
    exit(1)

print(site)

local_web_root = f"/var/www/vhosts/{domain}/public"
php_version = site["phpVersion"]

if site.get("sslActive"):
    nginx_config = f"""server {{
    listen 80;
    server_name {domain};
    return 301 https://$host$request_uri;
}}

server {{
    listen 443 ssl;
    server_name {domain};
    root {local_web_root};
    index index.php index.html;

    ssl_certificate /etc/letsencrypt/live/{domain}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/{domain}/privkey.pem;

    access_log /var/log/nginx/{domain}.access.log;
    error_log /var/log/nginx/{domain}.error.log;

    include snippets/phpmyadmin.conf;

    location / {{
        try_files $uri $uri/ /index.php?$args;
    }}

    location ~ \.php$ {{
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/run/php/php{php_version}-fpm-{domain}.sock;
    }}
}}"""
else:
    nginx_config = f"""server {{
    listen 80;
    server_name {domain};
    root {local_web_root};
    index index.php index.html;

    access_log /var/log/nginx/{domain}.access.log;
    error_log /var/log/nginx/{domain}.error.log;

    include snippets/phpmyadmin.conf;

    location / {{
        try_files $uri $uri/ /index.php?$args;
    }}

    location ~ \.php$ {{
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/run/php/php{php_version}-fpm-{domain}.sock;
    }}
}}"""

nginx_path = f"/etc/nginx/sites-available/{domain}"
with open(nginx_path, "w") as f:
    f.write(nginx_config)

print(f"Wrote Nginx config to {nginx_path}")
subprocess.run(["systemctl", "reload", "nginx"])
print("Nginx reloaded.")
