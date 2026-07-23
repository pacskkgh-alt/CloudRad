#!/bin/bash
docker exec nginx-proxy sh -c 'echo "client_max_body_size 500M;" > /etc/nginx/vhost.d/default'
docker exec nginx-proxy sh -c 'echo "client_max_body_size 500M;" > /etc/nginx/vhost.d/api.165-227-89-199.nip.io'
docker exec nginx-proxy sh -c 'echo "client_max_body_size 500M;" > /etc/nginx/conf.d/upload_size.conf'
docker exec nginx-proxy nginx -s reload
echo "Nginx reloaded successfully"
