import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * Crypto Service - AES-256-GCM encryption for credentials
 *
 * Encryption format: iv:authTag:encryptedData (all base64)
 */
@Injectable()
export class CryptoService implements OnModuleInit {
  private readonly logger = new Logger(CryptoService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly ivLength = 16; // 128 bits
  private readonly authTagLength = 16; // 128 bits
  private encryptionKey!: Buffer;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    // Get encryption key from environment
    const keyString = this.configService.get<string>('ENCRYPTION_KEY');

    if (!keyString) {
      this.logger.warn(
        'ENCRYPTION_KEY not set! Using random key (data will be lost on restart)',
      );
      this.encryptionKey = crypto.randomBytes(32);
      return;
    }

    // Key should be 32 bytes (256 bits) in hex or base64 format
    if (keyString.length === 64) {
      // Hex format (64 chars = 32 bytes)
      this.encryptionKey = Buffer.from(keyString, 'hex');
    } else if (keyString.length === 44) {
      // Base64 format (44 chars = 32 bytes)
      this.encryptionKey = Buffer.from(keyString, 'base64');
    } else if (keyString.length === 32) {
      // Raw string (32 chars)
      this.encryptionKey = Buffer.from(keyString, 'utf8');
    } else {
      // Hash the key to get exactly 32 bytes
      this.encryptionKey = crypto
        .createHash('sha256')
        .update(keyString)
        .digest();
    }

    this.logger.log('Encryption key initialized');
  }

  /**
   * Encrypt data using AES-256-GCM
   * @param plaintext - Data to encrypt (string or object)
   * @returns Encrypted string in format: iv:authTag:encryptedData
   */
  encrypt(plaintext: string | object): string {
    const data =
      typeof plaintext === 'string' ? plaintext : JSON.stringify(plaintext);

    // Generate random IV
    const iv = crypto.randomBytes(this.ivLength);

    // Create cipher
    const cipher = crypto.createCipheriv(
      this.algorithm,
      this.encryptionKey,
      iv,
      {
        authTagLength: this.authTagLength,
      },
    );

    // Encrypt
    let encrypted = cipher.update(data, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    // Get auth tag
    const authTag = cipher.getAuthTag();

    // Combine: iv:authTag:encryptedData
    return [iv.toString('base64'), authTag.toString('base64'), encrypted].join(
      ':',
    );
  }

  /**
   * Decrypt data encrypted with AES-256-GCM
   * @param ciphertext - Encrypted string in format: iv:authTag:encryptedData
   * @returns Decrypted string
   */
  decrypt(ciphertext: string): string {
    try {
      const parts = ciphertext.split(':');

      if (parts.length !== 3) {
        throw new Error('Invalid ciphertext format');
      }

      const [ivBase64, authTagBase64, encrypted] = parts;

      const iv = Buffer.from(ivBase64, 'base64');
      const authTag = Buffer.from(authTagBase64, 'base64');

      // Create decipher
      const decipher = crypto.createDecipheriv(
        this.algorithm,
        this.encryptionKey,
        iv,
        { authTagLength: this.authTagLength },
      );

      // Set auth tag
      decipher.setAuthTag(authTag);

      // Decrypt
      let decrypted = decipher.update(encrypted, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      this.logger.error(
        `Decryption failed: ${error instanceof Error ? error.message : error}`,
      );
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Encrypt and return parsed JSON object
   */
  encryptJson(data: object): string {
    return this.encrypt(JSON.stringify(data));
  }

  /**
   * Decrypt and parse as JSON
   */
  decryptJson<T = unknown>(ciphertext: string): T {
    const decrypted = this.decrypt(ciphertext);
    return JSON.parse(decrypted) as T;
  }

  /**
   * Generate a random encryption key (for setup)
   */
  static generateKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}
