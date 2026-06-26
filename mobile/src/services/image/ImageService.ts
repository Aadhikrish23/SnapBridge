import { launchImageLibrary, launchCamera, ImagePickerResponse, MediaType } from 'react-native-image-picker';
import ImageResizer from '@bam.tech/react-native-image-resizer';
import { CapturedImage } from '../../types';

export class ImageService {
  /**
   * Opens the device camera to capture a photo.
   */
  public async captureFromCamera(): Promise<CapturedImage | null> {
    return new Promise((resolve) => {
      launchCamera(
        {
          mediaType: 'photo' as MediaType,
          quality: 0.9,
          maxWidth: 4096,
          maxHeight: 4096,
          includeBase64: false,
          saveToPhotos: false,
        },
        (response: ImagePickerResponse) => {
          if (response.didCancel || response.errorCode || !response.assets?.length) {
            resolve(null);
            return;
          }
          const asset = response.assets[0];
          resolve({
            uri: asset.uri || '',
            width: asset.width || 0,
            height: asset.height || 0,
            mimeType: asset.type || 'image/jpeg',
            fileSize: asset.fileSize || 0,
            fileName: asset.fileName || `capture_${Date.now()}.jpg`,
          });
        },
      );
    });
  }

  /**
   * Opens the device gallery to pick an image.
   */
  public async pickFromGallery(): Promise<CapturedImage | null> {
    return new Promise((resolve) => {
      launchImageLibrary(
        {
          mediaType: 'photo' as MediaType,
          quality: 0.9,
          maxWidth: 4096,
          maxHeight: 4096,
          includeBase64: false,
          selectionLimit: 1,
        },
        (response: ImagePickerResponse) => {
          if (response.didCancel || response.errorCode || !response.assets?.length) {
            resolve(null);
            return;
          }
          const asset = response.assets[0];
          resolve({
            uri: asset.uri || '',
            width: asset.width || 0,
            height: asset.height || 0,
            mimeType: asset.type || 'image/jpeg',
            fileSize: asset.fileSize || 0,
            fileName: asset.fileName || `gallery_${Date.now()}.jpg`,
          });
        },
      );
    });
  }

  /**
   * Compresses and resizes a CapturedImage according to a quality preset.
   */
  public async compressImage(
    image: CapturedImage,
    preset: 'High' | 'Balanced' | 'Fast'
  ): Promise<CapturedImage> {
    let quality = 80;
    let maxWidth = 2048;

    if (preset === 'High') {
      quality = 95;
      maxWidth = 3072;
    } else if (preset === 'Fast') {
      quality = 60;
      maxWidth = 1024;
    }

    try {
      const result = await ImageResizer.createResizedImage(
        image.uri,
        maxWidth,
        maxWidth,
        'JPEG',
        quality,
        0,
        null,
        false,
        { mode: 'contain', onlyScaleDown: true }
      );

      let size = result.size;
      if (!size) {
        try {
          const res = await fetch(result.uri);
          const blob = await res.blob();
          size = blob.size;
        } catch {
          size = image.fileSize;
        }
      }

      return {
        uri: result.uri,
        width: result.width,
        height: result.height,
        mimeType: 'image/jpeg',
        fileSize: size,
        fileName: result.name || image.fileName,
      };
    } catch (err: any) {
      console.error('[ImageService] Compression failed:', err);
      return image;
    }
  }
}
