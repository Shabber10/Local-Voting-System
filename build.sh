#!/usr/bin/env bash
# Exit immediately if a command exits with a non-zero status
set -e

echo "==> Installing Python dependencies into backend/libs..."
pip install -r backend/requirements.txt --target backend/libs || pip3 install -r backend/requirements.txt --target backend/libs

echo "==> Building React frontend..."
npm --prefix frontend install
npm --prefix frontend run build

echo "==> Build completed successfully!"
