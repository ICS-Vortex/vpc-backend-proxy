import fs from 'fs';
import path from 'path';
import winston, { format } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { config } from '@/config';

const logsDir = path.resolve(config.logs.dir);
fs.mkdirSync(logsDir, { recursive: true });

const isProductionLogging = config.node_env === 'production';

const logLineFormat = format.printf(({ timestamp, level, message, stack, ...meta }) => {
  const metaKeys = Object.keys(meta).filter((key) => meta[key] !== undefined);
  const renderedMeta = metaKeys.length > 0 ? ` ${JSON.stringify(meta)}` : '';
  const renderedStack = typeof stack === 'string' ? ` ${stack}` : '';

  return `[${timestamp}] ${level}: ${String(message)}${renderedMeta}${renderedStack}`;
});

const fileJsonFormat = format.combine(
  format.errors({ stack: true }),
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.json(),
);

const createRotateTransport = (filename: string, level?: string) => {
  return new DailyRotateFile({
    dirname: logsDir,
    filename,
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: config.logs.maxSize,
    maxFiles: config.logs.maxFiles,
    ...(level ? { level } : {}),
  });
};

const logger = winston.createLogger({
  level: config.logs.level,
  format: fileJsonFormat,
  transports: [
    createRotateTransport('app-%DATE%.log'),
    createRotateTransport('error-%DATE%.log', 'error'),
    new winston.transports.Console({
      format: isProductionLogging
        ? fileJsonFormat
        : format.combine(
            format.errors({ stack: true }),
            format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            logLineFormat,
          ),
    }),
  ],
});

export default logger;
