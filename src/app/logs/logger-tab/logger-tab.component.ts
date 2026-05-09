import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';

@Component({
    selector: 'app-logger-tab',
    templateUrl: './logger-tab.component.html',
    styleUrls: ['./logger-tab.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class LoggerTabComponent implements OnInit {

  private readonly cdr = inject(ChangeDetectorRef);

  ngOnInit() {
  }

}
