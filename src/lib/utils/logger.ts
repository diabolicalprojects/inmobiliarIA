type LogLevel = "info" | "warn" | "error" | "debug";

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

function formatLog(entry: LogEntry): string {
  const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}]`;
  const ctx = entry.context ? ` [${entry.context}]` : "";
  const dataStr = entry.data ? ` ${JSON.stringify(entry.data)}` : "";
  return `${prefix}${ctx} ${entry.message}${dataStr}`;
}

function createEntry(
  level: LogLevel,
  message: string,
  context?: string,
  data?: Record<string, unknown>
): LogEntry {
  return {
    level,
    message,
    context,
    data,
    timestamp: new Date().toISOString(),
  };
}

export const logger = {
  info(message: string, context?: string, data?: Record<string, unknown>) {
    const entry = createEntry("info", message, context, data);
    console.log(formatLog(entry));
  },

  warn(message: string, context?: string, data?: Record<string, unknown>) {
    const entry = createEntry("warn", message, context, data);
    console.warn(formatLog(entry));
  },

  error(message: string, context?: string, data?: Record<string, unknown>) {
    const entry = createEntry("error", message, context, data);
    console.error(formatLog(entry));
  },

  debug(message: string, context?: string, data?: Record<string, unknown>) {
    if (process.env.NODE_ENV === "development") {
      const entry = createEntry("debug", message, context, data);
      console.debug(formatLog(entry));
    }
  },
};

export default logger;
