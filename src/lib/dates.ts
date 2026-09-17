/**
 * Obtiene la fecha actual en formato YYYY-MM-DD configurada explícitamente
 * para la zona horaria de La Paz, Bolivia (America/La_Paz, UTC-4).
 */
export function getTodayDateString(): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/La_Paz",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(new Date()); // Retorna "YYYY-MM-DD"
  } catch (e) {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
}
