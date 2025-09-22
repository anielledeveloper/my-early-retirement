import { AppState, STORAGE_KEYS, NOTIFICATION_CONFIG } from '../types/interfaces';

/**
 * Background service worker for the Financial Independence Chrome Extension
 * Handles notifications, alarms, and background tasks
 */
class BackgroundService {
  constructor() {
    this.init();
  }

  /**
   * Initialize the background service
   */
  private async init(): Promise<void> {
    try {
      this.setupEventListeners();
      console.log('Background service initialized');
    } catch (error) {
      console.error('Failed to initialize background service:', error);
    }
  }

  /**
   * Setup event listeners for Chrome extension events
   */
  private setupEventListeners(): void {
    // Handle extension installation
    chrome.runtime.onInstalled.addListener((details) => {
      this.handleInstallation(details);
    });

    // Handle extension startup
    chrome.runtime.onStartup.addListener(() => {
      this.handleStartup();
    });

    // Handle action clicks (extension icon clicks)
    chrome.action.onClicked.addListener(() => {
      this.handleActionClick();
    });

    // Handle alarm events for notifications
    chrome.alarms.onAlarm.addListener((alarm) => {
      this.handleAlarm(alarm);
    });

    // Handle notification clicks
    chrome.notifications.onClicked.addListener((notificationId) => {
      this.handleNotificationClick(notificationId);
    });

    // Handle storage changes
    chrome.storage.onChanged.addListener((changes, namespace) => {
      this.handleStorageChange(changes, namespace);
    });
  }

  /**
   * Handle extension installation
   */
  private async handleInstallation(details: chrome.runtime.InstalledDetails): Promise<void> {
    console.log('Extension installed:', details.reason);

    if (details.reason === 'install') {
      // First time installation
      await this.setupInitialState();
      await this.showWelcomeNotification();
    } else if (details.reason === 'update') {
      // Extension update
      await this.handleUpdate(details.previousVersion);
    }
  }

  /**
   * Handle extension startup
   */
  private async handleStartup(): Promise<void> {
    console.log('Extension started');
    await this.restoreState();
  }

  /**
   * Handle action click (extension icon click)
   */
  private async handleActionClick(): Promise<void> {
    try {
      // Request notification permission during user gesture
      await this.requestNotificationPermission();
      
      // Open the extension in a new tab
      await chrome.tabs.create({
        url: chrome.runtime.getURL('popup.html')
      });
      console.log('Extension opened in new tab');
    } catch (error) {
      console.error('Failed to open extension in new tab:', error);
    }
  }

  /**
   * Setup initial state for new installations
   */
  private async setupInitialState(): Promise<void> {
    const initialState: AppState = {
      investments: [
        {
          initialAmount: 50000,
          currentAmount: 50000,
          rate: 12.0,
          earningsPerSecond: 0
        },
        {
          initialAmount: 30000,
          currentAmount: 30000,
          rate: 8.5,
          earningsPerSecond: 0
        }
      ],
      goalAmount: 1000000,
      inflationRate: 4.5,
      monthlySavings: 5000,
      totalInvested: 80000,
      startOfDay: this.getStartOfDay(),
      lastNotificationPercentage: 0,
      termsAccepted: false,
      termsAcceptedDate: null,
      termsHash: null
    };

    try {
      await chrome.storage.local.set({
        [STORAGE_KEYS.APP_STATE]: initialState
      });
      console.log('Initial state set');
    } catch (error) {
      console.error('Failed to set initial state:', error);
    }
  }

  /**
   * Handle extension update
   */
  private async handleUpdate(previousVersion?: string): Promise<void> {
    console.log('Extension updated from version:', previousVersion || 'unknown');
    
    // Perform any necessary data migrations here
    await this.migrateData(previousVersion);
  }

  /**
   * Migrate data between versions
   */
  private async migrateData(previousVersion?: string): Promise<void> {
    try {
      console.log('Migrating data from version:', previousVersion || 'unknown');
      
      const result = await chrome.storage.local.get(STORAGE_KEYS.APP_STATE);
      const currentState = result[STORAGE_KEYS.APP_STATE] as AppState;

      if (currentState) {
        // Add any new properties that might be missing
        const migratedState: AppState = {
          investments: currentState.investments || [],
          goalAmount: currentState.goalAmount || 1000000,
          inflationRate: currentState.inflationRate || 4.5,
          monthlySavings: currentState.monthlySavings || 5000,
          totalInvested: currentState.totalInvested || 0,
          startOfDay: currentState.startOfDay || this.getStartOfDay(),
          lastNotificationPercentage: currentState.lastNotificationPercentage || 0,
          termsAccepted: currentState.termsAccepted || false,
          termsAcceptedDate: currentState.termsAcceptedDate || null,
          termsHash: currentState.termsHash || null
        };

        await chrome.storage.local.set({
          [STORAGE_KEYS.APP_STATE]: migratedState
        });

        console.log('Data migration completed');
      }
    } catch (error) {
      console.error('Failed to migrate data:', error);
    }
  }

  /**
   * Restore state on startup
   */
  private async restoreState(): Promise<void> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.APP_STATE);
      if (result[STORAGE_KEYS.APP_STATE]) {
        const state = result[STORAGE_KEYS.APP_STATE] as AppState;
        
        // Update start of day if it's a new day
        const currentStartOfDay = this.getStartOfDay();
        if (currentStartOfDay !== state.startOfDay) {
          state.startOfDay = currentStartOfDay;
          await chrome.storage.local.set({
            [STORAGE_KEYS.APP_STATE]: state
          });
        }
        
        console.log('State restored');
      }
    } catch (error) {
      console.error('Failed to restore state:', error);
    }
  }

  /**
   * Request notification permission
   */
  private async requestNotificationPermission(): Promise<void> {
    try {
      const permission = await chrome.permissions.request({
        permissions: ['notifications']
      });

      if (permission) {
        console.log('Notification permission granted');
      } else {
        console.log('Notification permission denied');
      }
    } catch (error) {
      console.error('Failed to request notification permission:', error);
    }
  }

  /**
   * Handle alarm events
   */
  private async handleAlarm(alarm: chrome.alarms.Alarm): Promise<void> {
    console.log('Alarm triggered:', alarm.name);

    switch (alarm.name) {
      case 'milestone-notification':
        await this.sendMilestoneNotification();
        break;
      case 'daily-reminder':
        await this.sendDailyReminder();
        break;
      default:
        console.log('Unknown alarm:', alarm.name);
    }
  }

  /**
   * Handle notification clicks
   */
  private async handleNotificationClick(notificationId: string): Promise<void> {
    console.log('Notification clicked:', notificationId);
    
    // Clear the notification
    await chrome.notifications.clear(notificationId);
  }

  /**
   * Handle storage changes
   */
  private handleStorageChange(
    changes: { [key: string]: chrome.storage.StorageChange }, 
    namespace: string
  ): void {
    if (namespace === 'sync' && changes[STORAGE_KEYS.APP_STATE]) {
      console.log('App state changed in storage');
      // Handle state changes if needed
    }
  }

  /**
   * Send milestone notification
   */
  private async sendMilestoneNotification(): Promise<void> {
    try {
      await chrome.notifications.create({
        type: NOTIFICATION_CONFIG.NOTIFICATION_TYPE,
        iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        title: 'My Financial Independency',
        message: 'Parabéns! Você atingiu um novo marco na sua jornada para a independência financeira!'
      });
    } catch (error) {
      console.error('Failed to send milestone notification:', error);
    }
  }

  /**
   * Send daily reminder
   */
  private async sendDailyReminder(): Promise<void> {
    try {
      await chrome.notifications.create({
        type: NOTIFICATION_CONFIG.NOTIFICATION_TYPE,
        iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        title: 'My Financial Independency',
        message: 'Que tal verificar seu progresso hoje? Cada dia conta na sua jornada para a independência financeira!'
      });
    } catch (error) {
      console.error('Failed to send daily reminder:', error);
    }
  }

  /**
   * Show welcome notification for new users
   */
  private async showWelcomeNotification(): Promise<void> {
    try {
      await chrome.notifications.create({
        type: NOTIFICATION_CONFIG.NOTIFICATION_TYPE,
        iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        title: 'Bem-vindo ao My Financial Independency!',
        message: 'Configure seus investimentos e comece a acompanhar seu progresso em tempo real!'
      });
    } catch (error) {
      console.error('Failed to show welcome notification:', error);
    }
  }

  /**
   * Get start of current day timestamp
   */
  private getStartOfDay(): number {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return startOfDay.getTime();
  }

  /**
   * Schedule daily reminder
   */
  public async scheduleDailyReminder(hour: number = 9): Promise<void> {
    try {
      // Clear existing daily reminder
      await chrome.alarms.clear('daily-reminder');

      // Calculate next reminder time
      const now = new Date();
      const reminderTime = new Date();
      reminderTime.setHours(hour, 0, 0, 0);

      // If the time has passed today, schedule for tomorrow
      if (reminderTime <= now) {
        reminderTime.setDate(reminderTime.getDate() + 1);
      }

      // Schedule the alarm
      await chrome.alarms.create('daily-reminder', {
        when: reminderTime.getTime(),
        periodInMinutes: 24 * 60 // Daily
      });

      console.log('Daily reminder scheduled for:', reminderTime);
    } catch (error) {
      console.error('Failed to schedule daily reminder:', error);
    }
  }

  /**
   * Cancel daily reminder
   */
  public async cancelDailyReminder(): Promise<void> {
    try {
      await chrome.alarms.clear('daily-reminder');
      console.log('Daily reminder cancelled');
    } catch (error) {
      console.error('Failed to cancel daily reminder:', error);
    }
  }
}

// Initialize the background service
new BackgroundService();

// Export for potential use in other contexts
export default BackgroundService;
