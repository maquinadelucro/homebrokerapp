/**
 * Security utilities for token handling and secret redaction
 */
import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';

// Redact sensitive data from logs
export function redactSecrets(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(redactSecrets);
  }

  const redacted = { ...obj };
  
  // Keys that should be redacted
  const sensitiveKeys = [
    'accessToken', 'access_token', 'refreshToken', 'refresh_token', 
    'token', 'password', 'secret', 'key', 'authorization', 'bearer',
    'jwt', 'sessionToken', 'csrf', 'api_key', 'client_secret'
  ];

  for (const key in redacted) {
    const lowerKey = key.toLowerCase();
    
    // Check if key contains sensitive information
    const isSensitive = sensitiveKeys.some(sensitiveKey => 
      lowerKey.includes(sensitiveKey.toLowerCase())
    );

    if (isSensitive && typeof redacted[key] === 'string') {
      // Show only first 6 and last 4 characters for tokens
      const value = redacted[key];
      if (value.length > 10) {
        redacted[key] = `${value.substring(0, 6)}...${value.substring(value.length - 4)}`;
      } else {
        redacted[key] = '[REDACTED]';
      }
    } else if (typeof redacted[key] === 'object') {
      redacted[key] = redactSecrets(redacted[key]);
    }
  }

  return redacted;
}

// Optimized logging system - only logs in development
export function debugLog(message: string, data?: any) {
  if (process.env.NODE_ENV === 'development') {
    if (data) {
      console.log(message, redactSecrets(data));
    } else {
      console.log(message);
    }
  }
}

// Error logging - always enabled but with redaction
export function errorLog(message: string, error?: any) {
  if (error) {
    console.error(message, redactSecrets(error));
  } else {
    console.error(message);
  }
}

// Legacy safeLog for backward compatibility
export function safeLog(message: string, data?: any) {
  debugLog(message, data);
}

// Check if string contains potentially sensitive data
export function containsSecrets(str: string): boolean {
  const patterns = [
    /eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*/g, // JWT pattern
    /Bearer\s+[A-Za-z0-9_-]+/gi,
    /sk_[A-Za-z0-9_-]+/g, // Stripe-like secret keys
    /pk_[A-Za-z0-9_-]+/g, // Stripe-like public keys
  ];

  return patterns.some(pattern => pattern.test(str));
}

// Crypto utilities for token encryption using AES-256-CTR
export class TokenCrypto {
  private static readonly ALGORITHM = 'aes-256-ctr';
  private static readonly IV_LENGTH = 16;
  private static readonly KEY_LENGTH = 32;

  // Get encryption key from environment or fail
  private static getEncryptionKey(): Buffer {
    const envKey = process.env.TOKEN_ENCRYPTION_KEY;
    if (!envKey) {
      throw new Error('TOKEN_ENCRYPTION_KEY must be set (64 hex chars for AES-256)');
    }
    
    if (envKey.length !== 64) {
      throw new Error('TOKEN_ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
    }
    
    try {
      return Buffer.from(envKey, 'hex');
    } catch (error) {
      throw new Error('TOKEN_ENCRYPTION_KEY must be valid hex string');
    }
  }

  static async encrypt(plaintext: string): Promise<string> {
    try {
      const key = this.getEncryptionKey();
      const iv = randomBytes(this.IV_LENGTH);
      
      const cipher = createCipheriv(this.ALGORITHM, key, iv);
      
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Combine IV + encrypted data
      const combined = Buffer.concat([iv, Buffer.from(encrypted, 'hex')]);
      return combined.toString('base64');
      
    } catch (error) {
      console.error('Failed to encrypt token:', error);
      // NO FALLBACK - fail secure
      throw new Error('Token encryption failed');
    }
  }

  static async decrypt(ciphertext: string): Promise<string> {
    try {
      const key = this.getEncryptionKey();
      const combined = Buffer.from(ciphertext, 'base64');
      
      if (combined.length < this.IV_LENGTH) {
        throw new Error('Invalid ciphertext length');
      }
      
      const iv = combined.subarray(0, this.IV_LENGTH);
      const encrypted = combined.subarray(this.IV_LENGTH);
      
      const decipher = createDecipheriv(this.ALGORITHM, key, iv);
      
      let decrypted = decipher.update(encrypted, undefined, 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
      
    } catch (error) {
      console.error('Token decryption failed:', error);
      throw new Error('Unable to decrypt token');
    }
  }

  // Generate a secure key for TOKEN_ENCRYPTION_KEY
  static generateKey(): string {
    return randomBytes(this.KEY_LENGTH).toString('hex');
  }
}