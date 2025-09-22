# Changelog

All notable changes to the My Financial Independency Chrome Extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-09-02

### Added
- Initial release of My Financial Independency Chrome Extension
- MV3 manifest with service worker support
- Real-time compound interest calculations with 1-second updates
- Multiple investment tracking with individual rates
- Inflation-adjusted real rate calculations
- Progress tracking towards financial independence goal
- Time remaining estimation with intelligent formatting
- 5% milestone notifications system
- Modern financial dashboard UI with Flat UI Colors palette
- Chrome local storage for device-only data persistence
- Professional progress bar with gradient styling
- Comprehensive earnings breakdown by time periods
- Savings tracking separate from investment earnings
- Data validation and error handling
- Success feedback animations
- Collapsible explanation sections

### Technical Features
- TypeScript with strict type checking
- Webpack build system for development and production
- Chrome local storage management for device-only data
- Background service worker for notifications
- Chrome notifications API integration
- Chrome alarms API for milestone tracking
- Responsive design with CSS Grid/Flexbox
- Accessibility compliance (ARIA, keyboard navigation)
- Real-time calculation engine with compound interest
- Mathematical precision for financial calculations
- Cross-platform compatibility

### UI/UX Features
- Modern financial dashboard design
- Real-time progress visualization
- Professional color scheme (Flat UI Colors)
- Roboto font integration for readability
- Pill-shaped buttons with hover effects
- Rounded input fields with focus states
- Gradient progress bar with smooth animations
- Mobile-responsive layout
- Intuitive investment management
- Success feedback with visual animations
- Collapsible help sections

### Financial Features
- **Real Rate Calculation**: `[(1 + nominalRate) / (1 + inflationRate)] - 1`
- **Compound Interest**: Updates every second with mathematical precision
- **Multiple Investments**: Track unlimited investment accounts
- **Savings Integration**: Monthly savings distributed across investments
- **Progress Tracking**: Visual progress bar and percentage display
- **Time Estimation**: Intelligent time remaining calculation
- **Milestone Notifications**: 5% progress milestone alerts
- **Earnings Breakdown**: Detailed earnings by second, minute, hour, day, week, month, year
- **Today's Earnings**: Real-time earnings since start of day
- **Data Persistence**: Automatic save every second

## [Unreleased]

### Planned
- **Investment Categories**: Categorize investments by type (stocks, bonds, real estate, etc.)
- **Historical Charts**: Visual charts showing progress over time
- **Export Functionality**: Export data to CSV/Excel for external analysis
