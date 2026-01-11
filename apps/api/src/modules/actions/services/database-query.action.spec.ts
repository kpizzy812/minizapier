import { DatabaseQueryAction } from './database-query.action';

// Mock pg
const mockQuery = jest.fn();
const mockRelease = jest.fn();
const mockConnect = jest.fn();
const mockEnd = jest.fn();

jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    connect: mockConnect,
    end: mockEnd,
  })),
}));

describe('DatabaseQueryAction', () => {
  let service: DatabaseQueryAction;

  beforeEach(() => {
    service = new DatabaseQueryAction();

    // Reset mocks
    mockQuery.mockReset();
    mockRelease.mockReset();
    mockConnect.mockReset();
    mockEnd.mockReset();

    // Default mock implementation
    mockConnect.mockResolvedValue({
      query: mockQuery,
      release: mockRelease,
    });
    mockEnd.mockResolvedValue(undefined);
  });

  describe('execute - validation', () => {
    it('should return error when connectionString is missing', async () => {
      const result = await service.execute({
        query: 'SELECT 1',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('connection string is required');
    });

    it('should return error when query is empty', async () => {
      const result = await service.execute({
        query: '',
        connectionString: 'postgresql://localhost/test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('cannot be empty');
    });

    it('should return error when query is whitespace', async () => {
      const result = await service.execute({
        query: '   ',
        connectionString: 'postgresql://localhost/test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('cannot be empty');
    });
  });

  describe('execute - query validation', () => {
    it('should reject DROP statements', async () => {
      const result = await service.execute({
        query: 'DROP TABLE users',
        connectionString: 'postgresql://localhost/test',
      });

      expect(result.success).toBe(false);
      // DROP is not in allowed statements (SELECT, INSERT, UPDATE, DELETE)
      expect(result.error).toContain('Only SELECT, INSERT, UPDATE, and DELETE');
    });

    it('should reject TRUNCATE statements', async () => {
      const result = await service.execute({
        query: 'TRUNCATE TABLE users',
        connectionString: 'postgresql://localhost/test',
      });

      expect(result.success).toBe(false);
      // TRUNCATE is not in allowed statements
      expect(result.error).toContain('Only SELECT, INSERT, UPDATE, and DELETE');
    });

    it('should reject ALTER statements', async () => {
      const result = await service.execute({
        query: 'ALTER TABLE users ADD COLUMN name VARCHAR',
        connectionString: 'postgresql://localhost/test',
      });

      expect(result.success).toBe(false);
      // ALTER is not in allowed statements
      expect(result.error).toContain('Only SELECT, INSERT, UPDATE, and DELETE');
    });

    it('should reject CREATE statements', async () => {
      const result = await service.execute({
        query: 'CREATE TABLE test (id INT)',
        connectionString: 'postgresql://localhost/test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Only SELECT, INSERT, UPDATE, and DELETE');
    });

    it('should reject GRANT statements', async () => {
      const result = await service.execute({
        query: 'GRANT ALL ON users TO admin',
        connectionString: 'postgresql://localhost/test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Only SELECT, INSERT, UPDATE, and DELETE');
    });

    it('should reject SQL comments', async () => {
      const result = await service.execute({
        query: 'SELECT * FROM users -- comment',
        connectionString: 'postgresql://localhost/test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('dangerous patterns');
    });

    it('should reject trailing semicolon', async () => {
      const result = await service.execute({
        query: 'SELECT * FROM users;',
        connectionString: 'postgresql://localhost/test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('dangerous patterns');
    });
  });

  describe('execute - SELECT queries', () => {
    it('should execute SELECT query successfully', async () => {
      mockQuery
        .mockResolvedValueOnce({}) // SET statement_timeout
        .mockResolvedValueOnce({
          rows: [
            { id: 1, name: 'John' },
            { id: 2, name: 'Jane' },
          ],
          rowCount: 2,
          fields: [{ name: 'id' }, { name: 'name' }],
        });

      const result = await service.execute({
        query: 'SELECT * FROM users',
        connectionString: 'postgresql://localhost/test',
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        rows: [
          { id: 1, name: 'John' },
          { id: 2, name: 'Jane' },
        ],
        rowCount: 2,
        fields: ['id', 'name'],
      });
      expect(mockRelease).toHaveBeenCalled();
      expect(mockEnd).toHaveBeenCalled();
    });

    it('should execute SELECT with parameters', async () => {
      mockQuery.mockResolvedValueOnce({}).mockResolvedValueOnce({
        rows: [{ id: 1, name: 'John' }],
        rowCount: 1,
        fields: [{ name: 'id' }, { name: 'name' }],
      });

      const result = await service.execute({
        query: 'SELECT * FROM users WHERE id = $1',
        params: [1],
        connectionString: 'postgresql://localhost/test',
      });

      expect(result.success).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE id = $1',
        [1],
      );
    });

    it('should handle empty result set', async () => {
      mockQuery.mockResolvedValueOnce({}).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        fields: [{ name: 'id' }, { name: 'name' }],
      });

      const result = await service.execute({
        query: 'SELECT * FROM users WHERE 1 = 0',
        connectionString: 'postgresql://localhost/test',
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        rows: [],
        rowCount: 0,
        fields: ['id', 'name'],
      });
    });
  });

  describe('execute - INSERT queries', () => {
    it('should execute INSERT query successfully', async () => {
      mockQuery.mockResolvedValueOnce({}).mockResolvedValueOnce({
        rows: [{ id: 1 }],
        rowCount: 1,
        fields: [{ name: 'id' }],
      });

      const result = await service.execute({
        query: 'INSERT INTO users (name) VALUES ($1) RETURNING id',
        params: ['John'],
        connectionString: 'postgresql://localhost/test',
      });

      expect(result.success).toBe(true);
      expect(result.data?.rowCount).toBe(1);
    });
  });

  describe('execute - UPDATE queries', () => {
    it('should execute UPDATE query successfully', async () => {
      mockQuery.mockResolvedValueOnce({}).mockResolvedValueOnce({
        rows: [],
        rowCount: 5,
        fields: [],
      });

      const result = await service.execute({
        query: 'UPDATE users SET active = true WHERE status = $1',
        params: ['pending'],
        connectionString: 'postgresql://localhost/test',
      });

      expect(result.success).toBe(true);
      expect(result.data?.rowCount).toBe(5);
    });
  });

  describe('execute - DELETE queries', () => {
    it('should execute DELETE query successfully', async () => {
      mockQuery.mockResolvedValueOnce({}).mockResolvedValueOnce({
        rows: [],
        rowCount: 3,
        fields: [],
      });

      const result = await service.execute({
        query: 'DELETE FROM users WHERE inactive = true',
        connectionString: 'postgresql://localhost/test',
      });

      expect(result.success).toBe(true);
      expect(result.data?.rowCount).toBe(3);
    });
  });

  describe('execute - error handling', () => {
    it('should handle connection refused error', async () => {
      mockConnect.mockRejectedValue(new Error('connect ECONNREFUSED'));

      const result = await service.execute({
        query: 'SELECT 1',
        connectionString: 'postgresql://localhost/test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Could not connect to database');
    });

    it('should handle authentication failed error', async () => {
      mockConnect.mockRejectedValue(
        new Error('password authentication failed'),
      );

      const result = await service.execute({
        query: 'SELECT 1',
        connectionString: 'postgresql://localhost/test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('authentication failed');
    });

    it('should handle does not exist error', async () => {
      mockQuery
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('relation "users" does not exist'));

      const result = await service.execute({
        query: 'SELECT * FROM users',
        connectionString: 'postgresql://localhost/test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('does not exist');
    });

    it('should handle syntax error', async () => {
      mockQuery
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('syntax error at or near "SELEC"'));

      const result = await service.execute({
        query: 'SELECT * FROM',
        connectionString: 'postgresql://localhost/test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('syntax error');
    });

    it('should handle statement timeout', async () => {
      mockQuery
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('statement timeout'));

      const result = await service.execute({
        query: 'SELECT * FROM large_table',
        connectionString: 'postgresql://localhost/test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    });

    it('should always clean up pool on error', async () => {
      mockConnect.mockRejectedValue(new Error('Connection error'));

      await service.execute({
        query: 'SELECT 1',
        connectionString: 'postgresql://localhost/test',
      });

      expect(mockEnd).toHaveBeenCalled();
    });

    it('should handle non-Error exceptions', async () => {
      mockConnect.mockRejectedValue('String error');

      const result = await service.execute({
        query: 'SELECT 1',
        connectionString: 'postgresql://localhost/test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('String error');
    });
  });

  describe('testConnection', () => {
    it('should return success for valid connection', async () => {
      mockQuery.mockResolvedValue({ rows: [{ '?column?': 1 }] });

      const result = await service.testConnection(
        'postgresql://localhost/test',
      );

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return error for invalid connection', async () => {
      mockConnect.mockRejectedValue(new Error('ECONNREFUSED'));

      const result = await service.testConnection('postgresql://invalid/test');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should clean up pool after test', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await service.testConnection('postgresql://localhost/test');

      expect(mockEnd).toHaveBeenCalled();
    });
  });
});
