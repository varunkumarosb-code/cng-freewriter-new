export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'ACTION' | 'DEBUG';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  tag: string;
  message: string;
  data?: any;
}

class SystemLogger {
  private logs: LogEntry[] = [];
  private maxLogs = 300;
  private storageKey = 'cng_writer_syslogs';

  constructor() {
    this.loadLogs();
  }

  private loadLogs() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.logs = JSON.parse(stored);
      }
    } catch {
      this.logs = [];
    }
  }

  private persist() {
    try {
      if (this.logs.length > this.maxLogs) {
        this.logs = this.logs.slice(-this.maxLogs);
      }
      localStorage.setItem(this.storageKey, JSON.stringify(this.logs));
    } catch {
      // ignore
    }
  }

  public log(level: LogLevel, tag: string, message: string, data?: any) {
    const entry: LogEntry = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString('en-IN', { hour12: true }),
      level,
      tag,
      message,
      data: data ? JSON.parse(JSON.stringify(data)) : undefined
    };

    this.logs.push(entry);
    this.persist();

    // Print to browser dev console cleanly
    const colorMap: Record<LogLevel, string> = {
      INFO: 'color: #52b788',
      WARN: 'color: #e0a96d',
      ERROR: 'color: #e63946; font-weight: bold',
      ACTION: 'color: #64dfdf',
      DEBUG: 'color: #a0aec0'
    };
    console.log(`%c[${entry.level}] [${entry.tag}] ${entry.message}`, colorMap[level], data || '');
  }

  public info(tag: string, message: string, data?: any) {
    this.log('INFO', tag, message, data);
  }

  public warn(tag: string, message: string, data?: any) {
    this.log('WARN', tag, message, data);
  }

  public error(tag: string, message: string, data?: any) {
    this.log('ERROR', tag, message, data);
  }

  public action(tag: string, message: string, data?: any) {
    this.log('ACTION', tag, message, data);
  }

  public getLogs(): LogEntry[] {
    return [...this.logs].reverse();
  }

  public clearLogs() {
    this.logs = [];
    localStorage.removeItem(this.storageKey);
    this.info('SYSTEM', 'Logs cleared by admin');
  }
}

export const logger = new SystemLogger();