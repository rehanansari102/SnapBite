import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  Res,
  Req,
  HttpCode,
  HttpStatus,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ApplyOwnerDto } from './dto/apply-owner.dto';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.register(dto);
    this.setTokenCookies(res, result.accessToken, result.refreshToken);
    return { accessToken: result.accessToken, user: result.user };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto);
    this.setTokenCookies(res, result.accessToken, result.refreshToken);
    return { accessToken: result.accessToken, user: result.user };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.['refresh_token'];
    const result = await this.authService.refresh(refreshToken);
    this.setTokenCookies(res, result.accessToken, result.refreshToken);
    return { accessToken: result.accessToken, user: result.user };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const authHeader = req.headers['authorization'] as string;
    const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';
    const userId = (req as Request & { user?: { userId: string } }).user?.userId ?? '';

    await this.authService.logout(userId, accessToken);
    res.clearCookie('refresh_token', COOKIE_OPTIONS);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto);
    // Always return the same message to prevent email enumeration
    return { message: 'If that email exists, a reset link has been sent.' };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto);
    return { message: 'Password updated successfully. Please log in.' };
  }

  @Get('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Query('token') token: string) {
    if (!token) return { success: false, message: 'Missing token' };
    const tokens = await this.authService.verifyEmail(token);
    return { success: true, message: 'Email verified successfully.', ...tokens };
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  async resendVerification(@Req() req: Request) {
    // x-user-id is injected by the API Gateway after JWT auth
    const userId = (req.headers as Record<string, string>)['x-user-id'];
    if (!userId) return { message: 'Please log in to resend verification.' };
    await this.authService.resendVerification(userId);
    return { message: 'Verification email sent.' };
  }

  private setTokenCookies(res: Response, accessToken: string, refreshToken: string) {
    res.cookie('access_token', accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 15 * 60 * 1000,
    });
    res.cookie('refresh_token', refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  @Post('apply-owner')
  @HttpCode(HttpStatus.OK)
  async applyForOwner(@Req() req: Request, @Body() dto: ApplyOwnerDto) {
    const userId = (req.headers as Record<string, string>)['x-user-id'];
    if (!userId) throw new UnauthorizedException('Please log in');
    return this.authService.applyForOwner(userId, dto.businessName);
  }

  @Get('admin/applications')
  async getPendingApplications(@Req() req: Request) {
    if ((req.headers as Record<string, string>)['x-user-role'] !== 'admin') {
      throw new ForbiddenException('Admin only');
    }
    return this.authService.getPendingOwnerApplications();
  }

  @Patch('admin/users/:id/role')
  @HttpCode(HttpStatus.OK)
  async reviewApplication(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: { approve: boolean },
  ) {
    if ((req.headers as Record<string, string>)['x-user-role'] !== 'admin') {
      throw new ForbiddenException('Admin only');
    }
    return this.authService.reviewOwnerApplication(id, body.approve);
  }

  @Get('admin/users')
  getAllUsers(
    @Req() req: Request & { headers: Record<string, string> },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (req.headers['x-user-role'] !== 'admin') throw new ForbiddenException();
    return this.authService.getAllUsers(page ? Number(page) : 1, limit ? Number(limit) : 20);
  }

  @Patch('admin/users/:id/ban')
  banUser(
    @Req() req: Request & { headers: Record<string, string> },
    @Param('id') id: string,
  ) {
    if (req.headers['x-user-role'] !== 'admin') throw new ForbiddenException();
    return this.authService.banUser(id, req.headers['x-user-id']);
  }

  // Internal service-to-service endpoint — called by order-service to get driver list
  @Get('internal/drivers')
  listDrivers() {
    return this.authService.listDrivers();
  }

  // gRPC method — called by API Gateway to verify tokens
  @GrpcMethod('AuthService', 'VerifyToken')
  async verifyToken(data: { token: string }) {
    return this.authService.verifyToken(data.token);
  }
}
