function formatDays(value) {
  const raw = String(value || "").trim();

  if (!raw) return "";
  if (raw === "1234567") return "";

  const names = {
    1: "Mon",
    2: "Tue",
    3: "Wed",
    4: "Thu",
    5: "Fri",
    6: "Sat",
    7: "Sun"
  };

  if (raw === "67") return "Weekend";
  if (raw === "12345") return "Weekdays";

  return raw
    .split("")
    .map(d => names[d] || d)
    .join(", ");
}

module.exports = {
  formatDays
};