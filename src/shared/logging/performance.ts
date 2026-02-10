/**
 * Performance monitoring utilities
 * 
 * Provides utilities for tracking and logging slow operations (>500ms)
 * Requirements: 12.4
 */

import type { Logger } from './logger.js';

/**
 * Performance threshold in milliseconds
 * Operations taking longer than this will be logged as warnings
 */
export const SLOW_OPERATION_THRESHOLD_MS = 500;

/**
 * Performance timer for tracking operation duration
 */
export class PerformanceTimer {
  private startTime: number;
  private readonly operation: string;
  private readonly logger: Logger;
  private readonly context?: Record<string, unknown>;

  constructor(operation: string, logger: Logger, context?: Record<string, unknown>) {
    this.operation = operation;
    this.logger = logger;
    this.context = context;
    this.startTime = Date.now();
  }

  /**
   * End the timer and log if operation was slow
   * @returns Duration in milliseconds
   */
  end(): number {
    const durationMs = Date.now() - this.startTime;

    if (durationMs > SLOW_OPERATION_THRESHOLD_MS) {
      this.logger.warn(`Slow operation detected: ${this.operation}`, {
        ...this.context,
        durationMs,
        threshold: SLOW_OPERATION_THRESHOLD_MS,
      });
    } else {
      this.logger.debug(`Operation completed: ${this.operation}`, {
        ...this.context,
        durationMs,
      });
    }

    return durationMs;
  }

  /**
   * Get current elapsed time without ending the timer
   * @returns Elapsed time in milliseconds
   */
  elapsed(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Reset the timer to current time
   */
  reset(): void {
    this.startTime = Date.now();
  }
}

/**
 * Create a performance timer for an operation
 * 
 * @param operation - Name of the operation being timed
 * @param logger - Logger instance for logging slow operations
 * @param context - Optional context to include in logs
 * @returns Performance timer instance
 * 
 * @example
 * const timer = startTimer('parseFile', logger, { filePath: 'src/index.ts' });
 * // ... perform operation ...
 * const duration = timer.end(); // Logs warning if >500ms
 */
export function startTimer(
  operation: string,
  logger: Logger,
  context?: Record<string, unknown>
): PerformanceTimer {
  return new PerformanceTimer(operation, logger, context);
}

/**
 * Measure the duration of an async operation and log if slow
 * 
 * @param operation - Name of the operation
 * @param logger - Logger instance
 * @param fn - Async function to measure
 * @param context - Optional context to include in logs
 * @returns Result of the function and duration
 * 
 * @example
 * const result = await measureAsync('generateEmbedding', logger, async () => {
 *   return await embeddingService.generateEmbedding(text);
 * }, { textLength: text.length });
 */
export async function measureAsync<T>(
  operation: string,
  logger: Logger,
  fn: () => Promise<T>,
  context?: Record<string, unknown>
): Promise<T> {
  const timer = startTimer(operation, logger, context);
  try {
    const result = await fn();
    timer.end();
    return result;
  } catch (error) {
    const durationMs = timer.elapsed();
    logger.error(
      `Operation failed: ${operation}`,
      error instanceof Error ? error : new Error(String(error)),
      {
        ...context,
        durationMs,
      }
    );
    throw error;
  }
}

/**
 * Measure the duration of a synchronous operation and log if slow
 * 
 * @param operation - Name of the operation
 * @param logger - Logger instance
 * @param fn - Function to measure
 * @param context - Optional context to include in logs
 * @returns Result of the function
 * 
 * @example
 * const result = measureSync('parseAST', logger, () => {
 *   return parser.parse(sourceCode);
 * }, { fileSize: sourceCode.length });
 */
export function measureSync<T>(
  operation: string,
  logger: Logger,
  fn: () => T,
  context?: Record<string, unknown>
): T {
  const timer = startTimer(operation, logger, context);
  try {
    const result = fn();
    timer.end();
    return result;
  } catch (error) {
    const durationMs = timer.elapsed();
    logger.error(
      `Operation failed: ${operation}`,
      error instanceof Error ? error : new Error(String(error)),
      {
        ...context,
        durationMs,
      }
    );
    throw error;
  }
}

/**
 * Memory usage snapshot
 */
export interface MemorySnapshot {
  rss: number; // Resident Set Size (total memory allocated)
  heapTotal: number; // Total heap size
  heapUsed: number; // Heap actually used
  external: number; // Memory used by C++ objects bound to JS
  timestamp: number;
}

/**
 * Get current memory usage
 * @returns Memory usage snapshot in bytes
 */
export function getMemoryUsage(): MemorySnapshot {
  const usage = process.memoryUsage();
  return {
    rss: usage.rss,
    heapTotal: usage.heapTotal,
    heapUsed: usage.heapUsed,
    external: usage.external,
    timestamp: Date.now(),
  };
}

/**
 * Format memory size in human-readable format
 * @param bytes - Memory size in bytes
 * @returns Formatted string (e.g., "123.45 MB")
 */
export function formatMemorySize(bytes: number): string {
  const mb = bytes / 1024 / 1024;
  return `${mb.toFixed(2)} MB`;
}

/**
 * Log current memory usage
 * @param logger - Logger instance
 * @param context - Optional context
 */
export function logMemoryUsage(logger: Logger, context?: Record<string, unknown>): void {
  const usage = getMemoryUsage();
  logger.info('Memory usage', {
    ...context,
    memory: {
      rss: formatMemorySize(usage.rss),
      heapTotal: formatMemorySize(usage.heapTotal),
      heapUsed: formatMemorySize(usage.heapUsed),
      external: formatMemorySize(usage.external),
    },
  });
}

/**
 * Track memory usage during an operation
 * Logs memory before, after, and the delta
 * 
 * @param operation - Name of the operation
 * @param logger - Logger instance
 * @param fn - Async function to track
 * @param context - Optional context
 * @returns Result of the function
 */
export async function trackMemory<T>(
  operation: string,
  logger: Logger,
  fn: () => Promise<T>,
  context?: Record<string, unknown>
): Promise<T> {
  const before = getMemoryUsage();
  
  logger.debug(`Memory before ${operation}`, {
    ...context,
    memory: {
      heapUsed: formatMemorySize(before.heapUsed),
      rss: formatMemorySize(before.rss),
    },
  });

  const result = await fn();

  const after = getMemoryUsage();
  const delta = {
    heapUsed: after.heapUsed - before.heapUsed,
    rss: after.rss - before.rss,
  };

  logger.info(`Memory after ${operation}`, {
    ...context,
    memory: {
      heapUsed: formatMemorySize(after.heapUsed),
      rss: formatMemorySize(after.rss),
      deltaHeapUsed: formatMemorySize(delta.heapUsed),
      deltaRss: formatMemorySize(delta.rss),
    },
  });

  return result;
}
