import { Investment, CALCULATION_CONSTANTS } from '../types/interfaces';

/**
 * Calculate the real annual rate adjusted for inflation
 * Formula: [(1 + nominalRate) / (1 + inflationRate)] - 1
 */
export function calculateRealRate(nominalRate: number, inflationRate: number): number {
  const nominalDecimal = nominalRate / 100;
  const inflationDecimal = inflationRate / 100;
  return ((1 + nominalDecimal) / (1 + inflationDecimal)) - 1;
}

/**
 * Calculate real earnings per second for an investment
 * Formula: currentAmount * realRate / (seconds in a year)
 */
export function calculateEarningsPerSecond(
  currentAmount: number, 
  nominalRate: number, 
  inflationRate: number
): number {
  const realRate = calculateRealRate(nominalRate, inflationRate);
  return (currentAmount * realRate) / CALCULATION_CONSTANTS.SECONDS_IN_YEAR;
}

/**
 * Calculate savings per second from monthly savings
 * Formula: monthlySavings / (30 * 24 * 60 * 60)
 */
export function calculateSavingsPerSecond(monthlySavings: number): number {
  return monthlySavings / (CALCULATION_CONSTANTS.DAYS_IN_MONTH * CALCULATION_CONSTANTS.SECONDS_IN_DAY);
}

/**
 * Calculate total accumulated amount from all investments
 */
export function calculateTotalAccumulated(investments: Investment[]): number {
  return investments.reduce((total, investment) => total + investment.currentAmount, 0);
}

/**
 * Calculate progress percentage towards goal
 * Formula: (Total Accumulated / Goal) * 100
 */
export function calculateProgressPercentage(totalAccumulated: number, goalAmount: number): number {
  if (goalAmount <= 0) return 0;
  return Math.min((totalAccumulated / goalAmount) * 100, 100);
}

/**
 * Calculate time remaining to reach goal
 * Formula: (goalAmount - totalCurrentAmount) / (totalInvestmentEarningsPerSecond + savingsPerSecond)
 */
export function calculateTimeRemaining(
  goalAmount: number,
  totalCurrentAmount: number,
  totalEarningsPerSecond: number,
  savingsPerSecond: number
): number {
  const remainingAmount = goalAmount - totalCurrentAmount;
  const totalGrowthPerSecond = totalEarningsPerSecond + savingsPerSecond;
  
  if (totalGrowthPerSecond <= 0) return Infinity;
  return remainingAmount / totalGrowthPerSecond;
}

/**
 * Format time remaining into human-readable string
 * Shows years, days, hours, minutes, seconds (omits zero values)
 */
export function formatTimeRemaining(seconds: number): string {
  if (seconds === Infinity || seconds < 0) return '∞';
  
  const years = Math.floor(seconds / (CALCULATION_CONSTANTS.SECONDS_IN_YEAR));
  const days = Math.floor((seconds % CALCULATION_CONSTANTS.SECONDS_IN_YEAR) / CALCULATION_CONSTANTS.SECONDS_IN_DAY);
  const hours = Math.floor((seconds % CALCULATION_CONSTANTS.SECONDS_IN_DAY) / CALCULATION_CONSTANTS.SECONDS_IN_HOUR);
  const minutes = Math.floor((seconds % CALCULATION_CONSTANTS.SECONDS_IN_HOUR) / CALCULATION_CONSTANTS.SECONDS_IN_MINUTE);
  const secs = Math.floor(seconds % CALCULATION_CONSTANTS.SECONDS_IN_MINUTE);
  
  const parts: string[] = [];
  
  if (years > 0) parts.push(`${years}a`);
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0) parts.push(`${secs}s`);
  
  return parts.length > 0 ? parts.join(' ') : '0s';
}

/**
 * Calculate earnings for different time periods
 */
export function calculateEarningsByPeriod(earningsPerSecond: number) {
  return {
    perSecond: earningsPerSecond,
    perMinute: earningsPerSecond * CALCULATION_CONSTANTS.SECONDS_IN_MINUTE,
    perHour: earningsPerSecond * CALCULATION_CONSTANTS.SECONDS_IN_HOUR,
    perDay: earningsPerSecond * CALCULATION_CONSTANTS.SECONDS_IN_DAY,
    perWeek: earningsPerSecond * CALCULATION_CONSTANTS.SECONDS_IN_DAY * 7,
    perMonth: earningsPerSecond * CALCULATION_CONSTANTS.SECONDS_IN_DAY * CALCULATION_CONSTANTS.DAYS_IN_MONTH,
    perYear: earningsPerSecond * CALCULATION_CONSTANTS.SECONDS_IN_YEAR
  };
}

/**
 * Calculate savings for different time periods
 */
export function calculateSavingsByPeriod(monthlySavings: number) {
  return {
    perMonth: monthlySavings,
    perYear: monthlySavings * 12
  };
}

/**
 * Calculate earnings today (since start of day)
 */
export function calculateEarningsToday(
  totalEarningsPerSecond: number,
  startOfDay: number
): number {
  const now = Date.now();
  const secondsSinceStartOfDay = (now - startOfDay) / 1000;
  return totalEarningsPerSecond * secondsSinceStartOfDay;
}

/**
 * Get start of current day timestamp (00:00:00)
 */
export function getStartOfDay(): number {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return startOfDay.getTime();
}

/**
 * Check if a new milestone has been reached
 */
export function checkMilestone(
  currentPercentage: number,
  lastNotificationPercentage: number
): { hasNewMilestone: boolean; newMilestone: number } {
  const currentMilestone = Math.floor(currentPercentage / 5) * 5;
  const hasNewMilestone = currentMilestone > lastNotificationPercentage && currentMilestone > 0;
  
  return {
    hasNewMilestone,
    newMilestone: hasNewMilestone ? currentMilestone : lastNotificationPercentage
  };
}

/**
 * Format currency value to Brazilian Real format
 */
export function formatCurrency(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
}

/**
 * Format percentage value
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`;
}
