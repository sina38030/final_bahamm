#!/usr/bin/env python3
with open('/etc/nginx/sites-enabled/bahamm.ir', 'r') as f:
    content = f.read()

nextjs_block = '''    # Next.js API routes - must come BEFORE backend /api/ location
    location ~ ^/api/(groups|payment|orders|geocode|group-invite|group-orders|user|products|banners|test-params|test-simple|upload|ip-geolocate|frontapi)/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

'''

# Insert before the line with API proxy comment
marker = '    # API proxy'
if marker in content:
    content = content.replace(marker, nextjs_block + marker)
    with open('/etc/nginx/sites-enabled/bahamm.ir', 'w') as f:
        f.write(content)
    print('✓ Nginx config updated successfully')
else:
    print('✗ Could not find marker in config')

