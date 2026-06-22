import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MenuService } from './menu.service';
import { MenuItem } from './schemas/menu-item.schema';
import { RedisService } from './redis.service';

function makeItem(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    _id: 'item-1',
    restaurantId: 'restaurant-1',
    name: 'Burger',
    price: 500,
    isAvailable: true,
    ...overrides,
  };
}

describe('MenuService', () => {
  let service: MenuService;
  let menuItemModel: { create: jest.Mock; find: jest.Mock; findOneAndUpdate: jest.Mock; deleteOne: jest.Mock };
  let redisService: { get: jest.Mock; set: jest.Mock; del: jest.Mock };

  beforeEach(async () => {
    menuItemModel = {
      create: jest.fn(),
      find: jest.fn(),
      findOneAndUpdate: jest.fn(),
      deleteOne: jest.fn(),
    };

    redisService = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MenuService,
        { provide: getModelToken(MenuItem.name), useValue: menuItemModel },
        { provide: RedisService, useValue: redisService },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('600') } },
      ],
    }).compile();

    service = module.get<MenuService>(MenuService);
  });

  afterEach(() => jest.resetAllMocks());

  // ── addItem ──────────────────────────────────────────────────────────────────

  describe('addItem', () => {
    it('creates an item and invalidates the restaurant cache', async () => {
      const item = makeItem();
      menuItemModel.create.mockResolvedValue({ toObject: () => item });

      const result = await service.addItem('restaurant-1', { name: 'Burger', price: 500 } as any);

      expect(menuItemModel.create).toHaveBeenCalledWith(expect.objectContaining({ restaurantId: 'restaurant-1' }));
      expect(redisService.del).toHaveBeenCalledWith('menu:restaurant-1');
      expect(result.name).toBe('Burger');
    });
  });

  // ── getMenu ───────────────────────────────────────────────────────────────────

  describe('getMenu', () => {
    it('returns cached items without hitting the database', async () => {
      const items = [makeItem()];
      redisService.get.mockResolvedValue(JSON.stringify(items));

      const result = await service.getMenu('restaurant-1');

      expect(result).toHaveLength(1);
      expect(menuItemModel.find).not.toHaveBeenCalled();
    });

    it('fetches from DB on cache miss and stores result in cache', async () => {
      const items = [makeItem()];
      menuItemModel.find.mockReturnValue({ lean: () => items });

      const result = await service.getMenu('restaurant-1');

      expect(menuItemModel.find).toHaveBeenCalledWith({ restaurantId: 'restaurant-1', isAvailable: true });
      expect(redisService.set).toHaveBeenCalledWith('menu:restaurant-1', JSON.stringify(items), 600);
      expect(result).toHaveLength(1);
    });
  });

  // ── updateItem ────────────────────────────────────────────────────────────────

  describe('updateItem', () => {
    it('updates the item and invalidates the cache', async () => {
      const updated = makeItem({ name: 'Updated Burger' });
      menuItemModel.findOneAndUpdate.mockReturnValue({ exec: async () => updated });

      const result = await service.updateItem('restaurant-1', 'item-1', { name: 'Updated Burger' } as any);

      expect(redisService.del).toHaveBeenCalledWith('menu:restaurant-1');
      expect((result as any).name).toBe('Updated Burger');
    });

    it('throws NotFoundException when item does not exist', async () => {
      menuItemModel.findOneAndUpdate.mockReturnValue({ exec: async () => null });

      await expect(service.updateItem('restaurant-1', 'bad-id', {} as any)).rejects.toThrow(NotFoundException);
    });
  });

  // ── deleteItem ────────────────────────────────────────────────────────────────

  describe('deleteItem', () => {
    it('deletes the item and invalidates the cache', async () => {
      menuItemModel.deleteOne.mockResolvedValue({ deletedCount: 1 });

      await service.deleteItem('restaurant-1', 'item-1');

      expect(redisService.del).toHaveBeenCalledWith('menu:restaurant-1');
    });

    it('throws NotFoundException when item does not exist', async () => {
      menuItemModel.deleteOne.mockResolvedValue({ deletedCount: 0 });

      await expect(service.deleteItem('restaurant-1', 'bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ── toggleAvailability ────────────────────────────────────────────────────────

  describe('toggleAvailability', () => {
    it('returns the toggled availability state and invalidates cache', async () => {
      menuItemModel.findOneAndUpdate.mockReturnValue({ exec: async () => ({ ...makeItem(), isAvailable: false }) });

      const result = await service.toggleAvailability('restaurant-1', 'item-1');

      expect(result.isAvailable).toBe(false);
      expect(redisService.del).toHaveBeenCalledWith('menu:restaurant-1');
    });

    it('throws NotFoundException when item does not exist', async () => {
      menuItemModel.findOneAndUpdate.mockReturnValue({ exec: async () => null });

      await expect(service.toggleAvailability('restaurant-1', 'bad-id')).rejects.toThrow(NotFoundException);
    });
  });
});
