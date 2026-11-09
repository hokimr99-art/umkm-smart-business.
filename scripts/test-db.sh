#!/usr/bin/env bash
# Runs the Supabase migrations and database tests against a throwaway local
# PostgreSQL cluster (no Supabase account or Docker needed).
# Requires PostgreSQL server binaries (initdb, pg_ctl, psql) on the machine.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BINDIR="$(pg_config --bindir 2>/dev/null || true)"
if [ -z "$BINDIR" ] || [ ! -x "$BINDIR/initdb" ]; then
  BINDIR="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)"
fi
[ -x "$BINDIR/initdb" ] || { echo "PostgreSQL server binaries not found"; exit 1; }

WORK="$(mktemp -d)"
PORT="${TEST_DB_PORT:-54329}"
RUN=()
if [ "$(id -u)" = "0" ]; then
  # PostgreSQL refuses to run as root.
  chown postgres "$WORK"
  RUN=(runuser -u postgres --)
fi

cleanup() {
  "${RUN[@]}" "$BINDIR/pg_ctl" -D "$WORK/data" -m immediate stop >/dev/null 2>&1 || true
  rm -rf "$WORK"
}
trap cleanup EXIT

"${RUN[@]}" "$BINDIR/initdb" -D "$WORK/data" -U postgres --auth=trust >/dev/null
"${RUN[@]}" "$BINDIR/pg_ctl" -D "$WORK/data" -o "-p $PORT -k $WORK -c listen_addresses=''" -l "$WORK/log" -w start >/dev/null

PSQL=(psql -X -q -h "$WORK" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1)

for f in "$ROOT"/supabase/tests/setup/*.sql "$ROOT"/supabase/migrations/*.sql; do
  "${PSQL[@]}" -f "$f" >/dev/null
done
echo "Migrations applied: $(ls "$ROOT"/supabase/migrations/*.sql | wc -l)"

total_pass=0; failed=0
for t in "$ROOT"/supabase/tests/*.test.sql; do
  out="$("${PSQL[@]}" -f "$t" 2>&1)" && status=0 || status=$?
  pass=$(grep -c "NOTICE:  ok - " <<<"$out" || true)
  total_pass=$((total_pass + pass))
  if [ "$status" -ne 0 ]; then
    failed=$((failed + 1))
    echo "FAIL $(basename "$t") after $pass passing assertions:"
    grep -E "ERROR|not ok" <<<"$out" | head -5
  else
    echo "PASS $(basename "$t") ($pass assertions)"
  fi
done

# Rollback must apply cleanly too.
"${PSQL[@]}" -f "$ROOT"/supabase/rollback/*.sql >/dev/null && echo "Rollback script applied cleanly"

echo "Total: $total_pass assertions passed, $failed file(s) failed"
[ "$failed" -eq 0 ]
