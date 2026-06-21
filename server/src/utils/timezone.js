/**
 * Utility to get current date and time in Indian Standard Time (IST - UTC+5:30)
 * regardless of the server's local timezone.
 * 
 * Uses manual UTC offset to avoid Intl.DateTimeFormat issues on some hosting environments.
 */
const getISTDateTime = () => {
  const now = new Date();
  
  // IST is UTC + 5 hours 30 minutes
  const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
  const istTime = new Date(now.getTime() + IST_OFFSET_MS);
  
  // Extract date parts from UTC methods (since we already shifted to IST)
  const year = istTime.getUTCFullYear();
  const month = String(istTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(istTime.getUTCDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  
  // Extract time parts in 12-hour format
  const hours24 = istTime.getUTCHours();
  const minutes = String(istTime.getUTCMinutes()).padStart(2, '0');
  const seconds = String(istTime.getUTCSeconds()).padStart(2, '0');
  
  const ampm = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 || 12; // Convert 0 to 12 for midnight
  const padHour = String(hours12).padStart(2, '0');
  
  const timeStr = `${padHour}:${minutes}:${seconds} ${ampm}`;
  
  return { date: dateStr, time: timeStr };
};

module.exports = { getISTDateTime };
