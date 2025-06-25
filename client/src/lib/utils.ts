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

export function getWeekRange(date: Date): { start: Date; end: Date } {
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  const monday = new Date(date.getFullYear(), date.getMonth(), diff);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  
  return { start: monday, end: friday };
}

export function formatWeekRange(start: Date, end: Date): string {
  const startStr = start.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  const endStr = end.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  return `${startStr} - ${endStr}`;
}

export function groupRecordsByMonth(records: any[]) {
  const months = new Map<string, any[]>();
  
  records.forEach(record => {
    const recordDate = new Date(record.date);
    const monthKey = `${recordDate.getFullYear()}-${String(recordDate.getMonth() + 1).padStart(2, '0')}`;
    
    if (!months.has(monthKey)) {
      months.set(monthKey, []);
    }
    months.get(monthKey)!.push(record);
  });
  
  return Array.from(months.entries()).map(([monthKey, monthRecords]) => {
    const [year, month] = monthKey.split('-');
    const monthDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const monthName = monthDate.toLocaleDateString('vi-VN', { 
      month: 'long', 
      year: 'numeric' 
    });
    
    return {
      monthKey,
      year: parseInt(year),
      month: parseInt(month),
      monthName,
      records: monthRecords.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    };
  }).sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  }); // Sort by newest month first
}

export function groupRecordsByWeek(records: any[]) {
  const weeks = new Map<string, any[]>();
  
  records.forEach(record => {
    const recordDate = new Date(record.date);
    const { start, end } = getWeekRange(recordDate);
    const weekKey = `${start.toISOString().split('T')[0]}_${end.toISOString().split('T')[0]}`;
    
    if (!weeks.has(weekKey)) {
      weeks.set(weekKey, []);
    }
    weeks.get(weekKey)!.push(record);
  });
  
  return Array.from(weeks.entries()).map(([weekKey, weekRecords]) => {
    const [startStr, endStr] = weekKey.split('_');
    const start = new Date(startStr);
    const end = new Date(endStr);
    
    return {
      weekKey,
      start,
      end,
      records: weekRecords.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
      weekRange: formatWeekRange(start, end)
    };
  }).sort((a, b) => b.start.getTime() - a.start.getTime()); // Sort by newest week first
}

export function getDayOfWeek(date: string): string {
  const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const dayIndex = new Date(date).getDay();
  return days[dayIndex];
}

export function formatDateWithDay(date: string): string {
  const dayOfWeek = getDayOfWeek(date);
  const formattedDate = formatDate(date);
  return `${formattedDate} (${dayOfWeek})`;
}
