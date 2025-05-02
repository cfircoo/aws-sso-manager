#!/bin/bash

# AWS SSO Manager Installer
# This script builds and installs the AWS SSO Manager application on macOS

set -e # Exit on error

echo "AWS SSO Manager Installer"
echo "========================="

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "Error: This installer is only compatible with macOS."
    exit 1
fi

# Check for required tools
if ! command -v node &> /dev/null || ! command -v npm &> /dev/null; then
    echo "Error: Node.js and npm are required but not installed."
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Function to display progress
progress() {
    echo ""
    echo "➡️  $1"
}

# Install directory
APP_NAME="AWS SSO Manager"
INSTALL_DIR="/Applications"
APP_PATH="$INSTALL_DIR/$APP_NAME.app"

# Check if app is already installed
if [ -d "$APP_PATH" ]; then
    read -p "AWS SSO Manager is already installed. Do you want to replace it? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Installation canceled."
        exit 0
    fi
fi

# Navigate to script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Build steps
progress "Installing dependencies..."
npm install

progress "Building the application..."
npm run build

progress "Creating the macOS application package..."
npm run build-mac

# Check if the app was built successfully
if [ ! -d "release/mac-arm64/$APP_NAME.app" ] && [ ! -d "release/mac/$APP_NAME.app" ]; then
    echo "Error: Application build failed. Check the logs for details."
    exit 1
fi

# Determine the correct path
if [ -d "release/mac-arm64/$APP_NAME.app" ]; then
    BUILD_PATH="release/mac-arm64/$APP_NAME.app"
elif [ -d "release/mac/$APP_NAME.app" ]; then
    BUILD_PATH="release/mac/$APP_NAME.app"
fi

progress "Creating DMG file..."
npm run make-dmg

progress "Installing application to $INSTALL_DIR..."
# Check if the app is running and close it
if pgrep -x "AWS SSO Manager" > /dev/null; then
    echo "AWS SSO Manager is currently running. Closing it now..."
    osascript -e 'tell application "AWS SSO Manager" to quit'
    sleep 2
fi

# Remove old version if exists
if [ -d "$APP_PATH" ]; then
    rm -rf "$APP_PATH"
fi

# Copy new version
cp -R "$BUILD_PATH" "$INSTALL_DIR"

progress "Setting permissions..."
chmod -R 755 "$APP_PATH"

progress "Installation complete!"
progress "You can now launch AWS SSO Manager from your Applications folder."
open "$APP_PATH"
exit 0 