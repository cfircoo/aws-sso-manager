If you enjoy The app please buy me a coffee <a href="https://www.buymeacoffee.com/Cfircoo" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 60px !important;width: 217px !important;" ></a>
# AWS SSO Manager

A modern desktop application built with Electron and React for managing AWS SSO sessions and role switching across multiple AWS accounts.

## Features

- 🔐 Easy AWS SSO login and session management
- 👥 Switch between multiple AWS accounts and roles
- 🔄 Automatic session refresh
- 📊 ECR and CodeArtifact integration
- ⚡ Fast role switching with favorites
- 🎨 Modern and intuitive user interface
- 🌙 Dark mode support
- 🔍 Powerful search capabilities for quick account and role access
- 🔄 Manual refresh button for account list updates
- 🌐 Direct AWS Console access for any role with one click
- 📊 Visual account counter to track available AWS accounts
- ⏳ Loading indicators for better user experience

## Screenshots

### All Accounts View
![All Accounts View](public/all_accounts.png)

### Favorites
![Favorites View](public/favorite.png)

### Quick Access
![Quick Access View](public/quick_access.png)

## Installation

### macOS

#### Using Homebrew (Recommended):
```bash
# Add the tap
brew tap cfircoo/tap

# Install AWS SSO Manager
brew install --cask aws-sso-manager
```

#### Using the installer:
1. Download the latest release from the [Releases](https://github.com/cfircoo/aws-sso-manager/releases) page
2. Open the downloaded `.dmg` file
3. Drag the AWS SSO Manager app to your Applications folder
4. Open the app from your Applications folder

#### Using the install script:
1. Clone the repository:
   ```bash
   git clone https://github.com/cfircoo/aws-sso-manager.git
   cd aws-sso-manager
   ```
2. Run the installation script:
   ```bash
   ./mac_install.sh
   ```
   This will build the application, create a DMG file, and install it to your Applications folder.

### Windows

#### Using the installer:
1. Download the latest release from the [Releases](https://github.com/cfircoo/aws-sso-manager/releases) page
2. Run the downloaded `.exe` file
3. Follow the installation prompts
4. Open the app from your Start menu

#### Using the install script:
1. Clone the repository:
   ```bash
   git clone https://github.com/cfircoo/aws-sso-manager.git
   cd aws-sso-manager
   ```
2. Run the installation script:
   ```cmd
   .\win_install.bat
   ```
   This will build the application and install it to your Programs folder.

### Prerequisites

- macOS 10.15 or later or Windows 10/11
- Active AWS SSO configuration
- AWS CLI v2 installed (optional, for some features)
- Node.js and npm (for building from source)

## Getting Started Tutorial

### 1. Initial Setup

After installing AWS SSO Manager, you'll need to configure your AWS SSO settings:

1. **Launch the application** from your Applications folder (macOS) or Start menu (Windows)
2. **First-time setup**: The app will guide you through the initial configuration
3. **Configure AWS SSO**: Enter your AWS SSO start URL (e.g., `https://your-org.awsapps.com/start`)

### 2. Logging In

1. Click the **"Login"** button on the main screen
2. Your default browser will open with the AWS SSO login page
3. **Sign in** with your corporate credentials
4. **Authorize** the application when prompted
5. Return to the AWS SSO Manager - you should now see your available accounts

### 3. Managing Accounts and Roles

#### Viewing Accounts
- **All Accounts Tab**: Shows all AWS accounts you have access to
- **Favorites Tab**: Shows your frequently used accounts (marked with ⭐)
- **Quick Access Tab**: Shows recently used roles for faster switching

#### Switching Roles
1. **Find your account**: Use the search bar or browse through the list
2. **Select a role**: Click on the role you want to assume
3. **Access AWS**: 
   - Click **"Open Console"** to open AWS Console in your browser
   - Click **"Copy Credentials"** to copy temporary credentials
   - Use **"Configure CLI"** to set up AWS CLI with the role

#### Managing Favorites
- Click the **⭐ star icon** next to any account to add it to favorites
- Starred accounts appear in the **Favorites tab** for quick access
- Click the star again to remove from favorites

### 4. Advanced Features

#### ECR Integration
- **View ECR repositories** across your accounts
- **Get login commands** for Docker authentication
- **Copy repository URIs** for easy access

#### CodeArtifact Integration
- **Browse CodeArtifact repositories**
- **Get authentication tokens** for package managers
- **Copy repository endpoints**

#### Kubernetes/EKS Integration (v2.0+)
- **Discover EKS clusters** across all regions
- **Configure kubectl context** with one click
- **Switch between clusters** seamlessly

#### Session Management
- **Monitor session expiration**: Visual indicators show remaining time
  - 🟢 Green: More than 2 hours remaining
  - 🟡 Yellow: Less than 2 hours remaining  
  - 🔴 Red: Less than 1 hour remaining
- **Auto-refresh**: Sessions are automatically refreshed when possible
- **Manual refresh**: Use the refresh button to update account lists

### 5. Tips and Tricks

#### Search and Navigation
- **Quick search**: Use `Cmd+F` (macOS) or `Ctrl+F` (Windows) to search accounts
- **Filter by account name, ID, or role name**
- **Recently used regions** are remembered for faster access

#### Keyboard Shortcuts
- **Enter**: Open selected account in AWS Console
- **Cmd/Ctrl + C**: Copy credentials for selected role
- **Cmd/Ctrl + R**: Refresh account list
- **Escape**: Close dialogs or return to main view

#### Settings and Preferences
- **Dark/Light mode**: Toggle in the top-right corner
- **Default region**: Set your preferred AWS region
- **Session preferences**: Configure auto-refresh settings
- **Notification settings**: Control session expiration alerts

### 6. Troubleshooting

#### Common Issues
- **"No accounts found"**: Ensure you're logged in and have proper SSO permissions
- **Session expired**: Click the login button to re-authenticate
- **Console won't open**: Check your default browser settings
- **Slow loading**: Try refreshing the account list or restarting the app

#### Getting Help
- **Check logs**: Available in the app's help menu
- **Report issues**: Use the GitHub issues page
- **Contact support**: Email cfir@carmeli.me for assistance

### 7. Best Practices

- **Regular updates**: Keep the app updated for latest features and security fixes
- **Secure usage**: Always log out when using shared computers
- **Role management**: Use favorites to organize frequently accessed roles
- **Session monitoring**: Pay attention to session expiration warnings
- **Backup settings**: Your preferences are automatically saved and synced

## Configuration

The application stores its configuration in:

### macOS
```
~/Library/aws-sso-manager/settings.json
```

### Windows
```
%APPDATA%\aws-sso-manager\settings.json
```

AWS credentials and configurations are stored in the standard AWS CLI locations:

### macOS
```
~/.aws/config
~/.aws/credentials
```

### Windows
```
%USERPROFILE%\.aws\config
%USERPROFILE%\.aws\credentials
```

## Security

- All sensitive information is stored securely using the system's keychain/credential manager
- No AWS credentials are stored in plain text
- Session tokens are managed securely and automatically refreshed

## License

This project is open source under the MIT License with Commons Clause - see the [LICENSE](LICENSE) file for details. This means you can freely use, modify, and distribute the code, but you cannot sell the software or use it for commercial purposes without explicit permission. The Commons Clause restriction applies specifically to commercial use and selling of the software.   

## Support

For support, please open an issue in the GitHub repository or contact the maintainers at cfir@carmeli.me.

## Acknowledgments

- Built with [Electron](https://www.electronjs.org/)
- UI powered by [React](https://reactjs.org/)
- Styling with [Tailwind CSS](https://tailwindcss.com/)
