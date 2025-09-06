#!/bin/bash

# ============================
# AWS SSO Manager Homebrew Cask Setup
# ============================

# Set variables for your app
APP_NAME="AWS SSO Manager"
APP_TOKEN="aws-sso-manager"
VERSION="2.0.0"
REPO="cfircoo/aws-sso-manager"
DMG_FILE="AWS SSO Manager-${VERSION}-arm64.dmg"
DMG_URL="https://github.com/cfircoo/aws-sso-manager/releases/download/v2.0.0/AWS.SSO.Manager-2.0.0-arm64.dmg"
SHA256="b2975a9a906dc9fe0218f87afc05bb4b346a3a376000dbf1c0e054a797154f39"
TAP_REPO="cfircoo/homebrew-tap"

echo "========================================="
echo "AWS SSO Manager Homebrew Cask Setup"
echo "========================================="
echo ""

# Step 1: Create the tap repository (if it doesn't exist)
echo "Step 1: Creating Homebrew tap repository..."
echo ""
echo "You need to create a GitHub repository called 'homebrew-tap' in your account."
echo "Run this command (using GitHub CLI):"
echo ""
echo "  gh repo create ${TAP_REPO} --public --description \"Homebrew tap for AWS SSO Manager\""
echo ""
echo "Or create it manually at: https://github.com/new"
echo ""
read -p "Press Enter once you've created the repository..."

# Step 2: Clone the tap repository
echo ""
echo "Step 2: Cloning tap repository..."
if [ -d "homebrew-tap" ]; then
    echo "Directory 'homebrew-tap' already exists. Removing it..."
    rm -rf homebrew-tap
fi

git clone "git@github.com:${TAP_REPO}.git"
if [ $? -ne 0 ]; then
    echo "Failed to clone repository. Trying HTTPS..."
    git clone "https://github.com/${TAP_REPO}.git"
fi

cd homebrew-tap

# Step 3: Create Casks directory
echo ""
echo "Step 3: Creating Casks directory..."
mkdir -p Casks

# Step 4: Create the cask file
echo ""
echo "Step 4: Creating cask file..."
cat > Casks/${APP_TOKEN}.rb <<'EOF'
cask "aws-sso-manager" do
  version "2.0.0"
  sha256 "b2975a9a906dc9fe0218f87afc05bb4b346a3a376000dbf1c0e054a797154f39"

  url "https://github.com/cfir-sensi/aws-sso-manager/releases/download/v#{version}/AWS%20SSO%20Manager-#{version}-arm64.dmg",
      verified: "github.com/cfir-sensi/aws-sso-manager/"
  name "AWS SSO Manager"
  desc "Desktop application that simplifies AWS Single Sign-On session management and role switching"
  homepage "https://github.com/cfir-sensi/aws-sso-manager"

  app "AWS SSO Manager.app"

  zap trash: [
    "~/Library/Application Support/aws-sso-manager",
    "~/Library/Preferences/com.aws-sso-manager.plist",
    "~/Library/Logs/aws-sso-manager",
    "~/Library/Saved Application State/com.aws-sso-manager.savedState",
  ]

  livecheck do
    url :url
    strategy :github_latest
  end
end
EOF

# Step 5: Commit and push
echo ""
echo "Step 5: Committing and pushing to GitHub..."
git add Casks/${APP_TOKEN}.rb
git commit -m "Add AWS SSO Manager cask v${VERSION}"
git push origin main

# Step 6: Test instructions
echo ""
echo "========================================="
echo "✅ Setup Complete!"
echo "========================================="
echo ""
echo "Users can now install AWS SSO Manager with:"
echo ""
echo "  brew tap ${TAP_REPO}"
echo "  brew install --cask ${APP_TOKEN}"
echo ""
echo "To test it yourself:"
echo "  brew tap ${TAP_REPO}"
echo "  brew install --cask ${APP_TOKEN}"
echo "  brew uninstall --cask ${APP_TOKEN}"
echo ""
echo "To update the cask for new releases:"
echo "1. Update the version and sha256 in Casks/${APP_TOKEN}.rb"
echo "2. Commit and push the changes"
echo "3. Users can then run: brew upgrade --cask ${APP_TOKEN}"
echo ""
