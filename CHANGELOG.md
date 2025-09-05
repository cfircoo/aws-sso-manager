# Changelog

## [2.0.0] - 2024-12-20

### Added
- **Kubernetes/EKS Integration**: Full cluster discovery and kubectl automation
  - Automatic EKS cluster discovery across all AWS regions
  - One-click kubectl context configuration
  - Multi-region cluster management
  - kubectl context tracking and display in settings
  - Recently used regions tracking for better UX
- **Professional Design System**: Complete UI overhaul
  - Enterprise-ready indigo color palette (#4F46E5)
  - Glass morphism effects with improved readability
  - Subtle animations and transitions
  - Consistent component design across all features
- **Enhanced Components**:
  - Portal-based modal system
  - Custom toast notifications
  - Individual role display component (RoleItem)
  - Professional "Support" button replacing bright donation button
- **kubectl Context Management**:
  - Automatic context saving when setting kubectl context
  - Real-time kubectl context display in settings
  - Manual refresh capability

### Changed
- **UI/UX Improvements**:
  - Session timer now displays in HH:MM:SS format instead of milliseconds
  - All tabs (All, Favorites, Quick Access) now use identical button layouts
  - Quick Access tab shows individual roles without account wrapper
  - Increased glass effect opacity (0.95) for better readability
  - Conservative animations suitable for enterprise use
- **Design Updates**:
  - Primary colors changed from orange/red gradients to professional indigo
  - Removed flashy gradient backgrounds in favor of subtle effects
  - Updated button styles to use solid colors instead of gradients
  - Improved contrast and typography throughout

### Fixed
- Session timer displaying raw milliseconds instead of formatted time
- Component inconsistencies between different tabs
- Various edge cases in session expiration handling
- Settings file caching to reduce disk I/O
- Console URL generation for SSO authentication

### Technical
- Enhanced TypeScript type definitions
- Improved component organization and separation of concerns
- Better error handling for AWS API calls
- Optimized IPC communication between renderer and main process
- Added comprehensive kubectl integration with error recovery

## [1.0.7] - 2024-05-17

### Fixed
- Fixed AWS Console access URL format to properly handle SSO authentication
- Fixed React hooks usage in AWS Console opening functionality
- Fixed settings file caching to reduce disk I/O and log spam
- Fixed application startup by ensuring dist files are built before launch
- Fixed mac_install.sh script line endings (CRLF to LF) for macOS compatibility

### Changed
- Improved debug logging for AWS Console URL generation
- Added caching layer for settings to improve performance
- Updated start scripts to include build step

### Added
- Added debug configuration for VS Code
- Added detailed logging for SSO URL generation process
- Added "Settings File" and "Logs" buttons in Settings form

## [1.0.6] - Previous Release 