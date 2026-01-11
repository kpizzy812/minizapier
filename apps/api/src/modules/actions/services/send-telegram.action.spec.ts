import { SendTelegramAction } from './send-telegram.action';

// Mock grammY
jest.mock('grammy', () => ({
  Api: jest.fn().mockImplementation(() => ({
    sendMessage: jest.fn(),
    getMe: jest.fn(),
  })),
}));

import { Api } from 'grammy';

describe('SendTelegramAction', () => {
  let service: SendTelegramAction;
  let mockApiInstance: { sendMessage: jest.Mock; getMe: jest.Mock };

  beforeEach(() => {
    service = new SendTelegramAction();

    mockApiInstance = {
      sendMessage: jest.fn(),
      getMe: jest.fn(),
    };

    (Api as jest.MockedClass<typeof Api>).mockImplementation(
      () => mockApiInstance as unknown as Api,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute - validation', () => {
    it('should return error when botToken is missing', async () => {
      const result = await service.execute({
        chatId: '123456',
        message: 'Hello',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('bot token is required');
    });

    it('should return error when chatId is missing', async () => {
      const result = await service.execute({
        chatId: '',
        message: 'Hello',
        botToken: 'token123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Chat ID is required');
    });

    it('should return error when message is empty', async () => {
      const result = await service.execute({
        chatId: '123456',
        message: '',
        botToken: 'token123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Message cannot be empty');
    });

    it('should return error when message is whitespace only', async () => {
      const result = await service.execute({
        chatId: '123456',
        message: '   ',
        botToken: 'token123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Message cannot be empty');
    });
  });

  describe('execute - successful sending', () => {
    beforeEach(() => {
      mockApiInstance.sendMessage.mockResolvedValue({
        message_id: 123,
        chat: { id: 456 },
        date: Date.now(),
      });
    });

    it('should send message successfully', async () => {
      const result = await service.execute({
        chatId: '123456789',
        message: 'Hello, Telegram!',
        botToken: 'bot_token_123',
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        messageId: 123,
        chatId: '123456789',
      });
      expect(Api).toHaveBeenCalledWith('bot_token_123');
      expect(mockApiInstance.sendMessage).toHaveBeenCalledWith(
        '123456789',
        'Hello, Telegram!',
        {},
      );
    });

    it('should send message with HTML parse mode', async () => {
      const result = await service.execute({
        chatId: '123456789',
        message: '<b>Bold</b> and <i>italic</i>',
        parseMode: 'HTML',
        botToken: 'bot_token_123',
      });

      expect(result.success).toBe(true);
      expect(mockApiInstance.sendMessage).toHaveBeenCalledWith(
        '123456789',
        '<b>Bold</b> and <i>italic</i>',
        { parse_mode: 'HTML' },
      );
    });

    it('should send message with Markdown parse mode', async () => {
      const result = await service.execute({
        chatId: '123456789',
        message: '*Bold* and _italic_',
        parseMode: 'Markdown',
        botToken: 'bot_token_123',
      });

      expect(result.success).toBe(true);
      expect(mockApiInstance.sendMessage).toHaveBeenCalledWith(
        '123456789',
        '*Bold* and _italic_',
        { parse_mode: 'Markdown' },
      );
    });

    it('should send message with MarkdownV2 parse mode', async () => {
      const result = await service.execute({
        chatId: '123456789',
        message: '*Bold* and _italic_',
        parseMode: 'MarkdownV2',
        botToken: 'bot_token_123',
      });

      expect(result.success).toBe(true);
      expect(mockApiInstance.sendMessage).toHaveBeenCalledWith(
        '123456789',
        '*Bold* and _italic_',
        { parse_mode: 'MarkdownV2' },
      );
    });

    it('should handle numeric chat ID', async () => {
      const result = await service.execute({
        chatId: '-100123456789',
        message: 'Group message',
        botToken: 'bot_token_123',
      });

      expect(result.success).toBe(true);
      expect(mockApiInstance.sendMessage).toHaveBeenCalledWith(
        '-100123456789',
        'Group message',
        {},
      );
    });
  });

  describe('execute - error handling', () => {
    it('should handle chat not found error', async () => {
      mockApiInstance.sendMessage.mockRejectedValue(
        new Error('chat not found'),
      );

      const result = await service.execute({
        chatId: '999999',
        message: 'Hello',
        botToken: 'bot_token',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Chat not found. Please verify the chat ID.');
    });

    it('should handle bot blocked error', async () => {
      mockApiInstance.sendMessage.mockRejectedValue(
        new Error('Forbidden: bot was blocked by the user'),
      );

      const result = await service.execute({
        chatId: '123456',
        message: 'Hello',
        botToken: 'bot_token',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Bot was blocked by the user.');
    });

    it('should handle unauthorized error', async () => {
      mockApiInstance.sendMessage.mockRejectedValue(new Error('Unauthorized'));

      const result = await service.execute({
        chatId: '123456',
        message: 'Hello',
        botToken: 'invalid_token',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'Invalid bot token. Please check your credentials.',
      );
    });

    it('should handle message too long error', async () => {
      mockApiInstance.sendMessage.mockRejectedValue(
        new Error('message is too long'),
      );

      const result = await service.execute({
        chatId: '123456',
        message: 'x'.repeat(5000),
        botToken: 'bot_token',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'Message is too long. Maximum length is 4096 characters.',
      );
    });

    it('should handle generic errors', async () => {
      mockApiInstance.sendMessage.mockRejectedValue(
        new Error('Some unknown error'),
      );

      const result = await service.execute({
        chatId: '123456',
        message: 'Hello',
        botToken: 'bot_token',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Some unknown error');
    });

    it('should handle non-Error exceptions', async () => {
      mockApiInstance.sendMessage.mockRejectedValue('String error');

      const result = await service.execute({
        chatId: '123456',
        message: 'Hello',
        botToken: 'bot_token',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('String error');
    });
  });
});
