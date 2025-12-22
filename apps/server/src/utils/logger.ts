type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

function formatTimestamp(): string {
  return new Date().toISOString();
}

function formatLog(entry: LogEntry): string {
  const parts = [
    `[${entry.timestamp}]`,
    `[${entry.level.toUpperCase()}]`,
    entry.message
  ];
  
  if (entry.data && Object.keys(entry.data).length > 0) {
    parts.push(JSON.stringify(entry.data));
  }
  
  return parts.join(" ");
}

export const logger = {
  debug: (message: string, data?: Record<string, unknown>) => {
    const entry: LogEntry = {
      level: "debug",
      message,
      timestamp: formatTimestamp(),
      data
    };
    console.log(formatLog(entry));
  },

  info: (message: string, data?: Record<string, unknown>) => {
    const entry: LogEntry = {
      level: "info",
      message,
      timestamp: formatTimestamp(),
      data
    };
    console.log(formatLog(entry));
  },

  warn: (message: string, data?: Record<string, unknown>) => {
    const entry: LogEntry = {
      level: "warn",
      message,
      timestamp: formatTimestamp(),
      data
    };
    console.warn(formatLog(entry));
  },

  error: (message: string, error?: Error | unknown, data?: Record<string, unknown>) => {
    const entry: LogEntry = {
      level: "error",
      message,
      timestamp: formatTimestamp(),
      data: {
        ...data,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : error
      }
    };
    console.error(formatLog(entry));
  }
};






