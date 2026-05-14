#!/bin/bash
set -e

echo "Pulling latest from Bitbucket..."
git -C backend merge origin/main --no-edit
git -C frontend merge origin/main --no-edit

echo "Updating GitHub monorepo..."
mv backend/.git /tmp/backend_git_sync
mv frontend/.git /tmp/frontend_git_sync

git add backend/ frontend/
git commit -m "sync: update from Bitbucket $(date '+%Y-%m-%d %H:%M')" || echo "Nothing to sync"

mv /tmp/backend_git_sync backend/.git
mv /tmp/frontend_git_sync frontend/.git

git push origin master
echo "Done. Railway will redeploy automatically."
