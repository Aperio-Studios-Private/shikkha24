#!/usr/bin/env sh
# ═════════════════════════════════════════════════════════════════════════════
# T-31 — CMS bundle builder for any Linux machine (T-31, 2026-10-17)
#
# Runs unattended on: GitHub Codespaces (default container), WSL2 Ubuntu on a
# Windows PC, or any Linux with Node 20.9+/zip. Produces ONE file:
#
#     cms-deploy-<timestamp>.zip     (repo root, ~200-300 MB)
#
# The zip layout mirrors the proven Oct-11 CI bundle exactly: the Next.js
# standalone tree of cms/.next/standalone/ (promoted payload package +
# sanitized: no data/, no .env*), zipped with `-y` so pnpm's symlinks are
# stored as links — without `-y` the upload dies on extraction (run
# 38060359694 died exactly that way on 2026-10-10).
#
# UPLOAD IS A SEPARATE STEP (from the operator's Mac via
# scripts/cpanel-client.mjs so secrets never enter this machine).
# ═════════════════════════════════════════════════════════════════════════════
set -eu

echo "── 0/5 tools ──"
command -v zip >/dev/null || { echo "  ✗ zip missing"; exit 1; }
command -v pnpm >/dev/null || corepack enable
pnpm --version
node --version  # needs >= 20.9.0 (cms engines)

echo "── 1/5 install (cms workspace only) ──"
pnpm install --frozen-lockfile --filter cms

echo "── 2/5 build (cms standalone) ──"
(cd cms && pnpm run build)

echo "── 3/5 assemble (payload promote + font/static/migrations copy) ──"
node scripts/assemble-cms-bundle.mjs

echo "── 4/5 data/.env hygiene check (defense in depth) ──"
test ! -e cms/.next/standalone/cms/data && echo "  ✓ no data/ in bundle" || { echo "  ✗ data/ present — refusing"; exit 1; }
test ! -e cms/.next/standalone/.env && echo "  ✓ no .env in bundle" || { echo "  ✗ .env present — refusing"; exit 1; }

echo "── 5/5 zip (store symlinks as links: -y is load-bearing) ──"
ZIP="cms-deploy-$(date +%Y%m%d-%H%M%S).zip"
(cd cms/.next/standalone && zip -rqy "../../${ZIP}" .)
SIZE=$(du -sm "$ZIP" | cut -f1)
test "${SIZE:-0}" -gt 40 || { echo "  ✗ zip suspiciously small (${SIZE} MB) — inspect before shipping"; exit 1; }

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  ✓ BUNDLE READY: ./$ZIP  (${SIZE} MB)"
echo "  next (on the operator Mac, not here): upload via"
echo "  scripts/cpanel-client.mjs, then the Terminal swap runbook"
echo "════════════════════════════════════════════════════════════"
