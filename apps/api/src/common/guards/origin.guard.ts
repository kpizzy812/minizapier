import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../../modules/auth/auth.guard';

/**
 * Guard to validate Origin/Referer headers for CSRF-like protection.
 * Blocks requests from unauthorized origins on state-changing methods.
 */
@Injectable()
export class OriginGuard implements CanActivate {
  private readonly allowedOrigins: string[];

  constructor(
    private readonly configService: ConfigService,
    private readonly reflector: Reflector,
  ) {
    // Get allowed origins from CORS_ORIGIN env var
    const corsOrigin = this.configService.get<string>('CORS_ORIGIN') || '';
    this.allowedOrigins = corsOrigin
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);

    // Always allow localhost in development
    if (process.env.NODE_ENV !== 'production') {
      this.allowedOrigins.push(
        'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
      );
    }
  }

  canActivate(context: ExecutionContext): boolean {
    // Skip for public routes (webhooks, etc.)
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();

    // Only check state-changing methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      return true;
    }

    const origin = request.headers.origin;
    const referer = request.headers.referer;

    // If no origin/referer, it's likely a same-origin request or API client
    // Allow if Authorization header is present (API clients)
    if (!origin && !referer) {
      if (request.headers.authorization) {
        return true;
      }
      // Block requests without origin and without auth
      throw new ForbiddenException('Origin header required');
    }

    // Validate origin
    if (origin && !this.isAllowedOrigin(origin)) {
      throw new ForbiddenException(`Origin not allowed: ${origin}`);
    }

    // Validate referer if no origin
    if (!origin && referer) {
      try {
        const refererUrl = new URL(referer);
        const refererOrigin = refererUrl.origin;
        if (!this.isAllowedOrigin(refererOrigin)) {
          throw new ForbiddenException(`Referer not allowed: ${refererOrigin}`);
        }
      } catch {
        throw new ForbiddenException('Invalid referer header');
      }
    }

    return true;
  }

  private isAllowedOrigin(origin: string): boolean {
    return this.allowedOrigins.some(
      (allowed) =>
        allowed === origin ||
        allowed === '*' ||
        (allowed.startsWith('*.') && origin.endsWith(allowed.slice(1))),
    );
  }
}
