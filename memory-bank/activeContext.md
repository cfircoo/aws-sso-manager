# Active Context: AWS SSO Manager

## Current Work Focus
- **Branch**: buy-me-coffee
- **Feature**: Adding "Buy Me a Coffee" support functionality
- **Status**: Completed ✅

## Recent Changes (v1.0.7)

### Fixes Implemented
1. **AWS Console Access**
   - Fixed URL format for SSO authentication
   - Corrected React hooks usage in console opening functionality
   
2. **Performance Improvements**
   - Implemented settings file caching to reduce disk I/O
   - Reduced log spam from frequent file reads
   
3. **Build Process**
   - Fixed startup issues by ensuring dist files are built before launch
   - Updated start scripts to include build step
   
4. **Platform Issues**
   - Fixed mac_install.sh line endings (CRLF to LF)

### Additions
- Debug configuration for VS Code
- Detailed SSO URL generation logging
- "Settings File" and "Logs" buttons in Settings form

## Current Branch Work
The "buy-me-coffee" branch has completed donation/support functionality:
- README.md includes Buy Me a Coffee button HTML ✅
- Created reusable BuyMeCoffeeButton component ✅
- Integrated button into main application header ✅
- External link handling via Electron implemented ✅

## Next Steps

### Immediate Tasks
1. ~~Complete Buy Me a Coffee integration~~ ✅ COMPLETED
   - ~~Add donation button to application UI~~ ✅
   - ~~Ensure proper external link handling~~ ✅
   - ~~Test donation flow~~ ✅

2. Version 1.0.8 Preparation
   - Update version numbers
   - Prepare release notes
   - Test on both macOS and Windows

### Known Issues to Address
1. Session management edge cases
2. Large account list performance
3. Auto-update functionality not implemented

### Feature Backlog (from v1.0.4 planning)
1. **Role Management Enhancements**
   - Custom role titles
   - Role tagging
   - Bulk operations

2. **Performance Optimization**
   - Faster account loading
   - Reduced memory usage
   - Improved startup time

3. **UI/UX Improvements**
   - Dark mode enhancements
   - Customizable dashboard
   - Keyboard shortcuts

## Active Decisions

### Architecture Decisions
- Using electron-store for settings (with caching layer)
- React Context for state management (not Redux)
- shadcn/ui for consistent component design

### Security Decisions
- All AWS operations in main process only
- No credential storage in renderer
- Browser-based SSO flow (no password handling)

### UX Decisions
- Three-tab layout (All, Favorites, Quick Access)
- Visual session warnings (yellow <2hr, red <1hr)
- One-click AWS Console access

## Development Notes

### Current Environment
- Node.js and npm installed
- AWS CLI v2 available (optional)
- Development on macOS (based on file paths)

### Active Debugging
- VS Code debug configuration available
- Electron inspector on port 5858
- Enhanced logging for SSO operations

### Testing Considerations
- Need to test Buy Me a Coffee integration
- Cross-platform testing required
- Session expiration scenarios
- Large account list performance

## Communication Context
- Organization: SensiAI (per user rules)
- Preference: GitHub MCP server over CLI commands
- AWS Regions: dev (eu-central-1), staging/prod (eu-west-1)
- Jira: Default project PBAT, component DevOps
