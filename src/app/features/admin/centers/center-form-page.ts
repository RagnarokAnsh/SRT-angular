import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';

import { CenterApi } from '@core/api/center-api';
import { LocationCache } from '@core/api/location-cache';
import type { ApiCenter, CenterInput } from '@core/models/center';
import { toAppError } from '@core/network/app-error';
import { NotifyService } from '@core/notify/notify';
import { clearServerErrors, reportServerErrors, validateAndFocus } from '@shared/forms/form-utils';
import { LocationCascade } from '@shared/forms/location-cascade';
import { LocationFields } from '@shared/forms/location-fields';
import { ValidationMessagePipe } from '@shared/forms/validation-message-pipe';
import {
  centerCode,
  isPositiveId,
  minTextLength,
  plainText,
  requiredText,
} from '@shared/forms/validators';
import { createLoader } from '@shared/loader';
import { type HasUnsavedChanges, warnBeforeUnload } from '@shared/unsaved-changes-guard';
import { ErrorState } from '@shared/ui/error-state';
import { PageHeader } from '@shared/ui/page-header';
import { Skeleton } from '@shared/ui/skeleton';
import { StateMessage } from '@shared/ui/state-message';

export const CENTER_LIMITS = { nameMax: 100, codeMax: 30 } as const;

@Component({
  selector: 'app-center-form-page',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    TranslocoPipe,
    ValidationMessagePipe,
    LocationFields,
    ErrorState,
    PageHeader,
    Skeleton,
    StateMessage,
  ],
  templateUrl: './center-form-page.html',
  styleUrl: '../admin-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(window:beforeunload)': 'onBeforeUnload($event)' },
})
export class CenterFormPage implements HasUnsavedChanges {
  private readonly api = inject(CenterApi);
  private readonly notify = inject(NotifyService);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly transloco = inject(TranslocoService);

  /** Route parameter; absent when adding a centre. */
  readonly id = input<number | undefined, unknown>(undefined, {
    transform: (value: unknown) =>
      value === undefined || value === null ? undefined : Number(value),
  });

  protected readonly limits = CENTER_LIMITS;
  protected readonly isEdit = computed(() => this.id() !== undefined);
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);
  private saved = false;

  protected readonly form = inject(NonNullableFormBuilder).group({
    name: [
      '',
      [requiredText, minTextLength(2), Validators.maxLength(CENTER_LIMITS.nameMax), plainText],
    ],
    code: ['', [requiredText, Validators.maxLength(CENTER_LIMITS.codeMax), centerCode]],
    country_id: [null as number | null, Validators.required],
    state_id: [null as number | null, Validators.required],
    district_id: [null as number | null, Validators.required],
    project: ['', Validators.required],
    sector: ['', Validators.required],
  });

  protected readonly location = new LocationCascade(
    this.form.controls,
    inject(LocationCache),
    this.destroyRef,
  );

  protected readonly invalidId = computed(
    () => this.id() !== undefined && !isPositiveId(this.id()),
  );

  protected readonly existing = createLoader(
    () => {
      const id = this.id();
      return id === undefined || !isPositiveId(id) ? of(null) : this.api.get(id);
    },
    { lazy: true },
  );

  constructor() {
    effect(() => {
      this.id();
      untracked(() => this.existing.reload());
    });
    effect(() => {
      const center = this.existing.data();
      if (center) untracked(() => this.fill(center));
    });
  }

  /** Also true while saving: leaving then could lose the changes. */
  hasUnsavedChanges(): boolean {
    return this.form.dirty && !this.saved;
  }

  isSaving(): boolean {
    return this.saving();
  }

  protected onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges()) warnBeforeUnload(event);
  }

  protected submit(): void {
    if (this.saving()) return;
    this.formError.set(null);
    clearServerErrors(this.form);
    if (!validateAndFocus(this.form, this.host)) return;
    const v = this.form.getRawValue();
    const input: CenterInput = {
      name: v.name.trim().replace(/\s+/g, ' '),
      code: v.code.trim().toUpperCase(),
      project: v.project,
      sector: v.sector,
      country_id: v.country_id as number,
      state_id: v.state_id as number,
      district_id: v.district_id as number,
    };
    const id = this.id();
    this.saving.set(true);
    (id === undefined ? this.api.create(input) : this.api.update(id, input))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.saved = true;
          this.form.markAsPristine();
          this.notify.success(id === undefined ? 'admin.centers.added' : 'admin.centers.saved', {
            name: input.name,
          });
          void this.router.navigate(['/admin/centers']);
        },
        error: (error: unknown) => {
          this.saving.set(false);
          const appError = toAppError(error);
          if (appError.kind === 'validation') {
            this.formError.set(
              reportServerErrors(this.form, appError, {
                host: this.host,
                injector: this.injector,
                fallback: this.transloco.translate('errors.rejected'),
              }),
            );
          } else {
            this.notify.error(appError);
          }
        },
      });
  }

  protected cancel(): void {
    void this.router.navigate(['/admin/centers']);
  }

  private fill(center: ApiCenter): void {
    this.form.patchValue({ name: center.name, code: center.code });
    this.location.fill({
      country_id: center.country_id,
      state_id: center.state_id,
      district_id: center.district_id,
      project: center.project,
      sector: center.sector,
    });
    this.form.markAsPristine();
  }
}
