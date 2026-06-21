export function formatCurrency(amount: number | string): string {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numericAmount)) return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(numericAmount);
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

export function formatTime(timeStr: string): string {
  if (!timeStr) return '';

  // If it already has AM/PM, parse and format it cleanly
  const upperTime = timeStr.toUpperCase();
  if (upperTime.includes('AM') || upperTime.includes('PM')) {
    const parts = timeStr.trim().split(' ');
    if (parts.length === 2) {
      const timeParts = parts[0].split(':');
      const ampm = parts[1].toUpperCase();
      if (timeParts.length >= 2) {
        const hours = parseInt(timeParts[0], 10);
        const minutes = timeParts[1];
        return `${hours}:${minutes} ${ampm}`;
      }
    }
    return timeStr;
  }

  // Convert HH:mm:ss to 12 hour AM/PM
  const [hoursStr, minutesStr, secondsStr] = timeStr.split(':');
  const hours = parseInt(hoursStr, 10);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutesStr} ${ampm}`;
}

export function cn(...classes: (string | undefined | null | boolean)[]) {
  return classes.filter(Boolean).join(' ');
}
