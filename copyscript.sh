#!/bin/sh
set -e

if [ ! -f /app/package.json ]; then
  cp -r /image-app/* /app/
fi

exec "$@"