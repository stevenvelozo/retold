#!/bin/sh
echo "Stopping retold-todo container (if running)..."
docker stop retold-todo 2>/dev/null && echo "  Stopped." || echo "  Not running."
echo "Removing retold-todo container (if exists)..."
docker rm retold-todo 2>/dev/null && echo "  Removed." || echo "  Not found."
echo "Removing retold-todo image (if exists)..."
docker rmi retold-todo 2>/dev/null && echo "  Removed." || echo "  Not found."
echo "Done."
