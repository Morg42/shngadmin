import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { combineLatest, map } from 'rxjs';
import { ConnectivityService } from '../../services/connectivity.service';

@Component({
  selector: 'app-offline-banner',
  templateUrl: './offline-banner.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncPipe, TranslatePipe],
})
export class OfflineBannerComponent {
  private readonly connectivity = inject(ConnectivityService);

  readonly vm$ = combineLatest({
    online: this.connectivity.online$,
    retryIn: this.connectivity.retryIn$,
  }).pipe(map(({ online, retryIn }) => ({ online, retryIn, retrying: retryIn === 0 && !online })));

  retryNow(): void {
    this.connectivity.retryNow();
  }
}
