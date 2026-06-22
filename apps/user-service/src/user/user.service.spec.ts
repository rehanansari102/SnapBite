import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserService } from './user.service';
import { UserProfile } from './schemas/user-profile.schema';
import { RedisService } from './redis.service';

function makeProfile(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    userId: 'user-1',
    email: 'user@example.com',
    displayName: 'Test User',
    addresses: [],
    ...overrides,
  };
}

describe('UserService', () => {
  let service: UserService;
  let profileModel: { findOneAndUpdate: jest.Mock; updateOne: jest.Mock };
  let redisService: { get: jest.Mock; set: jest.Mock; del: jest.Mock };

  beforeEach(async () => {
    profileModel = {
      findOneAndUpdate: jest.fn(),
      updateOne: jest.fn().mockResolvedValue({}),
    };

    redisService = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getModelToken(UserProfile.name), useValue: profileModel },
        { provide: RedisService, useValue: redisService },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('300') } },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  afterEach(() => jest.resetAllMocks());

  // ── getOrCreateProfile ────────────────────────────────────────────────────────

  describe('getOrCreateProfile', () => {
    it('returns cached profile without hitting the database', async () => {
      const profile = makeProfile();
      redisService.get.mockResolvedValue(JSON.stringify(profile));

      const result = await service.getOrCreateProfile('user-1', 'user@example.com');

      expect(result.userId).toBe('user-1');
      expect(profileModel.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('upserts in DB on cache miss and caches the result', async () => {
      const profile = makeProfile();
      profileModel.findOneAndUpdate.mockReturnValue({ exec: async () => profile });

      const result = await service.getOrCreateProfile('user-1', 'user@example.com');

      expect(profileModel.findOneAndUpdate).toHaveBeenCalledWith(
        { userId: 'user-1' },
        { $setOnInsert: { userId: 'user-1', email: 'user@example.com' } },
        { upsert: true, new: true, lean: true },
      );
      expect(redisService.set).toHaveBeenCalledWith('user:profile:user-1', JSON.stringify(profile), 300);
      expect(result.email).toBe('user@example.com');
    });
  });

  // ── updateProfile ─────────────────────────────────────────────────────────────

  describe('updateProfile', () => {
    it('updates fields and invalidates cache', async () => {
      const updated = makeProfile({ displayName: 'New Name' });
      profileModel.findOneAndUpdate.mockReturnValue({ exec: async () => updated });

      const result = await service.updateProfile('user-1', { displayName: 'New Name' } as any);

      expect(redisService.del).toHaveBeenCalledWith('user:profile:user-1');
      expect((result as any).displayName).toBe('New Name');
    });

    it('throws NotFoundException when profile does not exist', async () => {
      profileModel.findOneAndUpdate.mockReturnValue({ exec: async () => null });

      await expect(service.updateProfile('user-1', {} as any)).rejects.toThrow(NotFoundException);
    });
  });

  // ── addAddress ────────────────────────────────────────────────────────────────

  describe('addAddress', () => {
    const dto = { street: '1 Main St', city: 'Karachi', country: 'PK', isDefault: false };

    it('adds address and invalidates cache without touching defaults', async () => {
      const profile = makeProfile({ addresses: [{ id: 'addr-1', street: '1 Main St' }] });
      profileModel.findOneAndUpdate.mockReturnValue({ exec: async () => profile });

      await service.addAddress('user-1', dto as any);

      expect(profileModel.updateOne).not.toHaveBeenCalled();
      expect(redisService.del).toHaveBeenCalledWith('user:profile:user-1');
    });

    it('unsets other default addresses when isDefault is true', async () => {
      const profile = makeProfile();
      profileModel.findOneAndUpdate.mockReturnValue({ exec: async () => profile });

      await service.addAddress('user-1', { ...dto, isDefault: true } as any);

      expect(profileModel.updateOne).toHaveBeenCalledWith(
        { userId: 'user-1' },
        { $set: { 'addresses.$[].isDefault': false } },
      );
    });

    it('throws NotFoundException when profile does not exist', async () => {
      profileModel.findOneAndUpdate.mockReturnValue({ exec: async () => null });

      await expect(service.addAddress('user-1', dto as any)).rejects.toThrow(NotFoundException);
    });
  });

  // ── removeAddress ─────────────────────────────────────────────────────────────

  describe('removeAddress', () => {
    it('removes the address and invalidates cache', async () => {
      const profile = makeProfile({ addresses: [] });
      profileModel.findOneAndUpdate.mockReturnValue({ exec: async () => profile });

      await service.removeAddress('user-1', 'addr-1');

      expect(profileModel.findOneAndUpdate).toHaveBeenCalledWith(
        { userId: 'user-1' },
        { $pull: { addresses: { id: 'addr-1' } } },
        { new: true, lean: true },
      );
      expect(redisService.del).toHaveBeenCalledWith('user:profile:user-1');
    });

    it('throws NotFoundException when profile does not exist', async () => {
      profileModel.findOneAndUpdate.mockReturnValue({ exec: async () => null });

      await expect(service.removeAddress('user-1', 'addr-1')).rejects.toThrow(NotFoundException);
    });
  });
});
