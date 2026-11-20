export const APP_TIMEZONE = 'America/Sao_Paulo';
export const APP_LOCALE = 'pt-BR';

const SAO_PAULO_UTC_OFFSET = '-03:00';

const isoDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const hourFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: APP_TIMEZONE,
  hour: '2-digit',
  hourCycle: 'h23',
});

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

/**
 * Formats a Date as YYYY-MM-DD in America/Sao_Paulo timezone.
 */
export function formatDateIsoInAppTimezone(value: Date | string): string {
  return isoDateFormatter.format(toDate(value));
}

/**
 * Returns the hour (0-23) of a Date in America/Sao_Paulo timezone.
 */
export function getHourInAppTimezone(value: Date | string): number {
  const hour = Number.parseInt(hourFormatter.format(toDate(value)), 10);
  return hour === 24 ? 0 : hour;
}

/**
 * Formats time as HH:mm (or HH:mm:ss) in America/Sao_Paulo timezone.
 */
export function formatTimeInAppTimezone(
  value: Date | string,
  options: { showSeconds?: boolean } = {},
): string {
  return toDate(value).toLocaleTimeString(APP_LOCALE, {
    timeZone: APP_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    ...(options.showSeconds ? { second: '2-digit' } : {}),
  });
}

/**
 * Formats date and time in pt-BR using America/Sao_Paulo timezone.
 */
export function formatDateTimeInAppTimezone(value: Date | string): string {
  return toDate(value).toLocaleString(APP_LOCALE, {
    timeZone: APP_TIMEZONE,
  });
}

/**
 * Formats a full emission timestamp for exported reports in America/Sao_Paulo timezone.
 */
export function formatEmissionTimestampInAppTimezone(
  value: Date | string,
): string {
  const date = toDate(value);
  const dateStr = date.toLocaleDateString(APP_LOCALE, {
    timeZone: APP_TIMEZONE,
  });
  const timeStr = formatTimeInAppTimezone(date, { showSeconds: true });
  return `${dateStr} ${timeStr} (America/Sao_Paulo)`;
}

/**
 * Converts a YYYY-MM-DD string to the start of that day in America/Sao_Paulo.
 * Passes through full ISO timestamps unchanged.
 */
export function getStartOfDayInAppTimezone(isoDate: string): Date {
  if (isoDate.length === 10) {
    return new Date(`${isoDate}T00:00:00.000${SAO_PAULO_UTC_OFFSET}`);
  }
  return new Date(isoDate);
}

/**
 * Converts a YYYY-MM-DD string to the end of that day in America/Sao_Paulo.
 * Passes through full ISO timestamps unchanged.
 */
export function getEndOfDayInAppTimezone(isoDate: string): Date {
  if (isoDate.length === 10) {
    return new Date(`${isoDate}T23:59:59.999${SAO_PAULO_UTC_OFFSET}`);
  }
  return new Date(isoDate);
}
