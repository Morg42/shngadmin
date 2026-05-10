
import { Component, DestroyRef, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {ActivatedRoute, Router} from '@angular/router';

import { TranslateService, TranslatePipe } from '@ngx-translate/core';

import { AuthService } from './../common/services/auth.service';
import { FormsModule } from '@angular/forms';
import { Bind } from 'primeng/bind';
import { Message } from 'primeng/message';

@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, Bind, Message, TranslatePipe]
})
export class LoginComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  public authService = inject(AuthService);
  invalidLogin: boolean;

  signIn(credentials) {
    this.authService.login(credentials)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result: boolean) => {
        if (result) {
          const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
          this.router.navigate([returnUrl || '/']);
        } else {
          this.invalidLogin = true;
          this.cdr.markForCheck();
        }
      });
  }
}
