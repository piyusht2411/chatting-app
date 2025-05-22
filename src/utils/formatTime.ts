export function formatToOnlyTime(timeStr: string): string {
  if (!timeStr) return "";

  // Remove microseconds if present
  const trimmedTimeStr = timeStr.split(".")[0] + "Z"; // Append 'Z' to treat it as UTC

  const date = new Date(trimmedTimeStr);
  if (isNaN(date.getTime())) return "Invalid Date"; // Handle invalid inputs

  return date
    .toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
    .replace(/^(\d):/, "0$1:"); // Ensure leading zero for single-digit hours
}

export function formatToDate(timestamp: string): string {
  if (!timestamp) return "";

  // Remove microseconds if present
  const trimmedTimestamp = timestamp.split(".")[0] + "Z"; // Append 'Z' to treat it as UTC

  const date = new Date(trimmedTimestamp);
  const now = new Date();

  // Get year, month, and date components
  const year = date.getFullYear();
  const month = date.toLocaleString("en-US", { month: "short" }); // "Feb"
  const day = date.getDate();

  // Get today's and yesterday's date without time
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Check if the date is today, yesterday, or another day
  if (date >= today) return "Today";
  if (date >= yesterday) return "Yesterday";

  return `${day}-${month}-${year.toString().slice(-2)}`; // Format: 12-Feb-25
}
