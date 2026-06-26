import { StorageService } from './storage/StorageService';
import { MobileCryptoService, ICryptoService } from './crypto/MobileCryptoService';
import { ImageService } from './image/ImageService';
import { DiscoveryClient } from './network/DiscoveryClient';
import { UploadClient } from './network/UploadClient';

class ServiceProviderImpl {
  private _storage: StorageService | null = null;
  private _crypto: ICryptoService | null = null;
  private _image: ImageService | null = null;
  private _discovery: DiscoveryClient | null = null;
  private _upload: UploadClient | null = null;

  public get storage(): StorageService {
    if (!this._storage) {
      this._storage = new StorageService();
    }
    return this._storage;
  }

  public get crypto(): ICryptoService {
    if (!this._crypto) {
      this._crypto = new MobileCryptoService();
    }
    return this._crypto;
  }

  public get image(): ImageService {
    if (!this._image) {
      this._image = new ImageService();
    }
    return this._image;
  }

  public get discovery(): DiscoveryClient {
    if (!this._discovery) {
      this._discovery = new DiscoveryClient();
    }
    return this._discovery;
  }

  public get upload(): UploadClient {
    if (!this._upload) {
      this._upload = new UploadClient();
    }
    return this._upload;
  }
}

export const ServiceProvider = new ServiceProviderImpl();
