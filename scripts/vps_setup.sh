#!/usr/bin/env bash
set -euo pipefail

echo "=== Extracting backend.tar.gz ==="
mkdir -p /tmp/backend
tar -xzf /tmp/backend.tar.gz -C /tmp/backend --strip-components=1

echo "=== Installing Golang for compilation ==="
apt-get update -y
apt-get install -y golang-go

echo "=== Compiling Go Backend Daemon ==="
mkdir -p /opt/aether-panel
cd /tmp/backend
go mod tidy
cd cmd/server
go build -o /opt/aether-panel/aether-daemon main.go
chmod +x /opt/aether-panel/aether-daemon

echo "=== Running Aether Installer ==="
chmod +x /tmp/install.sh
/tmp/install.sh

echo "=== Compiling React Frontend ==="
chmod +x /tmp/setup_frontend.sh
/tmp/setup_frontend.sh

echo "=== Cleaning up temporary files ==="
rm -rf /tmp/backend /tmp/backend.tar.gz

echo "=== Aether Panel deployed successfully! ==="
