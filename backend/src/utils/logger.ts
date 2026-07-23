import winston from 'winston';

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Verbose debug logging is fine (and useful) for local development, but
// left unset it used to default to 'debug' in every environment, including
// production — quietly logging far more than intended (and at real cost,
// since every log line ships to disk/stdout). Only actual development gets
// 'debug' by default now; everything else defaults to 'info'. LOG_LEVEL
// still overrides this explicitly wherever it's set.
const defaultLevel = process.env.NODE_ENV === 'development' ? 'debug' : 'info';

const format = winston.format.combine(
  // Lets logger.error(err) (or logger.error('msg:', err)) surface a real
  // stack trace instead of just err.message — critical for debugging
  // production issues after the fact.
  winston.format.errors({ stack: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.printf((info) => {
    // format.errors only rewrites `info` when the *first* logged argument is
    // itself an Error. Most call sites in this codebase log an Error as a
    // second/extra argument instead (e.g. logger.error('X failed:', err)) —
    // catch that case here too so its stack still gets captured.
    const splat = (info[Symbol.for('splat') as unknown as string] as unknown[]) || [];
    const splatError = splat.find((a): a is Error => a instanceof Error);
    const stack = (info.stack as string | undefined) || splatError?.stack;
    return `${info.timestamp} ${info.level}: ${info.message}${stack ? `\n${stack}` : ''}`;
  })
);

const transports = [
  new winston.transports.Console(),
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
  }),
  new winston.transports.File({
    filename: 'logs/all.log',
  }),
];

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || defaultLevel,
  levels,
  format,
  transports,
});
