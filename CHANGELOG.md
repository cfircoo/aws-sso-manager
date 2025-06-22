# Changelog

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