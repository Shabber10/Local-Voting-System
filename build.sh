#!/usr/bin/env bash
# Exit immediately if a command exits with a non-zero status
set -e

echo "==> Installing Python dependencies..."
pip install -r backend/requirements.txt || pip3 install -r backend/requirements.txt

echo "==> Building React frontend..."
npm --prefix frontend install
npm --prefix frontend run build

echo "==> Build completed successfully!"
