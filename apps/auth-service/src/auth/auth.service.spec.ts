import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User, UserRole } from './entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { RedisService } from './redis.service';
import { MailService } from './mail.service';

function makeUser(overrides: Partial<Record<string, unknown>> = {}): User {
  return {
    id: 'user-1',
    email: 'user@example.com',
    passwordHash: 'hashed_password',
    role: UserRole.CUSTOMER,
    isEmailVerified: true,
    isActive: true,
    emailVerificationToken: null,
    emailVerificationExpires: null,
    passwordResetToken: null,
    passwordResetExpires: null,
    ...overrides,
  } as User;
}

describe('AuthService', () => {
  let service: AuthService;
  let userRepo: { findOne: jest.Mock; save: jest.Mock; create: jest.Mock; update: jest.Mock };
  let tokenRepo: { findOne: jest.Mock; save: jest.Mock; create: jest.Mock; update: jest.Mock };
  let jwtService: { sign: jest.Mock; verify: jest.Mock; decode: jest.Mock };
  let redisService: { get: jest.Mock; set: jest.Mock };
  let mailService: { sendEmailVerification: jest.Mock; sendPasswordReset: jest.Mock };

  beforeEach(async () => {
    userRepo = { findOne: jest.fn(), save: jest.fn(), create: jest.fn(), update: jest.fn() };
    tokenRepo = {
      findOne: jest.fn(),
      save: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockReturnValue({}),
      update: jest.fn().mockResolvedValue({}),
    };
    jwtService = {
      sign: jest.fn().mockReturnValue('mock_jwt_token'),
      verify: jest.fn(),
      decode: jest.fn(),
    };
    redisService = { get: jest.fn().mockResolvedValue(null), set: jest.fn().mockResolvedValue(undefined) };
    mailService = {
      sendEmailVerification: jest.fn().mockResolvedValue(undefined),
      sendPasswordReset: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(RefreshToken), useValue: tokenRepo },
        { provide: JwtService, useValue: jwtService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('7d'),
            getOrThrow: jest.fn().mockReturnValue('test-secret'),
          },
        },
        { provide: RedisService, useValue: redisService },
        { provide: MailService, useValue: mailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    jest.spyOn(bcrypt, 'hash').mockImplementation(async () => 'hashed_password' as never);
    jest.spyOn(bcrypt, 'compare').mockImplementation(async () => false as never);
  });

  afterEach(() => jest.restoreAllMocks());

  // ── register ──────────────────────────────────────────────────────────────────

  describe('register', () => {
    it('throws ConflictException when email already exists', async () => {
      userRepo.findOne.mockResolvedValue(makeUser());

      await expect(
        service.register({ email: 'user@example.com', password: 'pass123' } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('hashes the password, saves the user, and sends a verification email', async () => {
      userRepo.findOne.mockResolvedValue(null);
      const user = makeUser({ isEmailVerified: false });
      userRepo.create.mockReturnValue(user);
      userRepo.save.mockResolvedValue(user);

      const result = await service.register({ email: 'new@example.com', password: 'pass123' } as any);

      expect(bcrypt.hash).toHaveBeenCalledWith('pass123', 12);
      expect(userRepo.save).toHaveBeenCalled();
      expect(mailService.sendEmailVerification).toHaveBeenCalled();
      expect(result.accessToken).toBe('mock_jwt_token');
    });
  });

  // ── login ─────────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('throws UnauthorizedException when user is not found', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.login({ email: 'x@x.com', password: 'pass' } as any)).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when password is wrong', async () => {
      userRepo.findOne.mockResolvedValue(makeUser());
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login({ email: 'user@example.com', password: 'wrong' } as any)).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when account is inactive', async () => {
      userRepo.findOne.mockResolvedValue(makeUser({ isActive: false }));
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(service.login({ email: 'user@example.com', password: 'pass' } as any)).rejects.toThrow(UnauthorizedException);
    });

    it('returns a token pair for valid credentials', async () => {
      userRepo.findOne.mockResolvedValue(makeUser());
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({ email: 'user@example.com', password: 'pass' } as any);

      expect(result.accessToken).toBe('mock_jwt_token');
      expect(result.user.email).toBe('user@example.com');
    });
  });

  // ── verifyEmail ───────────────────────────────────────────────────────────────

  describe('verifyEmail', () => {
    it('throws BadRequestException for an unknown token', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.verifyEmail('bad-token')).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException for an expired token', async () => {
      userRepo.findOne.mockResolvedValue(makeUser({
        emailVerificationToken: 'hashed',
        emailVerificationExpires: new Date(Date.now() - 1000),
      }));

      await expect(service.verifyEmail('some-token')).rejects.toThrow(BadRequestException);
    });

    it('marks email as verified and returns tokens', async () => {
      const user = makeUser({
        isEmailVerified: false,
        emailVerificationToken: 'hashed',
        emailVerificationExpires: new Date(Date.now() + 60_000),
      });
      userRepo.findOne.mockResolvedValue(user);
      userRepo.save.mockResolvedValue(user);

      const result = await service.verifyEmail('plain-token');

      expect(userRepo.save).toHaveBeenCalledWith(expect.objectContaining({ isEmailVerified: true }));
      expect(result.accessToken).toBe('mock_jwt_token');
    });
  });

  // ── forgotPassword ────────────────────────────────────────────────────────────

  describe('forgotPassword', () => {
    it('returns silently when email is not found (prevents enumeration)', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.forgotPassword({ email: 'unknown@x.com' } as any)).resolves.toBeUndefined();
      expect(mailService.sendPasswordReset).not.toHaveBeenCalled();
    });

    it('saves reset token and sends email when user exists', async () => {
      const user = makeUser();
      userRepo.findOne.mockResolvedValue(user);
      userRepo.save.mockResolvedValue(user);

      await service.forgotPassword({ email: 'user@example.com' } as any);

      expect(userRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ passwordResetToken: expect.any(String) }),
      );
      expect(mailService.sendPasswordReset).toHaveBeenCalled();
    });
  });

  // ── resetPassword ─────────────────────────────────────────────────────────────

  describe('resetPassword', () => {
    it('throws BadRequestException for an invalid token', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.resetPassword({ token: 'bad', password: 'new-pass' } as any)).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException for an expired reset token', async () => {
      userRepo.findOne.mockResolvedValue(makeUser({
        passwordResetToken: 'hashed',
        passwordResetExpires: new Date(Date.now() - 1000),
      }));

      await expect(service.resetPassword({ token: 'token', password: 'new-pass' } as any)).rejects.toThrow(BadRequestException);
    });

    it('hashes the new password, clears the token, and revokes all sessions', async () => {
      const user = makeUser({
        passwordResetToken: 'hashed',
        passwordResetExpires: new Date(Date.now() + 60_000),
      });
      userRepo.findOne.mockResolvedValue(user);
      userRepo.save.mockResolvedValue(user);

      await service.resetPassword({ token: 'valid-token', password: 'NewPass123!' } as any);

      expect(bcrypt.hash).toHaveBeenCalledWith('NewPass123!', 12);
      expect(userRepo.save).toHaveBeenCalledWith(expect.objectContaining({ passwordResetToken: null }));
      expect(tokenRepo.update).toHaveBeenCalledWith({ userId: user.id, revoked: false }, { revoked: true });
    });
  });

  // ── logout ────────────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('revokes all refresh tokens and blacklists the access token in Redis', async () => {
      jwtService.decode.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 });

      await service.logout('user-1', 'mock_access_token');

      expect(tokenRepo.update).toHaveBeenCalledWith({ userId: 'user-1', revoked: false }, { revoked: true });
      expect(redisService.set).toHaveBeenCalledWith('blacklist:mock_access_token', '1', expect.any(Number));
    });
  });

  // ── verifyToken ───────────────────────────────────────────────────────────────

  describe('verifyToken', () => {
    it('returns invalid without checking JWT when token is blacklisted', async () => {
      redisService.get.mockResolvedValue('1');

      const result = await service.verifyToken('blacklisted_token');

      expect(result.valid).toBe(false);
      expect(jwtService.verify).not.toHaveBeenCalled();
    });

    it('returns user info for a valid non-blacklisted token', async () => {
      jwtService.verify.mockReturnValue({ sub: 'user-1', email: 'user@example.com', role: 'customer' });

      const result = await service.verifyToken('valid_token');

      expect(result.valid).toBe(true);
      expect(result.userId).toBe('user-1');
      expect(result.role).toBe('customer');
    });
  });
});
