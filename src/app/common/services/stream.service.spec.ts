import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { createMockAppConfigService, translateTestingModule } from '../../../testing/test-helpers';
import { AppConfigService } from './app-config.service';
import { SharedService } from './shared.service';
import { StreamService } from './stream.service';

/** Minimal EventSource stand-in (jsdom has none): records listeners so a test can emit server events. */
class FakeEventSource {
  static instances: FakeEventSource[] = [];
  onerror: (() => void) | null = null;
  private readonly listeners = new Map<string, (event: MessageEvent) => void>();

  constructor(readonly url: string) {
    FakeEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: (event: MessageEvent) => void) {
    this.listeners.set(type, listener);
  }

  emit(type: string, data: unknown) {
    this.listeners.get(type)?.(new MessageEvent(type, { data: JSON.stringify(data) }));
  }

  close() {}
}

describe('StreamService', () => {
  let service: StreamService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [translateTestingModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        SharedService,
        { provide: AppConfigService, useValue: createMockAppConfigService() },
        StreamService,
      ],
    });
    service = TestBed.inject(StreamService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('updateSeries', () => {
    // updateSeries is private; accessed via index signature for the test.
    const callUpdateSeries = (
      svc: StreamService,
      prev: { series: unknown[]; tsdiff: number },
      incoming: unknown[],
    ) =>
      (
        svc as unknown as {
          updateSeries: (
            p: typeof prev,
            i: typeof incoming,
          ) => { series: [number, number, { date: string; time: string }][]; tsdiff: number };
        }
      ).updateSeries(prev, incoming);

    it('keeps the anchor label in sync with its rewritten timestamp', () => {
      const t0 = Date.parse('2026-07-06T12:00:00');
      const t1 = Date.parse('2026-07-06T12:00:30');
      jest.useFakeTimers().setSystemTime(t0);
      const first = callUpdateSeries(service, { series: [], tsdiff: 0 }, [
        [t0, 1, { date: '', time: '12:00:00' }],
        [t1, 2, { date: '', time: '12:00:30' }],
      ]);
      expect(first.tsdiff).toBe(t1 - t0);

      // A later update must rewrite the anchor's timestamp (index 0) AND its label (index 2) together
      const tNow = t1 + 10 * 60 * 1000;
      jest.setSystemTime(tNow);
      const second = callUpdateSeries(service, first, [[tNow, 3, { date: '', time: '12:10:30' }]]);

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

  describe('unknown monitored items', () => {
    let http: HttpTestingController;
    let shared: SharedService;

    beforeEach(() => {
      FakeEventSource.instances = [];
      Object.defineProperty(globalThis, 'EventSource', {
        value: FakeEventSource,
        configurable: true,
        writable: true,
      });
      http = TestBed.inject(HttpTestingController);
      shared = TestBed.inject(SharedService);
    });

    afterEach(() => http.verify());

    /** connect() -> token -> SSE 'connection' event, which triggers the resync PATCH. */
    const openConnection = (connectionId: string) => {
      service.connect();
      http.expectOne('/api/stream/token').flush({ token: 't' });
      FakeEventSource.instances.at(-1)!.emit('connection', { connectionId });
      return http.expectOne(`/api/stream/${connectionId}`);
    };

    it('drops items the server reports as unknown from the monitor list', () => {
      shared.monitoredItemsList.set([
        ['a', {}],
        ['gone', {}],
      ]);
      service.getMonitoredItems(shared.monitoredItemsList(), () => {});

      const patch = openConnection('c1');
      expect(patch.request.body.addItems).toEqual(['a', 'gone']);
      patch.flush({ result: 'ok', unknownItems: ['gone'] });

      expect(shared.monitoredItemsList().map(([path]) => path)).toEqual(['a']);
    });

    it('does not resubscribe dropped items after a reconnect', () => {
      shared.monitoredItemsList.set([
        ['a', {}],
        ['gone', {}],
      ]);
      service.getMonitoredItems(shared.monitoredItemsList(), () => {});
      openConnection('c1').flush({ result: 'ok', unknownItems: ['gone'] });

      FakeEventSource.instances.at(-1)!.emit('connection', { connectionId: 'c2' });

      const resync = http.expectOne('/api/stream/c2');
      expect(resync.request.body.addItems).toEqual(['a']);
      resync.flush({ result: 'ok', unknownItems: [] });
    });

    it('drops items reported by an unknownItems stream event', () => {
      shared.monitoredItemsList.set([
        ['a', {}],
        ['gone', {}],
      ]);
      service.getMonitoredItems(shared.monitoredItemsList(), () => {});
      openConnection('c1').flush({ result: 'ok', unknownItems: [] });

      FakeEventSource.instances
        .at(-1)!
        .emit('unknownItems', { type: 'unknownItems', paths: ['gone'] });

      expect(shared.monitoredItemsList().map(([path]) => path)).toEqual(['a']);
    });
  });
});
