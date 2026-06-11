#!/usr/bin/env bash
# ZenG Trade — OI snapshot trigger.
#
# Runs ON the EC2 box (systemd timer). Hits the app container directly over its
# loopback — no internet hop, no TLS, no public exposure. The CRON_SECRET is
# read from inside the container (it already has it via env_file), so the secret
# never appears on the host or in process args.
#
# The route itself gates on market hours, so off-hours invocations return
# instantly without calling Kite.
set -euo pipefail

docker exec zengtrade-app node -e '
const secret = process.env.CRON_SECRET || "";
fetch("http://127.0.0.1:3000/api/cron/oi-snapshot", {
  headers: { Authorization: "Bearer " + secret },
})
  .then(async (r) => { console.log(r.status, await r.text()); })
  .catch((e) => { console.error(e.message); process.exit(1); });
'
