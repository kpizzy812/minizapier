/* eslint-disable @typescript-eslint/unbound-method */

// Mock Prisma client before importing services
jest.mock('../../../generated/prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({})),
  Prisma: { InputJsonValue: {} },
}));

jest.mock('@prisma/adapter-pg', () => ({
  PrismaPg: jest.fn().mockImplementation(() => ({})),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CredentialsController } from './credentials.controller';
import { CredentialsService } from './credentials.service';
import { CredentialType } from './dto/credentials.dto';

describe('CredentialsController', () => {
  let controller: CredentialsController;
  let service: jest.Mocked<CredentialsService>;

  const mockCredentialResponse = {
    id: 'cred-123',
    name: 'Test Credential',
    type: CredentialType.TELEGRAM,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    const mockCredentialsService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      testCredential: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CredentialsController],
      providers: [
        { provide: CredentialsService, useValue: mockCredentialsService },
      ],
    }).compile();

    controller = module.get<CredentialsController>(CredentialsController);
    service = module.get(CredentialsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a credential', async () => {
      service.create.mockResolvedValue(mockCredentialResponse);

      const result = await controller.create('user-123', {
        name: 'Test Credential',
        type: CredentialType.TELEGRAM,
        data: { botToken: 'token' },
      });

      expect(result).toEqual({
        data: mockCredentialResponse,
        message: 'Credential created successfully',
      });
      expect(service.create).toHaveBeenCalledWith('user-123', {
        name: 'Test Credential',
        type: CredentialType.TELEGRAM,
        data: { botToken: 'token' },
      });
    });
  });

  describe('findAll', () => {
    it('should return all credentials for user', async () => {
      service.findAll.mockResolvedValue([mockCredentialResponse]);

      const result = await controller.findAll('user-123');

      expect(result).toEqual({ data: [mockCredentialResponse] });
      expect(service.findAll).toHaveBeenCalledWith('user-123');
    });

    it('should return empty array when no credentials', async () => {
      service.findAll.mockResolvedValue([]);

      const result = await controller.findAll('user-123');

      expect(result).toEqual({ data: [] });
    });
  });

  describe('findOne', () => {
    it('should return a credential by id', async () => {
      service.findOne.mockResolvedValue(mockCredentialResponse);

      const result = await controller.findOne('user-123', 'cred-123');

      expect(result).toEqual({ data: mockCredentialResponse });
      expect(service.findOne).toHaveBeenCalledWith('cred-123', 'user-123');
    });

    it('should throw when credential not found', async () => {
      service.findOne.mockRejectedValue(
        new NotFoundException('Credential not found'),
      );

      await expect(controller.findOne('user-123', 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a credential', async () => {
      const updatedCredential = {
        ...mockCredentialResponse,
        name: 'Updated Name',
      };
      service.update.mockResolvedValue(updatedCredential);

      const result = await controller.update('user-123', 'cred-123', {
        name: 'Updated Name',
      });

      expect(result).toEqual({
        data: updatedCredential,
        message: 'Credential updated successfully',
      });
      expect(service.update).toHaveBeenCalledWith('cred-123', 'user-123', {
        name: 'Updated Name',
      });
    });

    it('should throw when credential not found', async () => {
      service.update.mockRejectedValue(
        new NotFoundException('Credential not found'),
      );

      await expect(
        controller.update('user-123', 'missing', {
          name: 'New',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a credential', async () => {
      service.remove.mockResolvedValue(undefined);

      const result = await controller.remove('user-123', 'cred-123');

      expect(result).toEqual({ message: 'Credential deleted successfully' });
      expect(service.remove).toHaveBeenCalledWith('cred-123', 'user-123');
    });

    it('should throw when credential not found', async () => {
      service.remove.mockRejectedValue(
        new NotFoundException('Credential not found'),
      );

      await expect(controller.remove('user-123', 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('test', () => {
    it('should test a credential successfully', async () => {
      service.testCredential.mockResolvedValue({
        success: true,
        message: 'Connected to Telegram bot: @test_bot',
      });

      const result = await controller.test('user-123', 'cred-123');

      expect(result).toEqual({
        success: true,
        message: 'Connected to Telegram bot: @test_bot',
      });
      expect(service.testCredential).toHaveBeenCalledWith(
        'cred-123',
        'user-123',
      );
    });

    it('should return failure for invalid credential', async () => {
      service.testCredential.mockResolvedValue({
        success: false,
        message: 'Invalid bot token',
      });

      const result = await controller.test('user-123', 'cred-123');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid bot token');
    });

    it('should throw when credential not found', async () => {
      service.testCredential.mockRejectedValue(
        new NotFoundException('Credential not found'),
      );

      await expect(controller.test('user-123', 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
