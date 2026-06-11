#!/usr/bin/env bash
# Install the OI-snapshot systemd timer on the EC2 box.
# Run from the repo checkout on the box, or via the deploy steps in the README.
set -euo pipefail

SRC="$(cd "$(dirname "$0")" && pwd)"

# Trigger script lives at a stable path the deploy rsync never touches.
sudo install -m 0755 "$SRC/oi-snapshot.sh" /opt/zengtrade/oi-snapshot.sh

sudo install -m 0644 "$SRC/zeng-oi-snapshot.service" /etc/systemd/system/
sudo install -m 0644 "$SRC/zeng-oi-snapshot.timer"   /etc/systemd/system/

sudo systemctl daemon-reload
sudo systemctl enable --now zeng-oi-snapshot.timer

echo "✅ Installed. Next runs:"
systemctl list-timers zeng-oi-snapshot.timer --no-pager | head -3
