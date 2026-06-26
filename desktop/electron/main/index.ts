import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { JsonPersistenceService } from './services/storage/JsonPersistenceService';
import { Logger } from './services/logging/Logger';
import { ConfigurationService } from './services/config/ConfigurationService';
import { NodeEventBus } from './core/NodeEventBus';
import { CryptoService } from './services/security/CryptoService';
import { ImagePipeline } from './services/pipeline/ImagePipeline';
import { HttpServer } from './services/network/HttpServer';
import { DiscoveryService } from './services/discovery/DiscoveryService';

// Pipeline Steps
import { ValidationStep } from './services/pipeline/steps/ValidationStep';
import { DecodeStep } from './services/pipeline/steps/DecodeStep';
import { SaveStep } from './services/pipeline/steps/SaveStep';
import { HistoryStep } from './services/pipeline/steps/HistoryStep';
import { PublishStep } from './services/pipeline/steps/PublishStep';

// Decoupled Event Listeners / Infrastructure Services
import { ClipboardService } from './services/clipboard/ClipboardService';
import { NotificationService } from './services/notifications/NotificationService';
import { FolderService } from './services/storage/FolderService';
import { ElectronClipboard } from './services/clipboard/ElectronClipboard';
import { ElectronNotificationGateway } from './services/notifications/ElectronNotificationGateway';
import { ElectronFolderGateway } from './services/storage/ElectronFolderGateway';

// Tray & IPC Management
import { TrayManager } from './services/tray/TrayManager';
import { IpcHandler } from './ipc/IpcHandler';

// Set SnapBridge as correct application name and set path explicitly
try {
  const appData = app.getPath('appData');
  const newUserData = path.join(appData, 'SnapBridge');
  app.name = 'SnapBridge';
  app.setPath('userData', newUserData);
} catch (e) {
  // Fallback if appData is not resolvable
  const appData = process.env.APPDATA || (process.platform === 'darwin' ? path.join(process.env.HOME || '', 'Library', 'Application Support') : path.join(process.env.HOME || '', '.config'));
  const newUserData = path.join(appData, 'SnapBridge');
  app.name = 'SnapBridge';
  try {
    app.setPath('userData', newUserData);
  } catch {}
}

// Ensure single instance lock
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

let logger: Logger;
let db: JsonPersistenceService;
let configService: ConfigurationService;
let eventBus: NodeEventBus;
let cryptoService: CryptoService;
let pipeline: ImagePipeline;
let server: HttpServer;
let discoveryService: DiscoveryService;
let trayManager: TrayManager;
let ipcHandler: IpcHandler;

// Keep references to decoupled services to prevent garbage collection
let clipboardService: ClipboardService;
let notificationService: NotificationService;
let folderService: FolderService;

app.on('ready', async () => {
  try {
    // 1. Initialize Logger
    logger = new Logger();
    logger.info('Starting SnapBridge desktop application...');

    // 2. Initialize and Connect Storage
    db = new JsonPersistenceService(logger);
    db.connect();

    // 3. Load Configurations
    configService = new ConfigurationService(db, logger);
    const config = configService.load();

    // 4. Initialize Core event bus and crypto
    eventBus = new NodeEventBus();
    cryptoService = new CryptoService();

    // 5. Initialize Decoupled Downstream Side-Effect Subscribers
    clipboardService = new ClipboardService(eventBus, configService, logger, new ElectronClipboard());
    notificationService = new NotificationService(eventBus, configService, logger, new ElectronNotificationGateway());
    folderService = new FolderService(eventBus, configService, logger, new ElectronFolderGateway());

    // 6. Assemble Image Processing Pipeline
    pipeline = new ImagePipeline();
    pipeline
      .use(new ValidationStep(db, cryptoService, logger))
      .use(new DecodeStep(logger))
      .use(new SaveStep(configService, logger))
      .use(new HistoryStep(db, logger))
      .use(new PublishStep(eventBus, logger));

    // 7. Instantiate and Boot Background Server
    server = new HttpServer(logger, db, configService, pipeline);
    await server.start(config.port);

    // Instantiate and start Discovery Service
    discoveryService = new DiscoveryService(logger, db, cryptoService);
    discoveryService.start(config.port);

    // 8. Initialize System Tray Icon & Window Handlers
    trayManager = new TrayManager(configService, db, logger);
    trayManager.initialize();

    // 9. Register IPC communications
    ipcHandler = new IpcHandler(configService, db, logger, server, cryptoService, discoveryService);
    ipcHandler.register();

    logger.info('SnapBridge desktop host successfully initialized.');
  } catch (error) {
    if (logger) {
      logger.error('Critical boot error in main host startup:', error);
    } else {
      console.error('Critical boot error in main host startup:', error);
    }
    app.quit();
  }
});

// Prevent app from quitting when all windows are closed, keeping it in the tray
app.on('window-all-closed', () => {
  // Do not quit. App stays resident in system tray.
});

app.on('will-quit', async (event) => {
  event.preventDefault();
  logger.info('Shutting down SnapBridge desktop host...');
  
  try {
    if (discoveryService) {
      discoveryService.stop();
    }
    if (server) {
      await server.stop();
    }
    if (db) {
      db.disconnect();
    }
  } catch (err) {
    console.error('Cleanup error on exit:', err);
  }
  
  process.exit(0);
});
