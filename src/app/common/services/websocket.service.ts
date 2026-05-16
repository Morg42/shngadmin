import { Injectable, NgZone, inject } from '@angular/core';
import { Subject } from 'rxjs';
import { LogService } from './log.service';

@Injectable()
export class WebsocketService {
  private ngZone = inject(NgZone);
  private readonly log = inject(LogService);
  private ws: WebSocket | null = null;
  private messageStream = new Subject<MessageEvent>();
  private openSubject = new Subject<void>();
  private messageQueue: unknown[] = [];
  private reconnectUrl: string | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private readonly BACKOFF_SECONDS = [2, 4, 8, 16, 30];

  public messages$ = this.messageStream.asObservable();
  public open$ = this.openSubject.asObservable();

  public connect(url: string): void {
    this.reconnectUrl = url;
    this.openConnection(url);
  }

  private openConnection(url: string): void {
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.ngZone.run(() => {
        this.reconnectAttempt = 0;
        this.log.log('WebSocket connected: ' + url);
        this.openSubject.next(); // identity sent first via openSubscription handler
        this.messageQueue.forEach((msg) => this.ws!.send(JSON.stringify(msg)));
        this.messageQueue = [];
      });
    };

    this.ws.onmessage = (event) => this.ngZone.run(() => this.messageStream.next(event));
    this.ws.onerror = (error) => this.log.warn('WebSocket error:', error);
    this.ws.onclose = () => {
      this.ngZone.run(() => {
        if (this.reconnectUrl) {
          const delay =
            this.BACKOFF_SECONDS[Math.min(this.reconnectAttempt, this.BACKOFF_SECONDS.length - 1)];
          this.reconnectAttempt++;
          this.log.log(`WebSocket closed, reconnecting in ${delay}s...`);
          this.reconnectTimer = setTimeout(
            () => this.openConnection(this.reconnectUrl!),
            delay * 1000,
          );
        }
      });
    };
  }

  public sendMessage(message: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      this.messageQueue.push(message);
    }
  }

  public close(): void {
    this.reconnectUrl = null;
    this.reconnectAttempt = 0;
    if (this.reconnectTimer !== null) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.messageQueue = [];
    this.log.log('WebSocket disconnected.');
  }
}
