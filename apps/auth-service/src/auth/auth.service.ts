import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomBytes, createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { User, UserRole, OwnerApplicationStatus } from './entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RedisService } from './redis.service';
import { MailService } from './mail.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(RefreshToken) private tokenRepo: Repository<RefreshToken>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private redisService: RedisService,
    private mailService: MailService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const plainToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(plainToken).digest('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = this.userRepo.create({
      email: dto.email,
      passwordHash,
      role: UserRole.CUSTOMER,
      isEmailVerified: false,
      emailVerificationToken: tokenHash,
      emailVerificationExpires: expires,
    });
    await this.userRepo.save(user);

    const appUrl = this.configService.get('APP_URL', 'http://localhost:3010');
    const verifyLink = `${appUrl}/verify-email?token=${plainToken}`;
    // Fire-and-forget — don't block registration if email fails
    this.mailService.sendEmailVerification(user.email, verifyLink).catch((err) =>
      console.error('Failed to send verification email:', err),
    );

    return this.generateTokenPair(user);
  }

  async login(dto: LoginDto) {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    if (!user.isActive) throw new UnauthorizedException('Account is disabled');

    return this.generateTokenPair(user);
  }

  async refresh(refreshToken: string) {
    let payload: { sub: string; jti: string };
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.getOrThrow('JWT_SECRET'),
      }) as { sub: string; jti: string };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokenRecord = await this.tokenRepo.findOne({
      where: { id: payload.jti, userId: payload.sub, revoked: false },
    });
    if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired or revoked');
    }

    const user = await this.userRepo.findOne({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException('User not found');

    // Rotate: revoke old token, issue new pair
    tokenRecord.revoked = true;
    await this.tokenRepo.save(tokenRecord);

    return this.generateTokenPair(user);
  }

  async verifyEmail(token: string) {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const user = await this.userRepo.findOne({
      where: { emailVerificationToken: tokenHash },
    });

    if (!user || !user.emailVerificationExpires || user.emailVerificationExpires < new Date()) {
      throw new BadRequestException('Verification link is invalid or has expired');
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await this.userRepo.save(user);

    return this.generateTokenPair(user);
  }

  async resendVerification(userId: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');
    if (user.isEmailVerified) throw new BadRequestException('Email is already verified');

    const plainToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(plainToken).digest('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    user.emailVerificationToken = tokenHash;
    user.emailVerificationExpires = expires;
    await this.userRepo.save(user);

    const appUrl = this.configService.get('APP_URL', 'http://localhost:3010');
    const verifyLink = `${appUrl}/verify-email?token=${plainToken}`;
    await this.mailService.sendEmailVerification(user.email, verifyLink);
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });
    // Always respond with success to avoid email enumeration
    if (!user) return;
    const plainToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(plainToken).digest('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    user.passwordResetToken = tokenHash;
    user.passwordResetExpires = expires;
    await this.userRepo.save(user);

    const appUrl = this.configService.get('APP_URL', 'http://localhost:3010');
    const resetLink = `${appUrl}/reset-password?token=${plainToken}`;
    await this.mailService.sendPasswordReset(user.email, resetLink);
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const tokenHash = createHash('sha256').update(dto.token).digest('hex');
    const user = await this.userRepo.findOne({
      where: { passwordResetToken: tokenHash },
    });

    if (!user || !user.passwordResetExpires || user.passwordResetExpires < new Date()) {
      throw new BadRequestException('Reset token is invalid or has expired');
    }

    user.passwordHash = await bcrypt.hash(dto.password, 12);
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await this.userRepo.save(user);

    // Revoke all active sessions for this user
    await this.tokenRepo.update({ userId: user.id, revoked: false }, { revoked: true });
  }

  async logout(userId: string, accessToken: string) {
    // Revoke all refresh tokens for this user
    await this.tokenRepo.update({ userId, revoked: false }, { revoked: true });

    // Blacklist the access token in Redis until it expires
    try {
      const payload = this.jwtService.decode(accessToken) as { exp: number };
      if (payload?.exp) {
        const ttl = payload.exp - Math.floor(Date.now() / 1000);
        if (ttl > 0) {
          await this.redisService.set(`blacklist:${accessToken}`, '1', ttl);
        }
      }
    } catch {
      // Best-effort blacklist
    }
  }

  async verifyToken(token: string) {
    // Check blacklist first
    const blacklisted = await this.redisService.get(`blacklist:${token}`);
    if (blacklisted) return { valid: false, userId: '', email: '', role: '' };

    try {
      const payload = this.jwtService.verify(token) as {
        sub: string;
        email: string;
        role: string;
      };
      return { valid: true, userId: payload.sub, email: payload.email, role: payload.role };
    } catch {
      return { valid: false, userId: '', email: '', role: '' };
    }
  }

  private async generateTokenPair(user: User) {
    const jti = uuidv4();
    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
    });

    const refreshExpiresIn = this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d');
    const refreshToken = this.jwtService.sign(
      { sub: user.id, jti },
      { expiresIn: refreshExpiresIn },
    );

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const tokenHash = await bcrypt.hash(refreshToken, 10);
    await this.tokenRepo.save(
      this.tokenRepo.create({ id: jti, userId: user.id, tokenHash, expiresAt }),
    );

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, role: user.role },
    };
  }

  async applyForOwner(userId: string, businessName: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');
    if (user.role !== UserRole.CUSTOMER) throw new BadRequestException('Only customers can apply');
    if (user.ownerApplicationStatus === OwnerApplicationStatus.PENDING) {
      throw new ConflictException('You already have a pending application');
    }
    await this.userRepo.update(userId, {
      ownerApplicationStatus: OwnerApplicationStatus.PENDING,
      businessName,
    });
    return { message: 'Application submitted. You will be notified once reviewed.' };
  }

  async getPendingOwnerApplications() {
    return this.userRepo.find({
      where: { ownerApplicationStatus: OwnerApplicationStatus.PENDING },
      select: ['id', 'email', 'businessName', 'createdAt'],
      order: { createdAt: 'ASC' },
    });
  }

  async reviewOwnerApplication(userId: string, approve: boolean) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');
    if (user.ownerApplicationStatus !== OwnerApplicationStatus.PENDING) {
      throw new BadRequestException('No pending application for this user');
    }
    await this.userRepo.update(userId, {
      ownerApplicationStatus: approve ? OwnerApplicationStatus.APPROVED : OwnerApplicationStatus.REJECTED,
      ...(approve && { role: UserRole.RESTAURANT_OWNER }),
    });
    return { message: approve ? 'User promoted to restaurant owner' : 'Application rejected' };
  }

  async getAllUsers(page = 1, limit = 20) {
    const [users, total] = await this.userRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      select: ['id', 'email', 'role', 'isActive', 'isEmailVerified', 'ownerApplicationStatus', 'businessName', 'createdAt'],
    });
    return { users, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async banUser(targetId: string, adminId: string) {
    if (targetId === adminId) throw new BadRequestException('Cannot ban yourself');
    const user = await this.userRepo.findOne({ where: { id: targetId } });
    if (!user) throw new BadRequestException('User not found');
    if (user.role === UserRole.ADMIN) throw new BadRequestException('Cannot ban another admin');
    await this.userRepo.update(targetId, { isActive: !user.isActive });
    return { isActive: !user.isActive };
  }
}
