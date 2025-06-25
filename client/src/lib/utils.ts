import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('vi-VN').format(num);
}

export function formatPercentage(percentage: number): string {
  return `${percentage.toFixed(1)}%`;
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

export function getNextDate(records: any[]): string {
  if (records.length === 0) {
    return getTodayDate();
  }
  
  // Sort records by date and get the latest date
  const sortedRecords = records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const latestDate = new Date(sortedRecords[0].date);
  
  // Add one day to the latest date
  const nextDate = new Date(latestDate);
  nextDate.setDate(nextDate.getDate() + 1);
  
  return nextDate.toISOString().split('T')[0];
}
