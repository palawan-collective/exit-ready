/* Formatting helpers — shared across pages */

export function money(amount, symbol) {
  if (amount === null || amount === undefined || amount === "") return "—";
  return symbol + amount.toLocaleString("en-US");
}

/** Compact money for cards: $144k / ₱2.8M */
export function shorten(amount, symbol) {
  if (amount === null || amount === undefined || amount === "") return "—";
  const n = Number(amount);
  if (symbol === "₱") {
    if (n >= 1_000_000) return symbol + (n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1) + "M";
    if (n >= 1_000) return symbol + Math.round(n / 1_000) + "k";
    return symbol + n;
  }
  if (n >= 1_000_000) return symbol + (n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1) + "M";
  if (n >= 1_000) return symbol + Math.round(n / 1_000) + "k";
  return symbol + n;
}

export function fullMoney(amount, symbol) {
  if (amount == null) return "—";
  return symbol + Number(amount).toLocaleString("en-US");
}

export function num(v, suffix = "") {
  if (v == null || v === "") return "—";
  return Number(v).toLocaleString("en-US") + suffix;
}

export function dateLabel(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${String(d).padStart(2,"0")} ${months[m - 1]} ${y}`;
}

export function longDateLabel(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  const months = ["January","February","March","April","May","June","July",
                  "August","September","October","November","December"];
  return `${d} ${months[m - 1]} ${y}`;
}

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}
