/**
 * Simple logger utility with LOG_LEVEL support.
 *
 * Supported levels (in order): debug < info < warn < error
 *
 * Set LOG_LEVEL environment variable to control verbosity.
 * Defaults to 'info'.
 *
 * At 'info' level and above, task titles are redacted — only task IDs are logged.
 * At 'debug' level, full details including task titles are logged.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function resolveLevel(): LogLevel {
  const raw = (process.env.LOG_LEVEL ?? 'info').toLowerCase();
  if (raw in LEVELS) return raw as LogLevel;
  return 'info';
}

const currentLevel = LEVELS[resolveLevel()];

function shouldLog(level: LogLevel): boolean {
  return LEVELS[level] >= currentLevel;
}

export const logger = {
  debug(...args: unknown[]): void {
    if (shouldLog('debug')) console.log('[debug]', ...args);
  },
  info(...args: unknown[]): void {
    if (shouldLog('info')) console.log('[info]', ...args);
  },
  warn(...args: unknown[]): void {
    if (shouldLog('warn')) console.warn('[warn]', ...args);
  },
  error(...args: unknown[]): void {
    if (shouldLog('error')) console.error('[error]', ...args);
  },
};
