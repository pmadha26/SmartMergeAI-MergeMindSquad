#!/bin/bash

# Script to manually trigger the Bob Consolidated workflow for a specific PR

PR_NUMBER=${1:-8}

echo "🚀 Triggering Bob Consolidated workflow for PR #$PR_NUMBER..."

gh workflow run bob-consolidated.yml -f pr_number=$PR_NUMBER

echo "✅ Workflow triggered! Check the Actions tab in GitHub."
echo "   https://github.com/pmadha26/SmartMergeAI-MergeMindSquad/actions"

# Made with Bob
