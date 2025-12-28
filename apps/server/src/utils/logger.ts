import fs from "fs";
import path from "path";

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

// Determine log file location
function getLogFilePath(): string {
  // Use CROCDESK_DATA_DIR if set, otherwise use current working directory
  const dataDir = process.env.CROCDESK_DATA_DIR || path.resolve(process.cwd(), "data");
  
  // Ensure logs directory exists
  const logsDir = path.join(dataDir, "logs");
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  // Create log file with date
  const date = new Date().toISOString().split('T')[0];
  return path.join(logsDir, `crocdesk-${date}.log`);
}

// Simple log rotation: keep only last 7 days of logs
function rotateOldLogs(): void {
  try {
    const dataDir = process.env.CROCDESK_DATA_DIR || path.resolve(process.cwd(), "data");
    const logsDir = path.join(dataDir, "logs");
    
    if (!fs.existsSync(logsDir)) {
      return;
    }
    
    const files = fs.readdirSync(logsDir);
    const now = Date.now();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    
    files.forEach(file => {
      const filePath = path.join(logsDir, file);
      const stats = fs.statSync(filePath);
      
      if (now - stats.mtime.getTime() > maxAge) {
        fs.unlinkSync(filePath);
      }
    });
  } catch (error) {
    // Ignore errors during rotation
    console.error('Failed to rotate old logs:', error);
  }
}

// Rotate logs on startup
rotateOldLogs();

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

function writeToFile(logLine: string): void {
  try {
    const logFile = getLogFilePath();
    fs.appendFileSync(logFile, logLine + '\n', 'utf8');
  } catch (error) {
    // If file logging fails, at least log to console
    console.error('Failed to write to log file:', error);
  }
}

export const logger = {
  debug: (message: string, data?: Record<string, unknown>) => {
    const entry: LogEntry = {
      level: "debug",
      message,
      timestamp: formatTimestamp(),
      data
    };
    const logLine = formatLog(entry);
    console.log(logLine);
    writeToFile(logLine);
  },

  info: (message: string, data?: Record<string, unknown>) => {
    const entry: LogEntry = {
      level: "info",
      message,
      timestamp: formatTimestamp(),
      data
    };
    const logLine = formatLog(entry);
    console.log(logLine);
    writeToFile(logLine);
  },

  warn: (message: string, data?: Record<string, unknown>) => {
    const entry: LogEntry = {
      level: "warn",
      message,
      timestamp: formatTimestamp(),
      data
    };
    const logLine = formatLog(entry);
    console.warn(logLine);
    writeToFile(logLine);
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
    const logLine = formatLog(entry);
    console.error(logLine);
    writeToFile(logLine);
  }
};






