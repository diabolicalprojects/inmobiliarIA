#!/bin/sh

LOG_FILE="public/startup.log"

log() {
  echo "$1"
  echo "$1" >> "$LOG_FILE"
}

run_optional() {
  log "$1"
  shift
  "$@" >> "$LOG_FILE" 2>&1
  exit_code=$?
  if [ "$exit_code" -ne 0 ]; then
    log "Step failed with exit code $exit_code, continuing startup."
  fi
}

mkdir -p public
echo "Starting deployment script..." > "$LOG_FILE"

export AUTH_URL="${AUTH_URL:-https://agentesia.diabolicalservices.tech}"
export NEXTAUTH_URL="${NEXTAUTH_URL:-https://agentesia.diabolicalservices.tech}"
export AUTH_TRUST_HOST="${AUTH_TRUST_HOST:-true}"

if [ -z "$DATABASE_URL" ]; then
  log "DATABASE_URL is not configured. Skipping database setup."
else
  run_optional "Running prisma db push..." npx prisma db push
  run_optional "Running seed script..." npx tsx prisma/seed.ts
fi

log "Starting Next.js..."
HOSTNAME="0.0.0.0" exec npm run start
