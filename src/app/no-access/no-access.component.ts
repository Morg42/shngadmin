import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-no-access',
  templateUrl: './no-access.component.html',
  styleUrls: ['./no-access.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
})
export class NoAccessComponent {}
