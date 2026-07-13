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
    // updateSeries is private; accessed via index signature for the test.
    const callUpdateSeries = (
      svc: WebsocketPluginService,
      prev: { series: unknown[]; tsdiff: number },
      data: unknown,
    ) =>
      (
        svc as unknown as {
          updateSeries: (
            p: typeof prev,
            d: typeof data,
          ) => { series: [number, number, { date: string; time: string }][]; tsdiff: number };
        }
      ).updateSeries(prev, data);

    it('keeps the anchor label in sync with its rewritten timestamp', () => {
      const t0 = Date.parse('2026-07-06T12:00:00');
      const t1 = Date.parse('2026-07-06T12:00:30');
      jest.useFakeTimers().setSystemTime(t0);
      const first = callUpdateSeries(
        service,
        { series: [], tsdiff: 0 },
        {
          sid: 'x',
          series: [
            [t0, 1, { date: '', time: '12:00:00' }],
            [t1, 2, { date: '', time: '12:00:30' }],
          ],
        },
      );
      expect(first.tsdiff).toBe(t1 - t0);

      // A later update should rewrite the anchor's timestamp (index 0) AND its
      // label (index 2) together — otherwise the displayed label goes stale
      // while the point silently slides forward in time on every push.
      const tNow = t1 + 10 * 60 * 1000;
      jest.setSystemTime(tNow);
      const second = callUpdateSeries(service, first, {
        sid: 'x',
        series: [[tNow, 3, { date: '', time: '12:10:30' }]],
      });

      const anchor = second.series[0];
      expect(anchor[0]).toBe(tNow - second.tsdiff);
      expect(anchor[2].time).not.toBe('12:00:00');
      expect(Date.parse(`2026-07-06T${anchor[2].time}`)).toBe(anchor[0]);

      // copy-based contract: the input value must not have been mutated
      expect(first.series.length).toBe(2);
      expect(first.series[0][0]).toBe(t0);

      jest.useRealTimers();
    });
  });
});
