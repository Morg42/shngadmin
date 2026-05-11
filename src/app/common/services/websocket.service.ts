import { Injectable, NgZone, inject } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable()
export class WebsocketService {
  private ngZone = inject(NgZone);
  private ws: WebSocket | null = null;
  private messageStream = new Subject<MessageEvent>();
  private openSubject = new Subject<void>();
  private messageQueue: unknown[] = [];
  private reconnectUrl: string | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

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
        console.log('WebSocket connected: ' + url);
        this.openSubject.next(); // identity sent first via openSubscription handler
        this.messageQueue.forEach((msg) => this.ws!.send(JSON.stringify(msg)));
        this.messageQueue = [];
      });
    };

    this.ws.onmessage = (event) => this.ngZone.run(() => this.messageStream.next(event));
    this.ws.onerror = (error) => console.warn('WebSocket error:', error);
    this.ws.onclose = () => {
      this.ngZone.run(() => {
        if (this.reconnectUrl) {
          console.log('WebSocket closed, reconnecting in 3s...');
          this.reconnectTimer = setTimeout(() => this.openConnection(this.reconnectUrl!), 3000);
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
    if (this.reconnectTimer !== null) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.messageQueue = [];
    console.log('WebSocket disconnected.');
  }
}
