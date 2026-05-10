import { TestBed } from '@angular/core/testing';
import {
  createMockAppConfigService,
  createMockWebsocketService,
  translateTestingModule,
} from '../../../testing/test-helpers';
import { AppConfigService } from './app-config.service';
import { SharedService } from './shared.service';
import { UserPreferencesService } from './user-preferences.service';
import { WebsocketPluginService } from './websocket-plugin.service';
import { WebsocketService } from './websocket.service';

describe('WebsocketPluginService', () => {
  let service: WebsocketPluginService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [translateTestingModule],
      providers: [
        UserPreferencesService,
        { provide: AppConfigService, useValue: createMockAppConfigService() },
        { provide: WebsocketService, useValue: createMockWebsocketService() },
        SharedService,
        WebsocketPluginService,
      ],
    });
    service = TestBed.inject(WebsocketPluginService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
