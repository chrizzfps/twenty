#!/usr/bin/env bash
# One-time script to clean up issue labels.
# Run locally with an authenticated `gh` CLI:
#   bash scripts/issue-cleanup-labels.sh
#
# What it does:
#   1. Deletes typo / stale / obsolete labels
#   2. Renames labels that are miscategorized
#   3. Removes all "type: *" labels (replaced by GitHub issue types)
#
# Safe to run multiple times (idempotent).

set -euo pipefail

REPO="twentyhq/twenty"

echo "=== Issue Label Cleanup for $REPO ==="

# Labels to delete outright (typos, stale, or obsolete)
DELETE_LABELS=(
  "hihg"
  "for exa"
  "HACKTOBERFEST_2025"
  "type: bug"
  "type: chore"
  "type: feature"
  "type: design improvement"
  "type: documentation"
  "type: marketing"
  "type: SELF_HOST"
  "💎 Bounty"
  "🙋 Bounty claim"
  "stale"
)

for label in "${DELETE_LABELS[@]}"; do
  echo "Deleting label: '$label'"
  gh label delete "$label" -R "$REPO" --yes 2>/dev/null || echo "  (not found or already deleted)"
done

# Create new labels that the triage workflow needs
echo ""
echo "=== Creating new labels ==="

declare -A NEW_LABELS=(
  ["scope: self-host"]="bfd4f2:Issues specific to self-hosted deployments"
  ["needs: reproduction"]="fbca04:Bug reports that lack steps to reproduce"
  ["support"]="0075ca:Support questions / troubleshooting"
  ["size: medium"]="c2e0c6:Medium-sized task"
)

for label in "${!NEW_LABELS[@]}"; do
  IFS=':' read -r color desc <<< "${NEW_LABELS[$label]}"
  echo "Creating label: '$label' ($desc)"
  gh label create "$label" -R "$REPO" --color "$color" --description "$desc" 2>/dev/null || echo "  (already exists)"
done

echo ""
echo "=== Removing 'type: *' labels from existing issues ==="

# For each type label, find issues that have it and remove it
TYPE_LABELS=(
  "type: bug"
  "type: chore"
  "type: feature"
  "type: design improvement"
  "type: documentation"
  "type: marketing"
  "type: SELF_HOST"
)

for label in "${TYPE_LABELS[@]}"; do
  issues=$(gh issue list -R "$REPO" --state all --label "$label" --json number --jq '.[].number' 2>/dev/null || true)
  if [ -n "$issues" ]; then
    echo "Removing '$label' from issues: $issues"
    for num in $issues; do
      gh issue edit "$num" -R "$REPO" --remove-label "$label" 2>/dev/null || true
    done
  fi
done

echo ""
echo "=== Done! ==="
echo "Remaining labels:"
gh label list -R "$REPO" --limit 100
