#!/usr/bin/env bash
set -euo pipefail

# git-sync.sh
# Usage:
#   ./scripts/git-sync.sh -m "Commit message"
#   GIT_REMOTE=https://github.com/your/repo.git ./scripts/git-sync.sh -b main -m "Sync commit"

cd "$(dirname "$0")/.."

if [ ! -d .git ]; then
  echo "Error: No git repository found in $(pwd)"
  exit 1
fi

REMOTE_URL=""
BRANCH=""
COMMIT_MESSAGE=""
SSH_KEY="${SSH_KEY:-$HOME/.ssh/modaui_deploy_key}"

usage() {
  cat <<EOF
Usage: $0 [-r remote-url] [-b branch] [-m commit-message] [-k ssh-key]

Options:
  -r remote-url      Remote git url to use or configure if origin is missing.
  -b branch          Branch to sync (defaults to current branch).
  -m commit-message  Commit message for local changes.
  -k ssh-key         Path to SSH private key for git pushes.

Environment variables:
  GIT_REMOTE  remote url if not provided by -r
  GIT_BRANCH  branch if not provided by -b
  SSH_KEY     ssh key if not provided by -k
EOF
  exit 1
}

while getopts ":r:b:m:k:h" opt; do
  case "$opt" in
    r) REMOTE_URL="$OPTARG" ;;
    b) BRANCH="$OPTARG" ;;
    m) COMMIT_MESSAGE="$OPTARG" ;;
    k) SSH_KEY="$OPTARG" ;;
    h) usage ;;
    *) usage ;;
  esac
done

REMOTE_URL="${REMOTE_URL:-${GIT_REMOTE:-}}"
SSH_KEY="${SSH_KEY:-${SSH_KEY:-$HOME/.ssh/modaui_deploy_key}}"
BRANCH="${BRANCH:-${GIT_BRANCH:-"$(git symbolic-ref --short HEAD 2>/dev/null || echo main)"}}"

if [ -z "$BRANCH" ]; then
  BRANCH="master"
fi

if git remote get-url origin >/dev/null 2>&1; then
  ORIGIN_URL="$(git remote get-url origin)"
else
  ORIGIN_URL=""
fi

if [ -z "$ORIGIN_URL" ]; then
  if [ -z "$REMOTE_URL" ]; then
    echo "Error: no origin remote configured and no remote URL provided."
    echo "Set GIT_REMOTE or use -r <remote-url>."
    exit 1
  fi
  echo "Adding origin remote: $REMOTE_URL"
  git remote add origin "$REMOTE_URL"
  ORIGIN_URL="$REMOTE_URL"
elif [ -n "$REMOTE_URL" ] && [ "$REMOTE_URL" != "$ORIGIN_URL" ]; then
  echo "Updating origin remote from $ORIGIN_URL to $REMOTE_URL"
  git remote set-url origin "$REMOTE_URL"
  ORIGIN_URL="$REMOTE_URL"
fi

if [ -z "$COMMIT_MESSAGE" ]; then
  COMMIT_MESSAGE="Sync local changes $(date +'%Y-%m-%d %H:%M:%S')"
fi

if [ -n "$SSH_KEY" ] && [ -f "$SSH_KEY" ]; then
  export GIT_SSH_COMMAND="ssh -i $SSH_KEY -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new"
fi

echo "Repository: $(pwd)"
echo "Remote origin: $ORIGIN_URL"
echo "Branch: $BRANCH"

echo "Using SSH key: ${SSH_KEY:-none}"

# Stage any local changes.
git add -A

if ! git diff --cached --quiet; then
  echo "Committing local changes..."
  git commit -m "$COMMIT_MESSAGE"
else
  echo "No staged changes to commit."
fi

echo "Fetching latest from origin..."
git fetch origin --prune

if git show-ref --verify --quiet "refs/remotes/origin/$BRANCH"; then
  echo "Pulling latest changes from origin/$BRANCH..."
  git pull --rebase origin "$BRANCH" --autostash
else
  echo "Remote branch origin/$BRANCH not found. Skipping pull."
fi

echo "Pushing current branch to origin/$BRANCH..."
git push -u origin "$BRANCH"

echo "Git sync complete."
