#!/usr/bin/env bash
# CyberSWAT 开发部子站 — 定期清理（🟢-4）
set -euo pipefail
DB="cyberswat-dev-db-prod"
docker exec "$DB" psql -U cyberswat -d cyberswat_dev -q <<'SQL'
DELETE FROM core_notifications WHERE "createdAt" < now() - interval '90 days';
DELETE FROM core_oauth_codes WHERE (used = true OR "expiresAt" < now()) AND "createdAt" < now() - interval '1 day';
DELETE FROM core_oauth_tokens WHERE revoked = true AND "createdAt" < now() - interval '30 days';
DELETE FROM core_refresh_tokens WHERE revoked = true AND "createdAt" < now() - interval '30 days';
DELETE FROM core_invites WHERE "expiresAt" < now() - interval '30 days';
SQL
echo "[cleanup] OK $(date -Iseconds)"
