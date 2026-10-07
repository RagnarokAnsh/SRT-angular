import { inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import type { CanDeactivateFn } from '@angular/router';

import { SessionStore } from '@core/auth/session';

import { openConfirm } from './ui/confirm-dialog';

export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
  /** True while a save is still being sent; leaving would interrupt it. */
  isSaving?(): boolean;
}

/** Asks before leaving a form with unsaved changes (e.g. after an accidental back tap). */
export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component) => {
  // A sign-out (idle, expired, another tab) must never wait for an answer on a device that
  // may be unattended: the session is already gone, so let it through.
  if (!inject(SessionStore).isAuthenticated()) return true;
  const saving = component?.isSaving?.() ?? false;
  if (!saving && !component?.hasUnsavedChanges()) return true;
  return openConfirm(inject(MatDialog), {
    titleKey: saving ? 'unsaved.savingTitle' : 'unsaved.title',
    messageKey: saving ? 'unsaved.savingMessage' : 'unsaved.message',
    confirmKey: 'unsaved.leave',
    tone: 'danger',
  });
};

/** For `(window:beforeunload)`: asks the browser to confirm leaving (older WebViews need both). */
export function warnBeforeUnload(event: BeforeUnloadEvent): void {
  event.preventDefault();
  event.returnValue = true;
}
