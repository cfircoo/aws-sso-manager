# Product Context: AWS SSO Manager

## Why This Project Exists

### The Problem
AWS developers and engineers working with multiple AWS accounts face significant friction when:
- Switching between different AWS accounts and roles throughout the day
- Managing SSO sessions that expire and require re-authentication
- Accessing frequently used roles quickly
- Keeping track of which account/role they're currently using
- Managing ECR and CodeArtifact authentication across accounts

Traditional methods (AWS CLI, web console) are cumbersome for frequent role switching and don't provide a unified experience.

### The Solution
AWS SSO Manager provides a desktop application that acts as a centralized hub for all AWS SSO operations, making multi-account management as simple as clicking a button.

## How It Should Work

### User Journey
1. **Initial Setup**
   - User launches the application
   - Configures SSO URL and region
   - Optionally sets up ECR and CodeArtifact settings

2. **Authentication**
   - Click "Login with AWS SSO"
   - Complete browser-based SSO authentication
   - Application automatically fetches all available accounts and roles

3. **Daily Usage**
   - View all available accounts in organized tabs (All, Favorites, Quick Access)
   - Search for specific accounts or roles
   - Click to assume any role instantly
   - Access AWS Console directly from the app
   - Monitor session time remaining
   - Get visual warnings before session expiration

4. **Advanced Features**
   - Mark frequently used roles as favorites
   - Set up Quick Access for instant role switching
   - Login to ECR repositories with one click
   - Configure CodeArtifact authentication

## User Experience Goals

### Simplicity
- One-click role switching
- Clear visual hierarchy of accounts and roles
- Intuitive search and filtering
- Minimal configuration required

### Speed
- Instant role assumption
- Fast search results
- Quick access to frequently used roles
- Keyboard shortcuts for power users

### Reliability
- Clear session status indicators
- Automatic error recovery
- Persistent favorites and settings
- Graceful handling of expired sessions

### Visual Clarity
- Clean, modern interface
- Dark mode for reduced eye strain
- Color-coded session warnings
- Loading states for all operations
- Account badges showing available counts

## Product Principles

1. **User-Centric Design**: Every feature should reduce friction in the AWS workflow
2. **Security First**: Never compromise on credential security
3. **Performance Matters**: Fast operations are critical for developer productivity
4. **Visual Feedback**: Users should always know what's happening
5. **Cross-Platform Consistency**: Same experience on macOS and Windows

## Future Vision
- Integration with more AWS services
- Team collaboration features
- Advanced role management capabilities
- Cloud-based settings sync
- Mobile companion app
