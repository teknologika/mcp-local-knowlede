/**
 * Tests for performance monitoring utilities
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  startTimer,
  measureAsync,
  measureSync,
  getMemoryUsage,
  formatMemorySize,
  logMemoryUsage,
  trackMemory,
  SLOW_OPERATION_THRESHOLD_MS,
} from '../performance.js';
import type { Logger } from '../logger.js';

describe('Performance Utilities', () => {
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      child: vi.fn(() => mockLogger),
    };
  });

  describe('startTimer', () => {
    it('should create a timer and log debug on fast operations', async () => {
      const timer = startTimer('testOperation', mockLogger);
      
      // Simulate fast operation
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const duration = timer.end();
      
      expect(duration).toBeGreaterThanOrEqual(10);
      expect(duration).toBeLessThan(SLOW_OPERATION_THRESHOLD_MS);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Operation completed: testOperation',
        expect.objectContaining({
          durationMs: expect.any(Number),
        })
      );
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('should log warning for slow operations (>500ms)', async () => {
      const timer = startTimer('slowOperation', mockLogger);
      
      // Simulate slow operation
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const duration = timer.end();
      
      expect(duration).toBeGreaterThanOrEqual(600);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Slow operation detected: slowOperation',
        expect.objectContaining({
          durationMs: expect.any(Number),
          threshold: SLOW_OPERATION_THRESHOLD_MS,
        })
      );
    });

    it('should include context in logs', () => {
      const context = { filePath: 'test.ts', size: 1024 };
      const timer = startTimer('operation', mockLogger, context);
      
      timer.end();
      
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining(context)
      );
    });

    it('should return elapsed time without ending timer', async () => {
      const timer = startTimer('operation', mockLogger);
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const elapsed = timer.elapsed();
      expect(elapsed).toBeGreaterThanOrEqual(50);
      expect(mockLogger.debug).not.toHaveBeenCalled();
      
      timer.end();
      expect(mockLogger.debug).toHaveBeenCalled();
    });

    it('should reset timer', async () => {
      const timer = startTimer('operation', mockLogger);
      
      await new Promise(resolve => setTimeout(resolve, 50));
      timer.reset();
      
      await new Promise(resolve => setTimeout(resolve, 10));
      const duration = timer.end();
      
      // Duration should be close to 10ms, not 60ms
      expect(duration).toBeLessThan(50);
    });
  });

  describe('measureAsync', () => {
    it('should measure async operation and return result', async () => {
      const result = await measureAsync(
        'asyncOp',
        mockLogger,
        async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return 'success';
        }
      );
      
      expect(result).toBe('success');
      expect(mockLogger.debug).toHaveBeenCalled();
    });

    it('should log error and rethrow on failure', async () => {
      const error = new Error('Test error');
      
      await expect(
        measureAsync('failingOp', mockLogger, async () => {
          throw error;
        })
      ).rejects.toThrow('Test error');
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Operation failed: failingOp',
        error,
        expect.objectContaining({
          durationMs: expect.any(Number),
        })
      );
    });
  });

  describe('measureSync', () => {
    it('should measure sync operation and return result', () => {
      const result = measureSync(
        'syncOp',
        mockLogger,
        () => {
          return 42;
        }
      );
      
      expect(result).toBe(42);
      expect(mockLogger.debug).toHaveBeenCalled();
    });

    it('should log error and rethrow on failure', () => {
      const error = new Error('Test error');
      
      expect(() =>
        measureSync('failingOp', mockLogger, () => {
          throw error;
        })
      ).toThrow('Test error');
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Operation failed: failingOp',
        error,
        expect.objectContaining({
          durationMs: expect.any(Number),
        })
      );
    });
  });

  describe('getMemoryUsage', () => {
    it('should return memory snapshot', () => {
      const snapshot = getMemoryUsage();
      
      expect(snapshot).toHaveProperty('rss');
      expect(snapshot).toHaveProperty('heapTotal');
      expect(snapshot).toHaveProperty('heapUsed');
      expect(snapshot).toHaveProperty('external');
      expect(snapshot).toHaveProperty('timestamp');
      
      expect(snapshot.rss).toBeGreaterThan(0);
      expect(snapshot.heapTotal).toBeGreaterThan(0);
      expect(snapshot.heapUsed).toBeGreaterThan(0);
    });
  });

  describe('formatMemorySize', () => {
    it('should format bytes to MB', () => {
      expect(formatMemorySize(0)).toBe('0.00 MB');
      expect(formatMemorySize(1024 * 1024)).toBe('1.00 MB');
      expect(formatMemorySize(1024 * 1024 * 10.5)).toBe('10.50 MB');
      expect(formatMemorySize(1024 * 1024 * 1024)).toBe('1024.00 MB');
    });
  });

  describe('logMemoryUsage', () => {
    it('should log current memory usage', () => {
      logMemoryUsage(mockLogger);
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Memory usage',
        expect.objectContaining({
          memory: expect.objectContaining({
            rss: expect.stringMatching(/\d+\.\d+ MB/),
            heapTotal: expect.stringMatching(/\d+\.\d+ MB/),
            heapUsed: expect.stringMatching(/\d+\.\d+ MB/),
            external: expect.stringMatching(/\d+\.\d+ MB/),
          }),
        })
      );
    });

    it('should include context in log', () => {
      const context = { phase: 'start', codebaseName: 'test' };
      logMemoryUsage(mockLogger, context);
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Memory usage',
        expect.objectContaining(context)
      );
    });
  });

  describe('trackMemory', () => {
    it('should track memory before and after operation', async () => {
      const result = await trackMemory(
        'memoryOp',
        mockLogger,
        async () => {
          // Allocate some memory
          const arr = new Array(1000000).fill(0);
          return arr.length;
        }
      );
      
      expect(result).toBe(1000000);
      
      // Should log before and after
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Memory before memoryOp',
        expect.objectContaining({
          memory: expect.any(Object),
        })
      );
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Memory after memoryOp',
        expect.objectContaining({
          memory: expect.objectContaining({
            deltaHeapUsed: expect.any(String),
            deltaRss: expect.any(String),
          }),
        })
      );
    });
  });
});
