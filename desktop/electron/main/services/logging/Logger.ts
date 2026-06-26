import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ILogger } from '../../domain/ILogger';

export class Logger implements ILogger {
  private logFilePath: string | null = null;
  private isVerbose = true;

  constructor(customLogPath?: string) {
    if (customLogPath) {
      this.initLogFile(customLogPath);
    } else {
      // Determine logging target. If Electron is not available (e.g. unit tests), fallback to workspace
      try {
        const { app } = require('electron');
        if (app) {
          const userData = app.getPath('userData');
          this.initLogFile(path.join(userData, 'logs', 'app.log'));
        } else {
          this.fallbackToTemp();
        }
      } catch {
        this.fallbackToTemp();
      }
    }
  }

  private fallbackToTemp(): void {
    try {
      this.initLogFile(path.join(process.cwd(), 'logs', 'app.log'));
    } catch {
      this.initLogFile(path.join(os.tmpdir(), 'SnapBridge', 'logs', 'app.log'));
    }
  }

  private initLogFile(filePath: string): void {
    try {
      this.logFilePath = filePath;
      const logDir = path.dirname(filePath);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
    } catch (err) {
      console.error('Failed to initialize logger file write target:', err);
    }
  }

  public info(message: string, ...args: any[]): void {
    this.log('INFO', message, ...args);
  }

  public warn(message: string, ...args: any[]): void {
    this.log('WARN', message, ...args);
  }

  public error(message: string, error?: any, ...args: any[]): void {
    let errStr = '';
    if (error) {
      if (error instanceof Error) {
        errStr = ` | Error: ${error.message}\nStack: ${error.stack}`;
      } else {
        errStr = ` | Error: ${JSON.stringify(error)}`;
      }
    }
    this.log('ERROR', `${message}${errStr}`, ...args);
  }

  public debug(message: string, ...args: any[]): void {
    if (this.isVerbose) {
      this.log('DEBUG', message, ...args);
    }
  }

  private log(level: string, message: string, ...args: any[]): void {
    const timestamp = new Date().toISOString();
    let formattedMessage = message;
    if (args.length > 0) {
      formattedMessage += ' ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ');
    }
    const logLine = `[${timestamp}] [${level}] ${formattedMessage}\n`;

    if (level === 'ERROR') {
      console.error(logLine.trim());
    } else if (level === 'WARN') {
      console.warn(logLine.trim());
    } else {
      console.log(logLine.trim());
    }

    if (this.logFilePath) {
      try {
        fs.appendFileSync(this.logFilePath, logLine);
      } catch (err) {
        console.error('Failed to append to log file:', err);
      }
    }
  }
}
