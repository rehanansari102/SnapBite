import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import * as jwt from 'jsonwebtoken';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@nestjs/common').SetMetadata(IS_PUBLIC_KEY, true);

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private configService: ConfigService,
    private reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();

    // Public routes — no token required
    const PUBLIC_AUTH_PATHS = [
      '/api/auth/register',
      '/api/auth/login',
      '/api/auth/refresh',
      '/api/auth/logout',
      '/api/auth/forgot-password',
      '/api/auth/reset-password',
      '/api/auth/verify-email',
      '/api/auth/resend-verification',
    ];
    if (PUBLIC_AUTH_PATHS.some(p => request.path.startsWith(p))) return true;
    const isPublicRestaurantRoute = request.method === 'GET'
      && request.path.startsWith('/api/restaurants')
      && !request.path.includes('/my')
      && !request.path.includes('/pending')
      && !request.path.endsWith('/reviews/me');
    if (isPublicRestaurantRoute) return true;
    if (request.method === 'GET' && request.path.startsWith('/api/menus')) return true;
    if (request.path === '/api/orders/stripe/webhook') return true;

    const token = this.extractToken(request);

    if (!token) throw new UnauthorizedException('No token provided');

    try {
      const secret = this.configService.getOrThrow<string>('JWT_SECRET');
      const payload = jwt.verify(token, secret) as jwt.JwtPayload;
      request.user = {
        userId: payload.sub,
        email: payload.email,
        role: payload.role,
      };
      request.headers['x-user-id'] = payload.sub;
      request.headers['x-user-role'] = payload.role;
      request.headers['x-user-email'] = payload.email ?? '';
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractToken(request: Request & { headers: Record<string, string>; cookies?: Record<string, string> }): string | null {
    const authHeader = request.headers['authorization'];
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }
    // Also support httpOnly cookie (same pattern as CloudShelf)
    return request.cookies?.['access_token'] ?? null;
  }
}
