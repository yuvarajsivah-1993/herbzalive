export function formatDate(date: Date, format = "DD/MM/YYYY"): string {
  if (!date) return "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  switch (format) {
  case "MM/DD/YYYY":
    return `${month}/${day}/${year}`;
  case "YYYY-MM-DD":
    return `${year}-${month}-${day}`;
  case "DD/MM/YYYY":
  default:
    return `${day}/${month}/${year}`;
  }
}

export function formatTime(date: Date, format = "12-hour"): string {
  if (!date) return "";
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");

  if (format === "12-hour") {
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;
  } else {
    return `${String(hours).padStart(2, "0")}:${minutes}`;
  }
}
