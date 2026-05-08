
import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';


@Injectable()
export class WebsocketService {
  private ws: WebSocket;
  private messageStream = new Subject<any>();
  private openSubject = new Subject<void>();
  private messageQueue: any[] = [];
  private reconnectUrl: string | null = null;
  private reconnectTimer: any = null;

  public messages$ = this.messageStream.asObservable();
  public open$ = this.openSubject.asObservable();



  public connect(url: string): void {
    this.reconnectUrl = url;
    this.openConnection(url);
  }


  private openConnection(url: string): void {
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log('WebSocket connected: ' + url);
      this.messageQueue.forEach(msg => this.ws.send(JSON.stringify(msg)));
      this.messageQueue = [];
      this.openSubject.next();
    };

    this.ws.onmessage = (event) => this.messageStream.next(event);
    this.ws.onerror = (error) => console.warn('WebSocket error:', error);
    this.ws.onclose = () => {
      if (this.reconnectUrl) {
        console.log('WebSocket closed, reconnecting in 3s...');
        this.reconnectTimer = setTimeout(() => this.openConnection(this.reconnectUrl), 3000);
      }
    };
  }


  public sendMessage(message: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      this.messageQueue.push(message);
    }
  }


  public close(): void {
    this.reconnectUrl = null;
    clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.messageQueue = [];
    console.log('WebSocket disconnected.');
  }
}
