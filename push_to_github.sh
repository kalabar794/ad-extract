#!/bin/bash
# GitHub Backup Script
# Run this after authenticating with: gh auth login

echo "========================================="
echo "GITHUB BACKUP SCRIPT"
echo "========================================="
echo ""

# Check if authenticated
if ! gh auth status > /dev/null 2>&1; then
    echo "Not authenticated with GitHub!"
    echo ""
    echo "Please run: gh auth login"
    echo ""
    echo "Then run this script again."
    exit 1
fi

echo "✓ GitHub authentication confirmed"
echo ""

# Add remote if it doesn't exist
if ! git remote get-url origin > /dev/null 2>&1; then
    echo "Adding remote repository..."
    git remote add origin https://github.com/kalabar794/epstein.git
    echo "✓ Remote added"
else
    echo "✓ Remote already configured"
fi

echo ""
echo "Pushing to GitHub..."
echo ""

# Push to GitHub
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "========================================="
    echo "✓ BACKUP COMPLETE!"
    echo "========================================="
    echo ""
    echo "Your code is now backed up at:"
    echo "https://github.com/kalabar794/epstein"
    echo ""
else
    echo ""
    echo "Push failed. You may need to run:"
    echo "  gh auth login"
    echo "Then try again."
fi
