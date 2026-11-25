import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ButtonDirective } from 'primeng/button';

/** PrimeNG's own severity names - 'warn', not 'warning'. */
type Severity = 'primary' | 'secondary' | 'success' | 'info' | 'warn' | 'danger';

/**
 * Reference page for every PrimeNG button severity/variant/state combination
 * this app uses, rendered as real interactive buttons (so hover/focus/active
 * states can be checked by hand, not just default/disabled). Dev-only, gated
 * by devOnlyGuard - not linked from the nav, reachable at /dev/style-guide.
 *
 * Follows the app's current theme (light/dark) like every other page - use
 * the existing theme switcher to check both. See the migration plan
 * (~/.claude/plans/spicy-tinkering-hummingbird.md) for why this doesn't try
 * to force both themes side by side on one page.
 */
@Component({
  selector: 'app-style-guide',
  templateUrl: './style-guide.component.html',
  styleUrls: ['./style-guide.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonDirective],
})
export class StyleGuideComponent {
  readonly severities: Severity[] = ['primary', 'secondary', 'success', 'info', 'warn', 'danger'];
}
