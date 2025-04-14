# AWS SSO Manager - Release Notes v1.0.3

## New Features

### Quick Access Roles
- Added new Quick Access feature for faster AWS role management
- Streamlined role switching between frequently used roles
- Added management interface for Quick Access roles

### ECR Integration Improvements
- Added real-time progress modal when logging into ECR
- Enhanced ECR login process with better status reporting
- Improved error handling for Docker/ECR connection issues

## Improvements

### Session Management
- Improved session expiration handling with automatic redirect to login
- Enhanced session timer visualization (yellow warning at <2 hours, red critical at <1 hour)
- Added persistent session validity checks to prevent "stuck" sessions
- Clear "Session Expired" indicator with login button when session ends

### UI Enhancements
- Updated terminal button titles in Accounts List component
- Added credential management features to AccountsList
- Improved error messages and status indicators

## Technical Improvements
- Added periodic polling for session status to ensure data integrity
- Enhanced authentication state management
- Fixed edge cases in session expiration handling
- Improved timer display formatting
- Comprehensive session expiration detection

# Planned for AWS SSO Manager v1.0.4

## Upcoming Features

### Enhanced Role Management
- Save custom titles for roles to improve identification
- Role tagging for better organization
- Bulk operations for managing multiple roles

### Performance Optimization
- Faster account loading and role switching
- Reduced memory usage
- Improved application startup time

### Cloud Integration
- Improved integration with AWS CloudShell
- Support for CloudFormation template generation
- Better support for cross-account access

## UI/UX Improvements
- Dark mode enhancements
- Customizable dashboard layout
- Additional sorting and filtering options for accounts
- Keyboard shortcuts for power users

## Security Enhancements
- Additional session validation mechanisms
- Enhanced permissions visualization
- Support for security advisory notifications
