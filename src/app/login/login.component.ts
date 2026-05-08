
import { Component, DestroyRef, inject } from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {ActivatedRoute, Router} from '@angular/router';

import { TranslateService } from '@ngx-translate/core';

import { AuthService } from './../common/services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  private readonly destroyRef = inject(DestroyRef);
  invalidLogin: boolean;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    public  authService: AuthService) { }

  signIn(credentials) {
    this.authService.login(credentials)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result: boolean) => {
        if (result) {
          const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
          this.router.navigate([returnUrl || '/']);
        } else {
          this.invalidLogin = true;
        }
      });
  }
}
