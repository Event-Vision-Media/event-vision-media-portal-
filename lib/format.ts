export function formatDateGerman(dateString: string) {
  return new Date(dateString + "T00:00:00").toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatDateTimeGerman(isoString: string) {
  return new Date(isoString).toLocaleString("de-DE", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Erwartet ein Postgres "time"-Format ("HH:MM:SS" oder "HH:MM") und gibt
// "HH:MM Uhr" zurück. Reine String-Verarbeitung, um Zeitzonen-Stolperfallen
// beim Parsen als Date zu vermeiden.
export function formatTimeGerman(timeString: string) {
  return `${timeString.slice(0, 5)} Uhr`;
}

export function formatCurrencyEUR(value: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
