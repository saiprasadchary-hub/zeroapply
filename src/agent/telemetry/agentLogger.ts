/**
 * ZeroApply Telemetry - Production Agent Logger
 * Structured logging for agent actions, decisions, transitions, and performance.
 */

import { liveTelemetry, type LiveActionRecord } from './liveTelemetry';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface AgentLogEntry {
  timestamp: string;
  level: LogLevel;
  subsystem: string;
  message: string;
  data?: Record<string, unknown>;
}

export class AgentLogger {
  private static logs: AgentLogEntry[] = [];
  private static maxLogs = 1000;

  public static log(level: LogLevel, subsystem: string, message: string, data?: Record<string, unknown>): void {
    const entry: AgentLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      subsystem,
      message,
      data,
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    if (level === 'error') {
      console.error(`[${entry.timestamp}] [${subsystem.toUpperCase()}] ERROR: ${message}`, data || '');
    } else if (level === 'warn') {
      console.warn(`[${entry.timestamp}] [${subsystem.toUpperCase()}] WARN: ${message}`, data || '');
    } else {
      console.log(`[${entry.timestamp}] [${subsystem.toUpperCase()}] ${message}`, data || '');
    }
  }

  public static info(subsystem: string, message: string, data?: Record<string, unknown>): void {
    this.log('info', subsystem, message, data);
  }

  public static warn(subsystem: string, message: string, data?: Record<string, unknown>): void {
    this.log('warn', subsystem, message, data);
  }

  public static error(subsystem: string, message: string, data?: Record<string, unknown>): void {
    this.log('error', subsystem, message, data);
  }

  public static debug(subsystem: string, message: string, data?: Record<string, unknown>): void {
    this.log('debug', subsystem, message, data);
  }

  public static trackAction(action: LiveActionRecord): void {
    liveTelemetry.emit(action);
    this.info('agent-action', action.title, {
      type: action.type,
      target: action.target,
      value: action.value,
      status: action.status,
    });
  }

  public static getLogs(): AgentLogEntry[] {
    return [...this.logs];
  }

  public static clear(): void {
    this.logs = [];
  }
}
