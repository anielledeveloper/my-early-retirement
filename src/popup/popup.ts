import { 
  AppState, 
  Investment, 
  UI_ELEMENTS, 
  STORAGE_KEYS,
  NOTIFICATION_CONFIG 
} from '../types/interfaces';
import './popup.css';
import {
  calculateEarningsPerSecond,
  calculateSavingsPerSecond,
  calculateTotalAccumulated,
  calculateProgressPercentage,
  calculateTimeRemaining,
  formatTimeRemaining,
  calculateEarningsByPeriod,
  calculateSavingsByPeriod,
  calculateEarningsToday,
  getStartOfDay,
  checkMilestone,
  formatCurrency,
  formatPercentage
} from '../utils/calculations';

/**
 * Main application class for the Financial Independence Chrome Extension
 */
class FinancialIndependenceApp {
  private state: AppState;
  private updateInterval: number | null = null;
  private lastSaveTime: number = 0;
  private saveThrottleMs: number = 5000; // Save at most every 5 seconds (local storage has no quota limits)

  constructor() {
    this.state = this.getInitialState();
    this.init();
    
    // Expose functions to window for debugging
    (window as any).resetExtensionStorage = () => this.resetAllStorage();
    (window as any).getExtensionQuotaInfo = () => this.getQuotaInfo();
    (window as any).manualSave = () => this.manualSave();
  }

  /**
   * Get initial application state
   */
  private getInitialState(): AppState {
    return {
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
      startOfDay: getStartOfDay(),
      lastNotificationPercentage: 0,
      termsAccepted: false,
      termsAcceptedDate: null,
      termsHash: null
    };
  }

  /**
   * Initialize the application
   */
  private async init(): Promise<void> {
    try {
      await this.loadState();
      this.setupEventListeners();
      this.setupTermsModal();
      this.renderInvestments();
      this.updateUI();
      this.startUpdateLoop();
      this.setupPageUnloadSave();
    } catch (error) {
      console.error('Failed to initialize app:', error);
    }
  }

  /**
   * Load state from Chrome storage
   */
  private async loadState(): Promise<void> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.APP_STATE);
      if (result[STORAGE_KEYS.APP_STATE]) {
        const savedState = result[STORAGE_KEYS.APP_STATE] as AppState;
        this.state = { ...this.getInitialState(), ...savedState };
        
        // Update start of day if it's a new day
        const currentStartOfDay = getStartOfDay();
        if (currentStartOfDay !== this.state.startOfDay) {
          this.state.startOfDay = currentStartOfDay;
        }
        
        console.log('State loaded from storage');
      } else {
        // No saved state found, use initial state with example investments
        this.state = this.getInitialState();
        console.log('No saved state found, using initial state with examples');
      }
    } catch (error) {
      console.error('Failed to load state:', error);
    }
  }

  /**
   * Save state to Chrome storage with throttling
   */
  private async saveState(force: boolean = false): Promise<void> {
    const now = Date.now();
    
    // Throttle saves to avoid quota limits (unless forced)
    if (!force && (now - this.lastSaveTime) < this.saveThrottleMs) {
      return;
    }
    
    try {
      await chrome.storage.local.set({
        [STORAGE_KEYS.APP_STATE]: this.state
      });
      this.lastSaveTime = now;
      console.log('State saved successfully');
    } catch (error) {
      console.error('Failed to save state:', error);
    }
  }


  /**
   * Setup event listeners for UI interactions
   */
  private setupEventListeners(): void {
    // Save data button
    const saveButton = document.getElementById(UI_ELEMENTS.SAVE_DATA);
    if (saveButton) {
      saveButton.addEventListener('click', () => this.handleSaveData());
    }

    // Reset data button
    const resetButton = document.getElementById(UI_ELEMENTS.RESET_DATA);
    if (resetButton) {
      resetButton.addEventListener('click', () => this.handleResetData());
    }

    // Add investment button
    const addButton = document.getElementById(UI_ELEMENTS.ADD_INVESTMENT);
    if (addButton) {
      addButton.addEventListener('click', () => this.addInvestment());
    }

    // Configuration inputs
    const goalInput = document.getElementById(UI_ELEMENTS.GOAL_AMOUNT) as HTMLInputElement;
    if (goalInput) {
      goalInput.addEventListener('input', () => this.handleConfigChange());
    }

    const inflationInput = document.getElementById(UI_ELEMENTS.INFLATION_RATE) as HTMLInputElement;
    if (inflationInput) {
      inflationInput.addEventListener('input', () => this.handleConfigChange());
    }

    const savingsInput = document.getElementById(UI_ELEMENTS.MONTHLY_SAVINGS) as HTMLInputElement;
    if (savingsInput) {
      savingsInput.addEventListener('input', () => this.handleConfigChange());
    }
  }

  /**
   * Generate a simple hash of the terms content for verification
   */
  private generateTermsHash(): string {
    const termsContent = `
      Esta extensão opera de forma completamente local e privada.
      Não coletamos dados pessoais: Não enviamos nenhuma informação para servidores externos
      Não salvamos dados financeiros externamente: Todos os dados ficam apenas no seu dispositivo
      Armazenamento local: Usamos apenas o armazenamento local do Chrome (chrome.storage.sync)
      Sem rastreamento: Não há coleta de dados de uso ou analytics
      Local apenas: Seus investimentos e metas ficam apenas no seu navegador
      Sem backup externo: Não fazemos backup em servidores externos
      Controle total: Você tem controle completo sobre seus dados
      Sem responsabilidade financeira: Não nos responsabilizamos por decisões financeiras
      Uso por sua conta e risco: Esta é uma ferramenta de acompanhamento, não aconselhamento
      Sem garantias: Não garantimos precisão dos cálculos
    `;
    
    // Simple hash function (for demonstration - in production you might want a more robust hash)
    let hash = 0;
    for (let i = 0; i < termsContent.length; i++) {
      const char = termsContent.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Setup terms modal functionality
   */
  private setupTermsModal(): void {
    const termsModal = document.getElementById(UI_ELEMENTS.TERMS_MODAL);
    const acceptCheckbox = document.getElementById(UI_ELEMENTS.TERMS_ACCEPT_CHECKBOX) as HTMLInputElement;
    const acceptButton = document.getElementById(UI_ELEMENTS.TERMS_ACCEPT_BUTTON);
    const rejectButton = document.getElementById(UI_ELEMENTS.TERMS_REJECT_BUTTON);
    const reviewButton = document.getElementById(UI_ELEMENTS.TERMS_REVIEW_BUTTON);

    // Show modal if terms not accepted
    if (!this.state.termsAccepted) {
      termsModal?.style.setProperty('display', 'flex');
      this.disableForms();
    } else {
      termsModal?.style.setProperty('display', 'none');
      this.enableForms();
    }

    // Checkbox change handler
    acceptCheckbox?.addEventListener('change', () => {
      if (acceptButton) {
        (acceptButton as HTMLButtonElement).disabled = !acceptCheckbox.checked;
      }
    });

    // Accept button handler
    acceptButton?.addEventListener('click', async () => {
      if (acceptCheckbox?.checked) {
        this.state.termsAccepted = true;
        this.state.termsAcceptedDate = new Date().toISOString();
        this.state.termsHash = this.generateTermsHash();
        await this.saveState(true); // Force save for terms acceptance
        termsModal?.style.setProperty('display', 'none');
        this.enableForms();
        this.updateTermsReviewButton();
      }
    });

    // Reject button handler
    rejectButton?.addEventListener('click', () => {
      this.state.termsAccepted = false;
      this.state.termsAcceptedDate = null;
      this.state.termsHash = null;
      termsModal?.style.setProperty('display', 'none');
      this.disableForms();
      this.updateTermsReviewButton();
    });

    // Review button handler
    reviewButton?.addEventListener('click', () => {
      termsModal?.style.setProperty('display', 'flex');
    });

    this.updateTermsReviewButton();
  }

  /**
   * Disable forms when terms not accepted
   */
  private disableForms(): void {
    const saveButton = document.getElementById(UI_ELEMENTS.SAVE_DATA) as HTMLButtonElement;
    const addButton = document.getElementById(UI_ELEMENTS.ADD_INVESTMENT) as HTMLButtonElement;
    const inputs = document.querySelectorAll('input[type="number"]') as NodeListOf<HTMLInputElement>;
    const progressSection = document.querySelector('.progress-section') as HTMLElement;

    if (saveButton) saveButton.disabled = true;
    if (addButton) addButton.disabled = true;
    inputs.forEach(input => input.disabled = true);
    if (progressSection) progressSection.classList.add('terms-not-accepted');
  }

  /**
   * Enable forms when terms accepted
   */
  private enableForms(): void {
    const saveButton = document.getElementById(UI_ELEMENTS.SAVE_DATA) as HTMLButtonElement;
    const addButton = document.getElementById(UI_ELEMENTS.ADD_INVESTMENT) as HTMLButtonElement;
    const inputs = document.querySelectorAll('input[type="number"]') as NodeListOf<HTMLInputElement>;
    const progressSection = document.querySelector('.progress-section') as HTMLElement;

    if (saveButton) saveButton.disabled = false;
    if (addButton) addButton.disabled = false;
    inputs.forEach(input => input.disabled = false);
    if (progressSection) progressSection.classList.remove('terms-not-accepted');
  }

  /**
   * Update terms review button visibility
   */
  private updateTermsReviewButton(): void {
    const reviewButton = document.getElementById(UI_ELEMENTS.TERMS_REVIEW_BUTTON);
    if (reviewButton) {
      reviewButton.style.display = this.state.termsAccepted ? 'none' : 'block';
    }
  }



  /**
   * Reset all storage data (for debugging quota issues)
   */
  private async resetAllStorage(): Promise<void> {
    try {
      console.log('Resetting all storage data...');
      await chrome.storage.local.clear();
      
      // Reset state to initial values
      this.state = this.getInitialState();
      
      // Reset throttle times
      this.saveThrottleMs = 5000; // 5 seconds (local storage has no quota limits)
      this.lastSaveTime = 0;
      
      console.log('All storage data reset successfully');
      alert('Storage reset complete! Extension quota has been cleared.');
    } catch (error) {
      console.error('Failed to reset storage:', error);
      alert('Failed to reset storage. Please try removing and reinstalling the extension.');
    }
  }

  /**
   * Get quota information for debugging
   */
  private async getQuotaInfo(): Promise<void> {
    try {
      const localQuota = await chrome.storage.local.getBytesInUse();
      
      console.log('=== Extension Storage Information ===');
      console.log('Extension ID:', chrome.runtime.id);
      console.log('Local Storage Used:', localQuota, 'bytes');
      console.log('Current Throttle Times:');
      console.log('  - Save Throttle:', this.saveThrottleMs, 'ms');
      console.log('Last Save Time:');
      console.log('  - Last Save:', new Date(this.lastSaveTime).toLocaleString());
      console.log('===================================');
    } catch (error) {
      console.error('Failed to get quota info:', error);
    }
  }

  /**
   * Manual save function for debugging and user control
   */
  private async manualSave(): Promise<void> {
    try {
      console.log('Manual save requested...');
      await this.saveState(true); // Force save
      console.log('Manual save completed successfully');
      alert('Data saved successfully!');
    } catch (error) {
      console.error('Manual save failed:', error);
      alert('Failed to save data. Check console for details.');
    }
  }

  /**
   * Setup save on page unload to preserve data
   */
  private setupPageUnloadSave(): void {
    // Save data when page is about to unload
    window.addEventListener('beforeunload', () => {
      // Use synchronous storage for beforeunload
      try {
        chrome.storage.local.set({
          [STORAGE_KEYS.APP_STATE]: this.state
        });
        console.log('Data saved on page unload');
      } catch (error) {
        console.error('Failed to save on page unload:', error);
      }
    });

    // Also save when page becomes hidden (tab switch, minimize, etc.)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.saveState(true).catch(error => {
          console.error('Failed to save on visibility change:', error);
        });
      }
    });
  }

  /**
   * Handle save data action
   */
  private async handleSaveData(): Promise<void> {
    try {
      this.validateInputs();
      this.rebuildInvestmentsFromUI();
      this.recalculateTotalInvested();
      await this.saveState(true); // Force save for user action
      this.showSuccessFeedback();
      this.scrollToTop();
    } catch (error) {
      console.error('Failed to save data:', error);
      alert('Erro ao salvar dados. Verifique os valores inseridos.');
    }
  }

  /**
   * Handle reset data action
   */
  private async handleResetData(): Promise<void> {
    const confirmed = confirm('Tem certeza que deseja resetar todos os dados? Esta ação não pode ser desfeita.');
    if (confirmed) {
      try {
        await chrome.storage.sync.clear();
        this.state = this.getInitialState();
        this.renderInvestments();
        this.updateUI();
        this.clearUI();
      } catch (error) {
        console.error('Failed to reset data:', error);
      }
    }
  }

  /**
   * Handle configuration changes
   */
  private handleConfigChange(): void {
    const goalInput = document.getElementById(UI_ELEMENTS.GOAL_AMOUNT) as HTMLInputElement;
    const inflationInput = document.getElementById(UI_ELEMENTS.INFLATION_RATE) as HTMLInputElement;
    const savingsInput = document.getElementById(UI_ELEMENTS.MONTHLY_SAVINGS) as HTMLInputElement;

    if (goalInput) this.state.goalAmount = parseFloat(goalInput.value) || 0;
    if (inflationInput) this.state.inflationRate = parseFloat(inflationInput.value) || 0;
    if (savingsInput) this.state.monthlySavings = parseFloat(savingsInput.value) || 0;

    this.updateUI();
  }

  /**
   * Add a new investment
   */
  private addInvestment(): void {
    const newInvestment: Investment = {
      initialAmount: 0,
      currentAmount: 0,
      rate: 0,
      earningsPerSecond: 0
    };

    this.state.investments.push(newInvestment);
    this.renderInvestments();
    this.updateUI();
  }

  /**
   * Remove an investment
   */
  private removeInvestment(index: number): void {
    this.state.investments.splice(index, 1);
    this.renderInvestments();
    this.updateUI();
  }

  /**
   * Render investments in the UI
   */
  private renderInvestments(): void {
    const container = document.getElementById(UI_ELEMENTS.INVESTMENTS_CONTAINER);
    if (!container) return;

    container.innerHTML = '';

    this.state.investments.forEach((investment, index) => {
      const investmentElement = this.createInvestmentElement(investment, index);
      container.appendChild(investmentElement);
    });
  }

  /**
   * Create investment element
   */
  private createInvestmentElement(investment: Investment, index: number): HTMLElement {
    const div = document.createElement('div');
    div.className = 'investment-item';
    div.innerHTML = `
      <div>
        <label>Valor Aplicado (R$)</label>
        <input type="number" 
               class="investment-amount" 
               data-index="${index}" 
               value="${investment.initialAmount}" 
               placeholder="10000" 
               min="0" 
               step="0.01"
               ${investment.initialAmount > 0 ? 'disabled' : ''}>
      </div>
      <div>
        <label>Rentabilidade (% a.a.)</label>
        <input type="number" 
               class="investment-rate" 
               data-index="${index}" 
               value="${investment.rate}" 
               placeholder="13.2" 
               min="0" 
               step="0.01">
      </div>
      <button class="btn btn-danger btn-small remove-investment" data-index="${index}">
        Remover
      </button>
    `;

    // Add event listeners
    const amountInput = div.querySelector('.investment-amount') as HTMLInputElement;
    const rateInput = div.querySelector('.investment-rate') as HTMLInputElement;
    const removeButton = div.querySelector('.remove-investment') as HTMLButtonElement;

    if (amountInput) {
      amountInput.addEventListener('input', () => this.handleInvestmentChange(index));
    }

    if (rateInput) {
      rateInput.addEventListener('input', () => this.handleInvestmentChange(index));
    }

    if (removeButton) {
      removeButton.addEventListener('click', () => this.removeInvestment(index));
    }

    return div;
  }

  /**
   * Handle investment input changes
   */
  private handleInvestmentChange(index: number): void {
    const amountInput = document.querySelector(`.investment-amount[data-index="${index}"]`) as HTMLInputElement;
    const rateInput = document.querySelector(`.investment-rate[data-index="${index}"]`) as HTMLInputElement;

    if (amountInput && rateInput) {
      const amount = parseFloat(amountInput.value) || 0;
      const rate = parseFloat(rateInput.value) || 0;

      if (this.state.investments[index]) {
        this.state.investments[index].initialAmount = amount;
        this.state.investments[index].currentAmount = amount;
        this.state.investments[index].rate = rate;
      }

      this.updateUI();
    }
  }

  /**
   * Rebuild investments from UI
   */
  private rebuildInvestmentsFromUI(): void {
    const amountInputs = document.querySelectorAll('.investment-amount') as NodeListOf<HTMLInputElement>;
    const rateInputs = document.querySelectorAll('.investment-rate') as NodeListOf<HTMLInputElement>;

    this.state.investments = [];

    amountInputs.forEach((amountInput, index) => {
      const rateInput = rateInputs[index];
      if (amountInput && rateInput) {
        const amount = parseFloat(amountInput.value) || 0;
        const rate = parseFloat(rateInput.value) || 0;

        if (amount > 0 && rate > 0) {
          this.state.investments.push({
            initialAmount: amount,
            currentAmount: amount,
            rate: rate,
            earningsPerSecond: 0
          });
        }
      }
    });
  }

  /**
   * Recalculate total invested
   */
  private recalculateTotalInvested(): void {
    this.state.totalInvested = this.state.investments.reduce(
      (total, investment) => total + investment.initialAmount, 
      0
    );
  }

  /**
   * Validate all inputs
   */
  private validateInputs(): void {
    const goalAmount = this.state.goalAmount;
    const inflationRate = this.state.inflationRate;
    const monthlySavings = this.state.monthlySavings;

    if (goalAmount <= 0) {
      throw new Error('Valor da meta deve ser maior que zero');
    }

    if (inflationRate < 0) {
      throw new Error('Taxa de inflação não pode ser negativa');
    }

    if (monthlySavings < 0) {
      throw new Error('Valor poupado por mês não pode ser negativo');
    }

    if (this.state.investments.length === 0) {
      throw new Error('Adicione pelo menos um investimento');
    }

    this.state.investments.forEach((investment, index) => {
      if (investment.initialAmount <= 0) {
        throw new Error(`Investimento ${index + 1}: Valor aplicado deve ser maior que zero`);
      }
      if (investment.rate <= 0) {
        throw new Error(`Investimento ${index + 1}: Rentabilidade deve ser maior que zero`);
      }
    });
  }

  /**
   * Start the 1-second update loop
   */
  private startUpdateLoop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.updateInterval = window.setInterval(() => {
      this.updateCalculations();
      this.updateUI();
      this.saveState(); // Re-enabled automatic saving (local storage has no quota limits)
    }, 1000);
  }

  /**
   * Update all calculations
   */
  private updateCalculations(): void {
    const savingsPerSecond = calculateSavingsPerSecond(this.state.monthlySavings);
    const savingsPerInvestment = this.state.investments.length > 0 
      ? savingsPerSecond / this.state.investments.length 
      : 0;

    this.state.investments.forEach(investment => {
      // Calculate real earnings per second
      investment.earningsPerSecond = calculateEarningsPerSecond(
        investment.currentAmount,
        investment.rate,
        this.state.inflationRate
      );

      // Update current amount with compound interest
      investment.currentAmount += investment.earningsPerSecond;

      // Add proportional savings
      investment.currentAmount += savingsPerInvestment;
    });

    // Check for milestone notifications
    this.checkMilestoneNotifications();
  }

  /**
   * Check and send milestone notifications
   */
  private checkMilestoneNotifications(): void {
    const totalAccumulated = calculateTotalAccumulated(this.state.investments);
    const progressPercentage = calculateProgressPercentage(totalAccumulated, this.state.goalAmount);
    
    const { hasNewMilestone, newMilestone } = checkMilestone(
      progressPercentage,
      this.state.lastNotificationPercentage
    );

    if (hasNewMilestone) {
      this.sendMilestoneNotification(newMilestone);
      this.state.lastNotificationPercentage = newMilestone;
    }
  }

  /**
   * Send milestone notification
   */
  private async sendMilestoneNotification(milestone: number): Promise<void> {
    try {
      await chrome.notifications.create({
        type: NOTIFICATION_CONFIG.NOTIFICATION_TYPE,
        iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        title: 'My Financial Independency',
        message: `Parabéns! Você atingiu ${milestone}% da sua meta de independência financeira!`
      });
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }

  /**
   * Update the UI with current state
   */
  private updateUI(): void {
    this.updateConfigurationInputs();
    this.updateMainDisplays();
    this.updateEarningsDisplays();
    this.updateSavingsDisplays();
  }

  /**
   * Update configuration inputs
   */
  private updateConfigurationInputs(): void {
    const goalInput = document.getElementById(UI_ELEMENTS.GOAL_AMOUNT) as HTMLInputElement;
    const inflationInput = document.getElementById(UI_ELEMENTS.INFLATION_RATE) as HTMLInputElement;
    const savingsInput = document.getElementById(UI_ELEMENTS.MONTHLY_SAVINGS) as HTMLInputElement;

    if (goalInput) goalInput.value = this.state.goalAmount.toString();
    if (inflationInput) inflationInput.value = this.state.inflationRate.toString();
    if (savingsInput) savingsInput.value = this.state.monthlySavings.toString();
  }

  /**
   * Update main displays
   */
  private updateMainDisplays(): void {
    const totalAccumulated = calculateTotalAccumulated(this.state.investments);
    const progressPercentage = calculateProgressPercentage(totalAccumulated, this.state.goalAmount);
    const totalEarningsPerSecond = this.state.investments.reduce(
      (total, investment) => total + investment.earningsPerSecond, 
      0
    );
    const savingsPerSecond = calculateSavingsPerSecond(this.state.monthlySavings);
    const timeRemaining = calculateTimeRemaining(
      this.state.goalAmount,
      totalAccumulated,
      totalEarningsPerSecond,
      savingsPerSecond
    );
    const earningsToday = calculateEarningsToday(totalEarningsPerSecond, this.state.startOfDay);

    // Update current amount
    const currentAmountElement = document.getElementById(UI_ELEMENTS.CURRENT_AMOUNT);
    if (currentAmountElement) {
      currentAmountElement.textContent = formatCurrency(totalAccumulated, 4);
    }

    // Update progress bar and percentage
    const progressBar = document.getElementById(UI_ELEMENTS.PROGRESS_BAR);
    const progressPercentageElement = document.getElementById(UI_ELEMENTS.PROGRESS_PERCENTAGE);
    
    if (progressBar) {
      progressBar.style.width = `${Math.min(progressPercentage, 100)}%`;
    }
    
    if (progressPercentageElement) {
      progressPercentageElement.textContent = formatPercentage(progressPercentage, 5);
    }

    // Update time remaining
    const timeRemainingElement = document.getElementById(UI_ELEMENTS.TIME_REMAINING);
    if (timeRemainingElement) {
      timeRemainingElement.textContent = formatTimeRemaining(timeRemaining);
    }

    // Update earnings today
    const earningsTodayElement = document.getElementById(UI_ELEMENTS.EARNINGS_TODAY);
    if (earningsTodayElement) {
      earningsTodayElement.textContent = formatCurrency(earningsToday, 4);
    }
  }

  /**
   * Update earnings displays
   */
  private updateEarningsDisplays(): void {
    const totalEarningsPerSecond = this.state.investments.reduce(
      (total, investment) => total + investment.earningsPerSecond, 
      0
    );

    const earnings = calculateEarningsByPeriod(totalEarningsPerSecond);

    const elements = [
      { id: UI_ELEMENTS.EARNINGS_PER_SECOND, value: earnings.perSecond },
      { id: UI_ELEMENTS.EARNINGS_PER_MINUTE, value: earnings.perMinute },
      { id: UI_ELEMENTS.EARNINGS_PER_DAY, value: earnings.perDay },
      { id: UI_ELEMENTS.EARNINGS_PER_WEEK, value: earnings.perWeek },
      { id: UI_ELEMENTS.EARNINGS_PER_MONTH, value: earnings.perMonth },
      { id: UI_ELEMENTS.EARNINGS_PER_YEAR, value: earnings.perYear }
    ];

    elements.forEach(({ id, value }) => {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = formatCurrency(value, 4);
      }
    });
  }

  /**
   * Update savings displays
   */
  private updateSavingsDisplays(): void {
    const savings = calculateSavingsByPeriod(this.state.monthlySavings);

    const savingsPerMonthElement = document.getElementById(UI_ELEMENTS.SAVINGS_PER_MONTH);
    const savingsPerYearElement = document.getElementById(UI_ELEMENTS.SAVINGS_PER_YEAR);

    if (savingsPerMonthElement) {
      savingsPerMonthElement.textContent = formatCurrency(savings.perMonth, 2);
    }

    if (savingsPerYearElement) {
      savingsPerYearElement.textContent = formatCurrency(savings.perYear, 2);
    }
  }

  /**
   * Clear the UI
   */
  private clearUI(): void {
    const container = document.getElementById(UI_ELEMENTS.INVESTMENTS_CONTAINER);
    if (container) {
      container.innerHTML = '';
    }
  }

  /**
   * Show success feedback
   */
  private showSuccessFeedback(): void {
    const feedback = document.createElement('div');
    feedback.className = 'success-feedback';
    feedback.textContent = 'Dados salvos com sucesso!';
    
    document.body.appendChild(feedback);
    
    setTimeout(() => {
      document.body.removeChild(feedback);
    }, 3000);
  }

  /**
   * Scroll to top of popup
   */
  private scrollToTop(): void {
    window.scrollTo(0, 0);
  }

  /**
   * Cleanup when popup is closed
   */
  public destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new FinancialIndependenceApp();
});

// Cleanup when popup is closed
window.addEventListener('beforeunload', () => {
  // Cleanup will be handled by the app instance
});
