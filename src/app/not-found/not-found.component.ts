import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
    selector: 'app-not-found',
    templateUrl: './not-found.component.html',
    styleUrls: ['./not-found.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [NgOptimizedImage, TranslatePipe]
})
export class NotFoundComponent implements OnInit {

  private readonly cdr = inject(ChangeDetectorRef);

  ngOnInit() {
  }

}
