import { inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import type { CanDeactivateFn } from '@angular/router';

import { openConfirm } from './ui/confirm-dialog';

export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
}

/** Asks before leaving a form with unsaved changes (e.g. after an accidental back tap). */
export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component) => {
  if (!component?.hasUnsavedChanges()) return true;
  return openConfirm(inject(MatDialog), {
    titleKey: 'unsaved.title',
    messageKey: 'unsaved.message',
    confirmKey: 'unsaved.leave',
    tone: 'danger',
  });
};
