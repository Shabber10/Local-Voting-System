#!/usr/bin/env bash
# Exit immediately if a command exits with a non-zero status
set -e

echo "==> Installing Python dependencies with --break-system-packages..."
pip install --break-system-packages -r backend/requirements.txt || pip3 install --break-system-packages -r backend/requirements.txt || pip install -r backend/requirements.txt

echo "==> Building React frontend..."
npm --prefix frontend install
npm --prefix frontend run build

echo "==> Build completed successfully!"
