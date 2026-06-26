import { ImageService } from '../src/services/image/ImageService';
import ImageResizer from '@bam.tech/react-native-image-resizer';

jest.mock('react-native-image-picker', () => {
  return {
    launchCamera: jest.fn(),
    launchImageLibrary: jest.fn(),
  };
});

jest.mock('@bam.tech/react-native-image-resizer', () => {
  return {
    createResizedImage: jest.fn().mockImplementation((uri, width, height, format, quality) => {
      return Promise.resolve({
        uri: `${uri}_resized`,
        width,
        height,
        size: 1500,
        name: 'resized.jpg',
      });
    }),
  };
});

describe('ImageService (Compression)', () => {
  let imageService: ImageService;

  beforeEach(() => {
    imageService = new ImageService();
    jest.clearAllMocks();
  });

  test('should invoke resizer with Balanced preset values', async () => {
    const originalImage = {
      uri: 'file:///path/to/original.jpg',
      width: 4000,
      height: 3000,
      mimeType: 'image/jpeg',
      fileSize: 5000,
      fileName: 'original.jpg',
    };

    const compressed = await imageService.compressImage(originalImage, 'Balanced');

    expect(ImageResizer.createResizedImage).toHaveBeenCalledWith(
      'file:///path/to/original.jpg',
      2048,
      2048,
      'JPEG',
      80,
      0,
      null,
      false,
      { mode: 'contain', onlyScaleDown: true }
    );

    expect(compressed.width).toBe(2048);
    expect(compressed.fileSize).toBe(1500);
    expect(compressed.uri).toBe('file:///path/to/original.jpg_resized');
  });

  test('should invoke resizer with High Quality preset values', async () => {
    const originalImage = {
      uri: 'file:///path/to/original.jpg',
      width: 4000,
      height: 3000,
      mimeType: 'image/jpeg',
      fileSize: 5000,
      fileName: 'original.jpg',
    };

    await imageService.compressImage(originalImage, 'High');

    expect(ImageResizer.createResizedImage).toHaveBeenCalledWith(
      'file:///path/to/original.jpg',
      3072,
      3072,
      'JPEG',
      95,
      0,
      null,
      false,
      { mode: 'contain', onlyScaleDown: true }
    );
  });

  test('should invoke resizer with Fast preset values', async () => {
    const originalImage = {
      uri: 'file:///path/to/original.jpg',
      width: 4000,
      height: 3000,
      mimeType: 'image/jpeg',
      fileSize: 5000,
      fileName: 'original.jpg',
    };

    await imageService.compressImage(originalImage, 'Fast');

    expect(ImageResizer.createResizedImage).toHaveBeenCalledWith(
      'file:///path/to/original.jpg',
      1024,
      1024,
      'JPEG',
      60,
      0,
      null,
      false,
      { mode: 'contain', onlyScaleDown: true }
    );
  });
});
