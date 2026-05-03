
import { Component } from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';

import { TranslateService } from '@ngx-translate/core';

import { AuthService } from './../common/services/auth.service';

@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.css'],
    standalone: false
})
export class LoginComponent {
  invalidLogin: boolean;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    public  authService: AuthService) { }

  signIn(credentials) {
    this.authService.login(credentials)
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
