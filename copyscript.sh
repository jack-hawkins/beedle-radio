set -e
mkdir -p /app
cp -a ./. /app/
nohup node /app/server.js >/app/node.log 2>&1 &