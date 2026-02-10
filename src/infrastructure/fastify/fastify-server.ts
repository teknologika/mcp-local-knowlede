/**
 * Fastify server for the Manager UI and HTTP API
 * Provides web interface and REST endpoints for codebase management
 */

import Fastify, { FastifyInstance } from 'fastify';
import helmet from '@fastify/helmet';
import fastifyStatic from '@fastify/static';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { CodebaseService } from '../../domains/codebase/codebase.service.js';
import type { SearchService } from '../../domains/search/search.service.js';
import type { Config } from '../../shared/types/index.js';
import { registerRoutes } from './routes.js';
import { createLogger } from '../../shared/logging/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rootLogger = createLogger('info');
const logger = rootLogger.child('FastifyServer');

/**
 * Error thrown when Fastify server operations fail
 */
export class FastifyServerError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'FastifyServerError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Fastify server wrapper
 */
export class FastifyServer {
  private fastify: FastifyInstance;
  private config: Config;
  private codebaseService: CodebaseService;
  private searchService: SearchService;
  private isRunning = false;

  constructor(
    codebaseService: CodebaseService,
    searchService: SearchService,
    config: Config
  ) {
    this.codebaseService = codebaseService;
    this.searchService = searchService;
    this.config = config;

    // Create Fastify instance with Pino logger
    this.fastify = Fastify({
      logger: {
        level: config.logging.level,
        serializers: {
          req: (req) => ({
            method: req.method,
            url: req.url,
            headers: req.headers,
          }),
          res: (res) => ({
            statusCode: res.statusCode,
          }),
        },
      },
    });

    this.setupServer();
  }

  /**
   * Set up server middleware and routes
   */
  private setupServer(): void {
    // Register security headers with Helmet
    this.fastify.register(helmet, {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    });

    // Register static file serving for UI
    const uiPath = join(__dirname, '../../ui/manager');
    this.fastify.register(fastifyStatic, {
      root: uiPath,
      prefix: '/',
    });

    // Add global error handler
    this.fastify.setErrorHandler((error, request, reply) => {
      logger.error('Unhandled error', error, {
        method: request.method,
        url: request.url,
      });

      reply.status(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      });
    });

    // Register API routes
    this.fastify.register(async (instance) => {
      await registerRoutes(instance, this.codebaseService, this.searchService);
    });

    // Health check endpoint
    this.fastify.get('/health', async () => {
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
      };
    });

    logger.info('Fastify server configured', { uiPath });
  }

  /**
   * Start the Fastify server
   */
  async start(): Promise<void> {
    try {
      if (this.isRunning) {
        logger.warn('Server is already running');
        return;
      }

      const { host, port } = this.config.server;

      await this.fastify.listen({
        host,
        port,
      });

      this.isRunning = true;

      logger.info('Fastify server started', {
        host,
        port,
        url: `http://${host}:${port}`,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to start Fastify server', error instanceof Error ? error : new Error(errorMessage));
      throw new FastifyServerError(
        `Failed to start server: ${errorMessage}`,
        error
      );
    }
  }

  /**
   * Stop the Fastify server
   */
  async stop(): Promise<void> {
    try {
      if (!this.isRunning) {
        logger.warn('Server is not running');
        return;
      }

      await this.fastify.close();
      this.isRunning = false;

      logger.info('Fastify server stopped');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to stop Fastify server', error instanceof Error ? error : new Error(errorMessage));
      throw new FastifyServerError(
        `Failed to stop server: ${errorMessage}`,
        error
      );
    }
  }

  /**
   * Get the server URL
   */
  getUrl(): string {
    const { host, port } = this.config.server;
    return `http://${host}:${port}`;
  }

  /**
   * Check if server is running
   */
  isServerRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Get the Fastify instance (for testing)
   */
  getInstance(): FastifyInstance {
    return this.fastify;
  }
}
