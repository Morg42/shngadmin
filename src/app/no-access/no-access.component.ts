import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';

@Component({
    selector: 'app-no-access',
    templateUrl: './no-access.component.html',
    styleUrls: ['./no-access.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [],
})
export class NoAccessComponent implements OnInit {

  private readonly cdr = inject(ChangeDetectorRef);

  ngOnInit() {
  }

}
