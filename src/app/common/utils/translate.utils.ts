import { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateService } from '@ngx-translate/core';

/** Re-runs `rebuild` once the new language's translation file has finished
 *  loading. translate.use() is async, so anything built eagerly from
 *  translate.instant() (e.g. a signal populated at construction) can't be
 *  trusted to reflect a language switch until onLangChange fires - call
 *  this alongside the initial build to keep it in sync. Unsubscribes with
 *  the calling component/service via destroyRef. */
export function rebuildOnLangChange(
  translate: TranslateService,
  destroyRef: DestroyRef,
  rebuild: () => void,
): void {
  translate.onLangChange.pipe(takeUntilDestroyed(destroyRef)).subscribe(() => rebuild());
}
