import { test, describe } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../main/services/logging/Logger';

describe('Logger Service', () => {
  const testLogPath = path.join(process.cwd(), 'logs', 'test.log');

  test('should create log directory and write log messages', () => {
    // Clean up old log file if exists
    if (fs.existsSync(testLogPath)) {
      try {
        fs.unlinkSync(testLogPath);
      } catch {}
    }

    const logger = new Logger(testLogPath);
    logger.info('Test info message');
    logger.warn('Test warning message');
    logger.error('Test error message', new Error('Something went wrong'));

    assert.ok(fs.existsSync(testLogPath), 'Log file should be created');
    
    const content = fs.readFileSync(testLogPath, 'utf8');
    assert.ok(content.includes('[INFO] Test info message'), 'Should log info message');
    assert.ok(content.includes('[WARN] Test warning message'), 'Should log warning message');
    assert.ok(content.includes('[ERROR] Test error message'), 'Should log error message');
    assert.ok(content.includes('Something went wrong'), 'Should include error stack trace');

    // Clean up after test
    try {
      fs.unlinkSync(testLogPath);
    } catch {}
  });
});
