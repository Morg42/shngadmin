import { HttpErrorResponse } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';

/** HTTP status the backend answers with while another structural item
 *  operation (create/edit/delete/rename/copy) still holds its lock. */
const ITEM_OPERATION_BUSY_STATUS = 409;

/** User-facing text for a failed item operation: a translated hint for the
 *  busy case, otherwise the backend's own message, or the translated
 *  *fallbackKey* when it sent none. */
export function itemOperationErrorMessage(
  err: HttpErrorResponse,
  translate: TranslateService,
  fallbackKey: string,
): string {
  if (err.status === ITEM_OPERATION_BUSY_STATUS) {
    return translate.instant('ITEMS.OPERATION_BUSY');
  }
  return (err.error?.error as string | undefined) ?? translate.instant(fallbackKey);
}
