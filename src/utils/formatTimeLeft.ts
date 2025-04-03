/**
 * Format milliseconds to a human-readable time string (HH:MM:SS)
 */
export function formatTimeLeft(ms: number | null): string {
  if (!ms) return '00:00:00';
  
  // Convert milliseconds to seconds
  const totalSeconds = Math.floor(ms / 1000);
  
  // Calculate hours, minutes, seconds
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  // Format with leading zeros
  const formatNumber = (n: number) => n.toString().padStart(2, '0');
  
  return `${formatNumber(hours)}:${formatNumber(minutes)}:${formatNumber(seconds)}`;
} 