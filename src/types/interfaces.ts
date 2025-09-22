/**
 * Investment interface representing a single investment
 */
export interface Investment {
  /** The initial amount invested */
  initialAmount: number;
  /** The current value including compounded interest and savings */
  currentAmount: number;
  /** The nominal annual interest rate (e.g., 13.2 for 13.2%) */
  rate: number;
  /** The calculated real earnings per second for this investment */
  earningsPerSecond: number;
}

/**
 * Main application state interface
 */
export interface AppState {
  /** Array of all investments */
  investments: Investment[];
  /** The user's financial target */
  goalAmount: number;
  /** The annual inflation rate provided by the user */
  inflationRate: number;
  /** The fixed amount the user saves each month */
  monthlySavings: number;
  /** The sum of all initialAmount properties from investments */
  totalInvested: number;
  /** Timestamp representing the beginning of the current day (00:00:00) */
  startOfDay: number;
  /** The last 5% milestone for which a notification was sent */
  lastNotificationPercentage: number;
  /** Whether the user has accepted the terms and conditions */
  termsAccepted: boolean;
  /** The date when terms were accepted (ISO string) */
  termsAcceptedDate: string | null;
  /** Hash of the terms content for verification */
  termsHash: string | null;
}

/**
 * Constants for calculations
 */
export const CALCULATION_CONSTANTS = {
  /** Seconds in a year */
  SECONDS_IN_YEAR: 365.25 * 24 * 60 * 60,
  /** Seconds in a day */
  SECONDS_IN_DAY: 24 * 60 * 60,
  /** Seconds in an hour */
  SECONDS_IN_HOUR: 60 * 60,
  /** Seconds in a minute */
  SECONDS_IN_MINUTE: 60,
  /** Days in a month (average) */
  DAYS_IN_MONTH: 30,
  /** Hours in a day */
  HOURS_IN_DAY: 24,
  /** Minutes in an hour */
  MINUTES_IN_HOUR: 60
} as const;

/**
 * UI element IDs for easy reference
 */
export const UI_ELEMENTS = {
  // Main displays
  CURRENT_AMOUNT: 'current-amount',
  PROGRESS_BAR: 'progress-bar',
  PROGRESS_PERCENTAGE: 'progress-percentage',
  TIME_REMAINING: 'time-remaining',
  EARNINGS_TODAY: 'earnings-today',
  
  // Earnings per time period
  EARNINGS_PER_SECOND: 'earnings-per-second',
  EARNINGS_PER_MINUTE: 'earnings-per-minute',
  EARNINGS_PER_DAY: 'earnings-per-day',
  EARNINGS_PER_WEEK: 'earnings-per-week',
  EARNINGS_PER_MONTH: 'earnings-per-month',
  EARNINGS_PER_YEAR: 'earnings-per-year',
  
  // Savings displays
  SAVINGS_PER_MONTH: 'savings-per-month',
  SAVINGS_PER_YEAR: 'savings-per-year',
  
  // User inputs
  GOAL_AMOUNT: 'goal-amount',
  INFLATION_RATE: 'inflation-rate',
  MONTHLY_SAVINGS: 'monthly-savings',
  
  // Buttons
  SAVE_DATA: 'save-data',
  RESET_DATA: 'reset-data',
  ADD_INVESTMENT: 'add-investment',
  
  // Investment container
  INVESTMENTS_CONTAINER: 'investments-container',
  
  // Explanations
  EXPLANATION: 'explanation',
  RENTABILITY_EXPLANATION: 'rentability-explanation',
  
  // Terms modal
  TERMS_MODAL: 'terms-modal',
  TERMS_ACCEPT_CHECKBOX: 'terms-accept-checkbox',
  TERMS_ACCEPT_BUTTON: 'terms-accept-button',
  TERMS_REJECT_BUTTON: 'terms-reject-button',
  TERMS_REVIEW_BUTTON: 'terms-review-button'
} as const;

/**
 * Storage keys for Chrome storage
 */
export const STORAGE_KEYS = {
  APP_STATE: 'appState',
  SETTINGS: 'settings'
} as const;

/**
 * Notification configuration
 */
export const NOTIFICATION_CONFIG = {
  MILESTONE_INTERVAL: 5, // 5% milestones
  NOTIFICATION_TYPE: 'basic' as const,
  ICON_URL: undefined // Remove icon to avoid download issues
} as const;
