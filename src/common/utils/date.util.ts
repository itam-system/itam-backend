import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import { TIMEZONE } from '../constants/app.constant.js';

dayjs.extend(utc);
dayjs.extend(timezone);

export function nowInTimezone(): string {
  return dayjs().tz(TIMEZONE).format();
}

export function formatDate(date: Date | string): string {
  return dayjs(date).tz(TIMEZONE).format('DD/MM/YYYY');
}

export function formatDateTime(date: Date | string): string {
  return dayjs(date).tz(TIMEZONE).format('DD/MM/YYYY HH:mm:ss');
}

export function parseExpiryToMs(expiry: string): number {
  const unit = expiry.slice(-1);
  const value = parseInt(expiry.slice(0, -1), 10);

  switch (unit) {
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    default:
      return 15 * 60 * 1000; // Default 15 minutes
  }
}
