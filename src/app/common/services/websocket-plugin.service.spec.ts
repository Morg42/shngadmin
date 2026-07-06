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

  describe('updateSeries', () => {
    it('keeps the anchor label in sync with its rewritten timestamp', () => {
      const graphdata = { series: [], tsdiff: 0 } as Parameters<
        WebsocketPluginService['updateSeries']
      >[0];

      const t0 = Date.parse('2026-07-06T12:00:00');
      const t1 = Date.parse('2026-07-06T12:00:30');
      jest.useFakeTimers().setSystemTime(t0);
      service.updateSeries(graphdata, {
        sid: 'x',
        series: [
          [t0, 1, { date: '', time: '12:00:00' }],
          [t1, 2, { date: '', time: '12:00:30' }],
        ],
      });
      expect(graphdata.tsdiff).toBe(t1 - t0);

      // A later update should rewrite the anchor's timestamp (index 0) AND its
      // label (index 2) together — otherwise the displayed label goes stale
      // while the point silently slides forward in time on every push.
      const tNow = t1 + 10 * 60 * 1000;
      jest.setSystemTime(tNow);
      service.updateSeries(graphdata, {
        sid: 'x',
        series: [[tNow, 3, { date: '', time: '12:10:30' }]],
      });

      const anchor = graphdata.series[0];
      expect(anchor[0]).toBe(tNow - graphdata.tsdiff);
      expect(anchor[2].time).not.toBe('12:00:00');
      expect(Date.parse(`2026-07-06T${anchor[2].time}`)).toBe(anchor[0]);

      jest.useRealTimers();
    });
  });
});
