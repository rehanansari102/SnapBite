import { MediaService } from './media.service';
import { R2Service } from './r2.service';
import { ConfigService } from '@nestjs/config';

describe('MediaService', () => {
  let service: MediaService;
  let r2: { generatePresignedUploadUrl: jest.Mock; delete: jest.Mock };
  let config: { get: jest.Mock; getOrThrow: jest.Mock };

  beforeEach(() => {
    r2 = {
      generatePresignedUploadUrl: jest.fn().mockResolvedValue('https://r2.example.com/upload?sig=abc'),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    config = {
      get: jest.fn().mockReturnValue('300'),
      getOrThrow: jest.fn().mockReturnValue('https://pub.r2.dev'),
    };

    service = new MediaService(r2 as unknown as R2Service, config as unknown as ConfigService);
  });

  afterEach(() => jest.resetAllMocks());

  // ── getPresignedUrl ───────────────────────────────────────────────────────────

  describe('getPresignedUrl', () => {
    it('returns an upload URL, public URL, and storage key', async () => {
      const result = await service.getPresignedUrl({
        fileName: 'photo.jpg',
        contentType: 'image/jpeg',
        folder: 'restaurants',
      });

      expect(result.uploadUrl).toBe('https://r2.example.com/upload?sig=abc');
      expect(result.publicUrl).toMatch(/^https:\/\/pub\.r2\.dev\/restaurants\/.+\.jpg$/);
      expect(result.key).toMatch(/^restaurants\/.+\.jpg$/);
    });

    it('calls r2 with the correct key, content type, and expiry', async () => {
      await service.getPresignedUrl({ fileName: 'image.png', contentType: 'image/png', folder: 'menu' });

      expect(r2.generatePresignedUploadUrl).toHaveBeenCalledWith(
        expect.stringMatching(/^menu\/.+\.png$/),
        'image/png',
        300,
      );
    });

    it('falls back to jpg extension when fileName has no extension', async () => {
      const result = await service.getPresignedUrl({ fileName: 'noext', contentType: 'image/jpeg', folder: 'avatars' });

      expect(result.key).toMatch(/^avatars\/.+\.noext$/);
    });
  });

  // ── deleteFile ────────────────────────────────────────────────────────────────

  describe('deleteFile', () => {
    it('delegates deletion to r2 with the provided key', async () => {
      await service.deleteFile('restaurants/abc.jpg');

      expect(r2.delete).toHaveBeenCalledWith('restaurants/abc.jpg');
    });
  });
});
