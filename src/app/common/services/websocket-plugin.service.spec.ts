import { TestBed } from '@angular/core/testing';
import { WebsocketPluginService } from './websocket-plugin.service';
import { WebsocketService } from './websocket.service';
import { AppConfigService } from './app-config.service';
import { SharedService } from './shared.service';
import { UserPreferencesService } from './user-preferences.service';
import {
  translateTestingModule,
  createMockAppConfigService,
  createMockWebsocketService,
} from '../../../testing/test-helpers';

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
