import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-logger-tab',
  templateUrl: './logger-tab.component.html',
  styleUrls: ['./logger-tab.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
})
export class LoggerTabComponent {}
