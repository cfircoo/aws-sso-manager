# AWS SSO Manager - Homebrew Installation Guide

## 🍺 Installing via Homebrew (macOS)

AWS SSO Manager can be installed on macOS using Homebrew. This provides an easy way to install and update the application.

### Prerequisites

- macOS 10.15 or later
- [Homebrew](https://brew.sh) installed on your system

### Installation

```bash
# Add the tap
brew tap cfircoo/tap

# Install AWS SSO Manager
brew install --cask aws-sso-manager
```

### Updating

```bash
# Update Homebrew
brew update

# Upgrade AWS SSO Manager
brew upgrade --cask aws-sso-manager
```

### Uninstalling

```bash
# Uninstall AWS SSO Manager
brew uninstall --cask aws-sso-manager

# Remove the tap (optional)
brew untap cfircoo/tap
```

## 🛠️ For Maintainers: Setting Up the Homebrew Tap

If you're forking this project or want to create your own Homebrew tap, follow these steps:

### Initial Setup

1. **Create a GitHub repository** named `homebrew-tap`:
   ```bash
   gh repo create yourusername/homebrew-tap --public --description "Homebrew tap for AWS SSO Manager"
   ```

2. **Run the setup script**:
   ```bash
   ./homebrew-setup.sh
   ```
   This script will:
   - Clone your tap repository
   - Create the necessary directory structure
   - Generate the cask file with the correct SHA256
   - Commit and push to GitHub

3. **Test the installation**:
   ```bash
   brew tap cfircoo/tap
   brew install --cask aws-sso-manager
   ```

### Updating for New Releases

When you release a new version:

1. **Build the new DMG**:
   ```bash
   npm run build-mac
   ```

2. **Upload the DMG to GitHub Releases**

3. **Update the cask**:
   ```bash
   ./update-homebrew-cask.sh 2.1.0  # Replace with your new version
   ```

### Cask File Structure

The cask file (`aws-sso-manager.rb`) includes:
- Version and SHA256 checksum
- Download URL pointing to GitHub releases
- Application metadata (name, description, homepage)
- Installation instructions (installs the .app bundle)
- Cleanup instructions (removes preferences and logs on uninstall)
- Livecheck configuration for automatic version detection

### Troubleshooting

**Installation fails with "SHA256 mismatch"**
- Ensure the SHA256 in the cask file matches the actual DMG file
- Recalculate with: `shasum -a 256 "path/to/dmg"`

**Can't find the cask**
- Make sure you've tapped the repository: `brew tap cfircoo/tap`
- Update Homebrew: `brew update`

**Application won't open after installation**
- Check Security & Privacy settings in macOS
- You may need to right-click and select "Open" the first time

## 📦 Alternative Installation Methods

If you prefer not to use Homebrew, you can:

1. **Download directly from GitHub Releases**
   - Go to [Releases](https://github.com/cfircoo/aws-sso-manager/releases)
   - Download the `.dmg` file for your architecture
   - Double-click to mount and drag to Applications

2. **Build from source**
   ```bash
   git clone https://github.com/cfircoo/aws-sso-manager.git
   cd aws-sso-manager
   npm install
   npm run build-mac
   ```
