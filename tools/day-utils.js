function formatDays(days) {
  const raw = String(days || "").trim();

  if (!raw) return "Daily";

  const cleaned = raw
    .replaceAll("Mo", "1")
    .replaceAll("Tu", "2")
    .replaceAll("We", "3")
    .replaceAll("Th", "4")
    .replaceAll("Fr", "5")
    .replaceAll("Sa", "6")
    .replaceAll("Su", "7")
    .replace(/[^\d]/g, "");

  if (cleaned === "1234567") return "Daily";
  if (cleaned === "12345") return "Mo–Fr";
  if (cleaned === "67") return "Weekend";

  const names = {
    1: "Mon",
    2: "Tue",
    3: "Wed",
    4: "Thu",
    5: "Fri",
    6: "Sat",
    7: "Sun"
  };

  if (/^[1-7]+$/.test(cleaned)) {
    return [...cleaned].map(day => names[day]).join(", ");
  }

  if (/irr|irreg|var|tent/i.test(raw)) return "Irregular";

  return raw;
}

module.exports = {
  formatDays
};