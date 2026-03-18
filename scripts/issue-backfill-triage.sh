#!/usr/bin/env bash
# One-time script to triage existing unlabeled issues using Claude.
# Run locally with authenticated `gh` and `claude` (Claude Code CLI):
#
#   bash scripts/issue-backfill-triage.sh [--dry-run] [--limit N]
#
# Prerequisites:
#   - gh CLI authenticated with repo write access
#   - Claude Code CLI installed (npm install -g @anthropic-ai/claude-code)
#   - ANTHROPIC_API_KEY set in environment
#
# What it does:
#   1. Fetches all open issues with no labels
#   2. For each, calls Claude to classify it
#   3. Sets the issue type via GraphQL
#   4. Applies scope labels
#   5. Leaves a triage comment

set -euo pipefail

REPO="twentyhq/twenty"
DRY_RUN=false
LIMIT=0

while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run) DRY_RUN=true; shift ;;
    --limit) LIMIT=$2; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

echo "=== Backfill Triage for $REPO ==="
echo "Dry run: $DRY_RUN"
[ "$LIMIT" -gt 0 ] && echo "Limit: $LIMIT issues"

# Fetch issue types
echo "Fetching issue types..."
ISSUE_TYPES=$(gh api graphql \
  -H "GraphQL-Features: issue_types" \
  -f query='{
    repository(owner: "twentyhq", name: "twenty") {
      issueTypes(first: 20) {
        nodes { id name }
      }
    }
  }' --jq '.data.repository.issueTypes.nodes')
echo "Available types: $(echo "$ISSUE_TYPES" | jq -r '.[].name' | tr '\n' ', ')"

# Fetch all open issues for duplicate-check context
echo "Fetching open issues for context..."
ALL_ISSUES=$(gh issue list -R "$REPO" --state open --limit 200 --json number,title --jq '.[] | "#\(.number): \(.title)"')

# Fetch unlabeled issues
echo "Fetching unlabeled open issues..."
UNLABELED=$(gh api --paginate "repos/$REPO/issues?state=open&per_page=100" \
  --jq '.[] | select(.labels | length == 0) | select(.pull_request == null) | "\(.number)\t\(.title)"')

COUNT=$(echo "$UNLABELED" | grep -c . || true)
echo "Found $COUNT unlabeled issues"
[ "$COUNT" -eq 0 ] && { echo "Nothing to do!"; exit 0; }

PROCESSED=0

while IFS=$'\t' read -r number title; do
  [ -z "$number" ] && continue
  PROCESSED=$((PROCESSED + 1))
  [ "$LIMIT" -gt 0 ] && [ "$PROCESSED" -gt "$LIMIT" ] && break

  echo ""
  echo "--- Processing #$number: $title ($PROCESSED/$COUNT) ---"

  # Fetch full issue body
  BODY=$(gh issue view "$number" -R "$REPO" --json body --jq '.body' 2>/dev/null || echo "")

  # Call Claude for classification
  PROMPT="You are an issue triager for Twenty CRM. Classify this issue. Respond with ONLY valid JSON.

Issue #$number
Title: $title
Body:
$BODY

Recent open issues (for duplicate check):
$ALL_ISSUES

{
  \"issue_type\": \"<Bug|Feature|Task|null>\",
  \"scope\": \"<front|backend|back+front|infra|self-host|null>\",
  \"is_support_question\": <true|false>,
  \"needs_reproduction\": <true|false>,
  \"good_first_issue\": <true|false>,
  \"duplicate_of\": <number|null>,
  \"summary\": \"<one sentence>\"
}"

  RESULT=$(echo "$PROMPT" | claude --model haiku --print 2>/dev/null || echo "")

  if [ -z "$RESULT" ]; then
    echo "  Claude returned empty, skipping"
    continue
  fi

  # Extract JSON
  JSON=$(echo "$RESULT" | python3 -c "
import sys, json, re
text = sys.stdin.read()
match = re.search(r'\{[\s\S]*\}', text)
if match:
    obj = json.loads(match.group())
    print(json.dumps(obj))
else:
    sys.exit(1)
" 2>/dev/null || echo "")

  if [ -z "$JSON" ]; then
    echo "  Could not parse JSON from Claude response, skipping"
    continue
  fi

  echo "  Classification: $(echo "$JSON" | jq -c '{type: .issue_type, scope: .scope}')"

  if [ "$DRY_RUN" = true ]; then
    echo "  [DRY RUN] Would apply: $JSON"
    continue
  fi

  # Set issue type
  ISSUE_TYPE=$(echo "$JSON" | jq -r '.issue_type // empty')
  if [ -n "$ISSUE_TYPE" ] && [ "$ISSUE_TYPE" != "null" ]; then
    TYPE_ID=$(echo "$ISSUE_TYPES" | jq -r --arg name "$ISSUE_TYPE" '.[] | select(.name == $name) | .id')
    if [ -n "$TYPE_ID" ]; then
      ISSUE_NODE_ID=$(gh api graphql -f query="{
        repository(owner: \"twentyhq\", name: \"twenty\") {
          issue(number: $number) { id }
        }
      }" --jq '.data.repository.issue.id')

      gh api graphql \
        -H "GraphQL-Features: issue_types" \
        -f query="mutation {
          updateIssue(input: {id: \"$ISSUE_NODE_ID\", issueTypeId: \"$TYPE_ID\"}) {
            issue { number }
          }
        }" >/dev/null 2>&1 && echo "  Set type: $ISSUE_TYPE" || echo "  Failed to set type"
    fi
  fi

  # Build and apply labels
  LABELS=()
  SCOPE=$(echo "$JSON" | jq -r '.scope // empty')
  IS_SUPPORT=$(echo "$JSON" | jq -r '.is_support_question // false')
  NEEDS_REPRO=$(echo "$JSON" | jq -r '.needs_reproduction // false')
  GOOD_FIRST=$(echo "$JSON" | jq -r '.good_first_issue // false')

  [ -n "$SCOPE" ] && [ "$SCOPE" != "null" ] && LABELS+=("scope: $SCOPE")
  [ "$IS_SUPPORT" = "true" ] && LABELS+=("support")
  [ "$NEEDS_REPRO" = "true" ] && LABELS+=("needs: reproduction")
  [ "$GOOD_FIRST" = "true" ] && LABELS+=("good first issue")

  if [ ${#LABELS[@]} -gt 0 ]; then
    LABEL_ARGS=""
    for l in "${LABELS[@]}"; do
      LABEL_ARGS="$LABEL_ARGS --add-label \"$l\""
    done
    eval "gh issue edit $number -R $REPO $LABEL_ARGS" 2>/dev/null && \
      echo "  Applied labels: ${LABELS[*]}" || echo "  Failed to apply labels"
  fi

  # Brief pause to avoid rate limits
  sleep 1

done <<< "$UNLABELED"

echo ""
echo "=== Backfill complete! Processed $PROCESSED issues ==="
