#!/bin/bash

# ============================
# Update AWS SSO Manager Homebrew Cask
# ============================

# Check if version parameter is provided
if [ $# -eq 0 ]; then
    echo "Usage: ./update-homebrew-cask.sh <version>"
    echo "Example: ./update-homebrew-cask.sh 2.1.0"
    exit 1
fi

VERSION=$1
REPO="cfir-sensi/aws-sso-manager"
TAP_REPO="cfircoo/homebrew-tap"
DMG_FILE="AWS SSO Manager-${VERSION}-arm64.dmg"
DMG_PATH="release/${DMG_FILE}"

echo "========================================="
echo "Updating AWS SSO Manager Homebrew Cask"
echo "Version: ${VERSION}"
echo "========================================="
echo ""

# Step 1: Check if DMG exists
if [ ! -f "${DMG_PATH}" ]; then
    echo "❌ Error: DMG file not found at ${DMG_PATH}"
    echo "Please build the release first with: npm run build-mac"
    exit 1
fi

# Step 2: Calculate SHA256
echo "Calculating SHA256..."
SHA256=$(shasum -a 256 "${DMG_PATH}" | awk '{print $1}')
echo "SHA256: ${SHA256}"
echo ""

# Step 3: Clone or update tap repository
echo "Updating tap repository..."
if [ -d "homebrew-tap" ]; then
    cd homebrew-tap
    git pull origin main
    cd ..
else
    git clone "git@github.com:${TAP_REPO}.git"
    if [ $? -ne 0 ]; then
        echo "Failed to clone repository. Trying HTTPS..."
        git clone "https://github.com/${TAP_REPO}.git"
    fi
fi

cd homebrew-tap

# Step 4: Update the cask file
echo "Updating cask file..."
cat > Casks/aws-sso-manager.rb <<EOF
cask "aws-sso-manager" do
  version "${VERSION}"
  sha256 "${SHA256}"

  url "https://github.com/${REPO}/releases/download/v#{version}/AWS%20SSO%20Manager-#{version}-arm64.dmg",
      verified: "github.com/${REPO}/"
  name "AWS SSO Manager"
  desc "Desktop application that simplifies AWS Single Sign-On session management and role switching"
  homepage "https://github.com/${REPO}"

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
echo "Committing and pushing changes..."
git add Casks/aws-sso-manager.rb
git commit -m "Update AWS SSO Manager to v${VERSION}"
git push origin main

echo ""
echo "========================================="
echo "✅ Update Complete!"
echo "========================================="
echo ""
echo "The cask has been updated to version ${VERSION}"
echo ""
echo "Users can now update with:"
echo "  brew update"
echo "  brew upgrade --cask aws-sso-manager"
echo ""
