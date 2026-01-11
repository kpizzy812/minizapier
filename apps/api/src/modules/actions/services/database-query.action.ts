import { Injectable, Logger } from '@nestjs/common';
import { Pool, PoolConfig } from 'pg';
import { DatabaseQueryConfig, DatabaseQueryResult } from '../types';

/**
 * Database Query Action - executes SQL queries against PostgreSQL databases
 */
@Injectable()
export class DatabaseQueryAction {
  private readonly logger = new Logger(DatabaseQueryAction.name);
  private readonly queryTimeout = 30000; // 30 seconds

  /**
   * Execute a database query
   */
  async execute(config: DatabaseQueryConfig): Promise<DatabaseQueryResult> {
    let pool: Pool | null = null;

    try {
      const { query, params = [], connectionString } = config;

      if (!connectionString) {
        return {
          success: false,
          error:
            'Database connection string is required. Please configure credentials.',
        };
      }

      if (!query || query.trim() === '') {
        return {
          success: false,
          error: 'SQL query cannot be empty.',
        };
      }

      // Validate query - only allow SELECT, INSERT, UPDATE, DELETE
      const normalizedQuery = query.trim().toUpperCase();
      const allowedStatements = ['SELECT', 'INSERT', 'UPDATE', 'DELETE'];
      const startsWithAllowed = allowedStatements.some((stmt) =>
        normalizedQuery.startsWith(stmt),
      );

      if (!startsWithAllowed) {
        return {
          success: false,
          error:
            'Only SELECT, INSERT, UPDATE, and DELETE statements are allowed.',
        };
      }

      // Block dangerous patterns
      const dangerousPatterns = [
        /DROP\s+/i,
        /TRUNCATE\s+/i,
        /ALTER\s+/i,
        /CREATE\s+/i,
        /GRANT\s+/i,
        /REVOKE\s+/i,
        /--/,
        /;\s*$/,
      ];

      for (const pattern of dangerousPatterns) {
        if (pattern.test(query)) {
          return {
            success: false,
            error: 'Query contains potentially dangerous patterns.',
          };
        }
      }

      this.logger.debug(
        `Executing database query: ${query.substring(0, 100)}...`,
      );

      // Parse connection string and create pool
      const poolConfig = this.parseConnectionString(connectionString);
      poolConfig.max = 1; // Single connection for action execution
      poolConfig.connectionTimeoutMillis = 10000;
      poolConfig.idleTimeoutMillis = 1000;

      pool = new Pool(poolConfig);

      // Execute query with timeout
      const client = await pool.connect();

      try {
        // Set statement timeout
        await client.query(`SET statement_timeout = ${this.queryTimeout}`);

        // Execute the actual query
        const result = await client.query(query, params);

        // Extract field names
        const fields = result.fields?.map((f) => f.name) || [];

        this.logger.debug(
          `Query executed: ${result.rowCount} rows, ${fields.length} fields`,
        );

        return {
          success: true,
          data: {
            rows: result.rows,
            rowCount: result.rowCount || 0,
            fields,
          },
        };
      } finally {
        client.release();
      }
    } catch (error) {
      const errorMessage = this.extractDatabaseError(error);

      this.logger.error(`Database query failed: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      // Always clean up the pool
      if (pool) {
        await pool.end().catch((err) => {
          this.logger.warn(`Error closing pool: ${err}`);
        });
      }
    }
  }

  /**
   * Parse connection string to PoolConfig
   */
  private parseConnectionString(connectionString: string): PoolConfig {
    // pg library can accept connection string directly
    return {
      connectionString,
      ssl:
        connectionString.includes('sslmode=require') ||
        connectionString.includes('ssl=true')
          ? { rejectUnauthorized: false }
          : false,
    };
  }

  /**
   * Extract meaningful error message from database errors
   */
  private extractDatabaseError(error: unknown): string {
    if (error instanceof Error) {
      const message = error.message;

      // Common PostgreSQL error patterns
      if (message.includes('ECONNREFUSED')) {
        return 'Could not connect to database. Please check the connection string.';
      }
      if (message.includes('authentication failed')) {
        return 'Database authentication failed. Please check credentials.';
      }
      if (message.includes('does not exist')) {
        return `Database or table does not exist: ${message}`;
      }
      if (message.includes('syntax error')) {
        return `SQL syntax error: ${message}`;
      }
      if (message.includes('statement timeout')) {
        return 'Query execution timeout. Please optimize your query.';
      }

      return message;
    }

    return String(error);
  }

  /**
   * Test database connection
   */
  async testConnection(
    connectionString: string,
  ): Promise<{ success: boolean; error?: string }> {
    let pool: Pool | null = null;

    try {
      const poolConfig = this.parseConnectionString(connectionString);
      poolConfig.max = 1;
      poolConfig.connectionTimeoutMillis = 5000;

      pool = new Pool(poolConfig);

      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: this.extractDatabaseError(error),
      };
    } finally {
      if (pool) {
        await pool.end().catch(() => {});
      }
    }
  }
}
