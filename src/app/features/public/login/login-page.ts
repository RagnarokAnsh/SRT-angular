import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import type { ErrorStateMatcher } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslocoPipe } from '@jsverse/transloco';

import { AuthService, InvalidLoginResponseError } from '@core/auth/auth';
import { demoAccounts, demoPassword } from '@core/demo/demo-providers';
import { toAppError } from '@core/network/app-error';
import { NotifyService } from '@core/notify/notify';
import { applyServerErrors, clearServerErrors, validateAndFocus } from '@shared/forms/form-utils';
import { ValidationMessagePipe } from '@shared/forms/validation-message-pipe';
import { EMAIL_MAX, PASSWORD_MAX, emailAddress } from '@shared/forms/validators';

@Component({
  selector: 'app-login-page',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    TranslocoPipe,
    ValidationMessagePipe,
  ],
  templateUrl: './login-page.html',
  styleUrl: './login-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly notify = inject(NotifyService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  /** Query params: where to go after signing in, and why the user was signed out. */
  readonly returnUrl = input<string>();
  readonly reason = input<string>();
  /** Who was signed out (with `returnUrl`): only they are sent back to that page. */
  readonly uid = input<string>();

  protected readonly form = inject(NonNullableFormBuilder).group({
    email: ['', [Validators.required, emailAddress, Validators.maxLength(EMAIL_MAX)]],
    password: ['', [Validators.required, Validators.maxLength(PASSWORD_MAX)]],
    remember: [true],
  });

  protected readonly submitting = signal(false);
  protected readonly showPassword = signal(false);
  protected readonly capsLock = signal(false);
  /**
   * The password is cleared after a failed sign-in: that must not show "This field is
   * required." under "The email or password is incorrect.". Its error shows once the field
   * is touched again, or on the next try (which marks every field touched).
   */
  protected readonly passwordErrors: ErrorStateMatcher = {
    isErrorState: (control) => !!control && control.invalid && control.touched,
  };
  /** Translated message for a failed attempt (or the server's own words). */
  protected readonly failure = signal<{ key: string; detail: string | null } | null>(null);

  protected readonly reasonKey = computed(() => {
    switch (this.reason()) {
      case 'expired':
        return 'login.reasonExpired';
      case 'idle':
        return 'login.reasonIdle';
      default:
        return null;
    }
  });

  protected readonly demoAccounts = demoAccounts;

  protected submit(): void {
    if (this.submitting()) return;
    this.failure.set(null);
    clearServerErrors(this.form);
    if (!validateAndFocus(this.form, this.host)) return;

    const { email, password, remember } = this.form.getRawValue();
    this.submitting.set(true);
    this.auth
      .login(email, password, remember)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (user) => {
          this.notify.success('login.welcome', { name: user.name });
          void this.auth.navigateAfterLogin(this.returnUrl(), this.uid());
        },
        error: (error: unknown) => {
          this.submitting.set(false);
          this.form.controls.password.reset('');
          this.failure.set(this.describe(error));
        },
      });
  }

  protected useDemoAccount(email: string): void {
    this.form.setValue({ email, password: demoPassword, remember: true });
    this.failure.set(null);
  }

  protected onPasswordKey(event: KeyboardEvent): void {
    this.capsLock.set(event.getModifierState?.('CapsLock') ?? false);
  }

  private describe(error: unknown): { key: string; detail: string | null } {
    if (error instanceof InvalidLoginResponseError)
      return { key: 'login.invalidResponse', detail: null };
    const appError = toAppError(error);
    if (appError.kind === 'unauthorized') return { key: 'login.invalidCredentials', detail: null };
    if (appError.kind === 'validation') {
      const unmatched = applyServerErrors(this.form, appError.fieldErrors);
      return {
        key: 'login.invalidCredentials',
        detail:
          unmatched[0] ??
          (Object.keys(appError.fieldErrors).length ? null : appError.serverMessage),
      };
    }
    return { key: appError.messageKey, detail: appError.serverMessage };
  }
}
