import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  OnInit,
} from '@angular/core';

@Component({
  selector: 'app-logger-tab',
  templateUrl: './logger-tab.component.html',
  styleUrls: ['./logger-tab.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
})
export class LoggerTabComponent implements OnInit {
  private readonly cdr = inject(ChangeDetectorRef);

  ngOnInit() {}
}
