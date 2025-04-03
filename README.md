# AWS SSO Manager

A modern desktop application built with Electron and React for managing AWS SSO sessions and role switching across multiple AWS accounts.

![AWS SSO Manager Screenshot](public/screenshot.png)

## Features

- 🔐 Easy AWS SSO login and session management
- 👥 Switch between multiple AWS accounts and roles
- 🔄 Automatic session refresh
- 📊 ECR and CodeArtifact integration
- ⚡ Fast role switching with favorites
- 🎨 Modern and intuitive user interface
- 🌙 Dark mode support

## Installation

### macOS

1. Download the latest release from the [Releases](https://github.com/cfircoo/aws-sso-manager/releases) page
2. Open the downloaded `.dmg` file
3. Drag the AWS SSO Manager app to your Applications folder
4. Open the app from your Applications folder

### Prerequisites

- macOS 10.15 or later
- Active AWS SSO configuration
- AWS CLI v2 installed (optional, for some features)

## Development

### Setup

1. Clone the repository:
```bash
git clone https://github.com/cfircoo/aws-sso-manager.git
cd aws-sso-manager
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

### Building

To build the application:

```bash
npm run build-mac
```

Make .dmg file
```
npm run make-dmg
```

This will create a `.dmg` installer in the `release` directory.

## Configuration

The application stores its configuration in:
```
~/Library/aws-sso-manager/settings.json
```

AWS credentials and configurations are stored in the standard AWS CLI locations:
```
~/.aws/config
~/.aws/credentials
```

## Security

- All sensitive information is stored securely using the system's keychain
- No AWS credentials are stored in plain text
- Session tokens are managed securely and automatically refreshed


## License

This project is open source under the MIT License with Commons Clause - see the [LICENSE](LICENSE) file for details. This means you can freely use, modify, and distribute the code, but you cannot sell the software or use it for commercial purposes without explicit permission. The Commons Clause restriction applies specifically to commercial use and selling of the software.

## Version History

- v1.0.2 - Current stable release
  - Improved UI/UX
  - Added ECR and CodeArtifact support
  - Bug fixes and performance improvements

## Support

For support, please open an issue in the GitHub repository or contact the maintainers.

## Acknowledgments

- Built with [Electron](https://www.electronjs.org/)
- UI powered by [React](https://reactjs.org/)
- Styling with [Tailwind CSS](https://tailwindcss.com/)
