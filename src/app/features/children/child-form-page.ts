import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  type AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  type ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { catchError, filter, map, of, startWith, switchMap, tap } from 'rxjs';

import { ChildApi } from '@core/api/child-api';
import { AccessService } from '@core/auth/access';
import { SessionStore } from '@core/auth/session';
import {
  CHILD_GENDERS,
  CHILD_LIMITS,
  type Child,
  type ChildGender,
  type ChildInput,
} from '@core/models/child';
import { toAppError } from '@core/network/app-error';
import { NotifyService } from '@core/notify/notify';
import { type IsoDate, addYears, ageOn, isValidIsoDate, toIsoDate } from '@core/util/dates';
import { applyServerErrors, validateAndFocus } from '@shared/forms/form-utils';
import { ValidationMessagePipe } from '@shared/forms/validation-message-pipe';
import {
  ageInRange,
  decimalInRange,
  isPositiveId,
  languageName,
  minTextLength,
  pastIsoDate,
  personName,
  plainText,
  requiredText,
} from '@shared/forms/validators';
import { createLoader } from '@shared/loader';
import { AgePipe } from '@shared/pipes/age-pipe';
import { type HasUnsavedChanges, warnBeforeUnload } from '@shared/unsaved-changes-guard';
import { openConfirm } from '@shared/ui/confirm-dialog';
import { ErrorState } from '@shared/ui/error-state';
import { PageHeader } from '@shared/ui/page-header';
import { Skeleton } from '@shared/ui/skeleton';
import { StateMessage } from '@shared/ui/state-message';

import { LANGUAGE_SUGGESTIONS, genderKey } from './child-labels';

function normalized(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

/** Same name (ignoring case and spacing) and same date of birth. */
export function isSameChild(child: Child, input: ChildInput): boolean {
  return (
    child.dateOfBirth === input.dateOfBirth && normalized(child.name) === normalized(input.name)
  );
}

/** API field names (422 errors) → form controls. */
const SERVER_FIELDS: Record<string, string> = {
  date_of_birth: 'dateOfBirth',
  height_cm: 'heightCm',
  weight_kg: 'weightKg',
  anganwadi_id: 'anganwadiId',
};

@Component({
  selector: 'app-child-form-page',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatRadioModule,
    MatSelectModule,
    TranslocoPipe,
    ValidationMessagePipe,
    AgePipe,
    PageHeader,
    Skeleton,
    ErrorState,
    StateMessage,
  ],
  templateUrl: './child-form-page.html',
  styleUrl: './child-form-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(window:beforeunload)': 'onBeforeUnload($event)' },
})
export class ChildFormPage implements HasUnsavedChanges {
  private readonly childApi = inject(ChildApi);
  private readonly access = inject(AccessService);
  private readonly session = inject(SessionStore);
  private readonly notify = inject(NotifyService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  /** Route parameter; absent when adding a child. */
  readonly id = input<number | undefined, unknown>(undefined, {
    transform: (value: unknown) =>
      value === undefined || value === null ? undefined : Number(value),
  });

  protected readonly limits = CHILD_LIMITS;
  protected readonly genders = CHILD_GENDERS;
  protected readonly genderKey = genderKey;
  protected readonly languages = LANGUAGE_SUGGESTIONS;
  protected readonly today = toIsoDate();
  protected readonly earliestBirth = addYears(this.today, -(CHILD_LIMITS.ageMax + 2));

  protected readonly isEdit = computed(() => this.id() !== undefined);
  /** Workers add students to their own centre; others choose one of the centres they may see. */
  protected readonly isWorker = this.access.worksInOwnCenter;
  protected readonly ownCenterId = this.access.ownCenterId;
  protected readonly ownCenterName = computed(() => this.session.user()?.anganwadi?.name ?? null);
  /** A worker whose account isn't linked to a centre can't add or edit anyone. */
  protected readonly unlinked = computed(() => this.isWorker() && this.ownCenterId() === null);

  /** An address like /students/abc/edit points at nothing; don't ask the server. */
  protected readonly invalidId = computed(
    () => this.id() !== undefined && !isPositiveId(this.id()),
  );

  protected readonly existing = createLoader(
    () => {
      const id = this.id();
      return id === undefined || !isPositiveId(id) ? of(null) : this.childApi.get(id);
    },
    { lazy: true },
  );
  protected readonly centers = createLoader(() => this.access.visibleCenters(), { lazy: true });

  /**
   * Supervisors and officials may only open students of the centres in their area, so when
   * editing, their centre list is needed before the form can be shown.
   */
  protected readonly needsCenters = computed(
    () => this.isEdit() && this.access.scope().kind === 'area',
  );

  /** Only students the user may see can be edited (workers: their centre; others: their area). */
  protected readonly forbidden = computed(() => {
    const child = this.existing.data();
    if (!child) return false;
    const scope = this.access.scope();
    if (scope.kind === 'all') return false;
    if (scope.kind === 'center') return child.anganwadiId !== scope.centerId;
    const centers = this.centers.data();
    return !!centers && !centers.some((center) => center.id === child.anganwadiId);
  });

  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);
  private saved = false;
  /** The stored date of birth: older children can still be edited without tripping the age rule. */
  private originalDob: IsoDate | null = null;

  private readonly ageRule = (control: AbstractControl): ValidationErrors | null =>
    this.originalDob && control.value === this.originalDob
      ? null
      : ageInRange(CHILD_LIMITS.ageMin, CHILD_LIMITS.ageMax)(control);

  protected readonly form = inject(NonNullableFormBuilder).group({
    name: [
      '',
      [requiredText, minTextLength(2), Validators.maxLength(CHILD_LIMITS.nameMax), personName],
    ],
    dateOfBirth: ['', [Validators.required, pastIsoDate(), this.ageRule]],
    gender: ['' as ChildGender | '', Validators.required],
    symbol: ['', [requiredText, Validators.maxLength(CHILD_LIMITS.symbolMax), plainText]],
    language: ['', [requiredText, Validators.maxLength(CHILD_LIMITS.languageMax), languageName]],
    heightCm: [
      '',
      [
        requiredText,
        decimalInRange(CHILD_LIMITS.heightCm.min, CHILD_LIMITS.heightCm.max, CHILD_LIMITS.decimals),
      ],
    ],
    weightKg: [
      '',
      [
        requiredText,
        decimalInRange(CHILD_LIMITS.weightKg.min, CHILD_LIMITS.weightKg.max, CHILD_LIMITS.decimals),
      ],
    ],
    anganwadiId: [null as number | null, Validators.required],
  });

  private readonly dob = toSignal(
    this.form.controls.dateOfBirth.valueChanges.pipe(
      startWith(this.form.controls.dateOfBirth.value),
    ),
    { initialValue: '' },
  );
  protected readonly ageToday = computed(() => {
    const dob = this.dob();
    return isValidIsoDate(dob) && dob <= this.today ? ageOn(dob, this.today) : null;
  });

  constructor() {
    effect(() => {
      const centerId = this.ownCenterId();
      const worker = this.isWorker();
      untracked(() => {
        if (!worker) this.centers.reload();
        else if (centerId !== null) this.form.controls.anganwadiId.setValue(centerId);
      });
    });
    effect(() => {
      this.id();
      untracked(() => this.existing.reload());
    });
    effect(() => {
      const child = this.existing.data();
      if (child) untracked(() => this.fill(child));
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
    if (!validateAndFocus(this.form, this.host)) return;

    const value = this.form.getRawValue();
    const input: ChildInput = {
      name: value.name.trim().replace(/\s+/g, ' '),
      dateOfBirth: value.dateOfBirth,
      gender: value.gender as ChildGender,
      symbol: value.symbol.trim(),
      language: value.language.trim().replace(/\s+/g, ' '),
      heightCm: Number(value.heightCm),
      weightKg: Number(value.weightKg),
      anganwadiId: value.anganwadiId as number,
    };
    const id = this.id();
    const awwId = this.isWorker()
      ? (this.session.user()?.id ?? null)
      : (this.existing.data()?.awwId ?? null);
    this.saving.set(true);
    // A new child with the same name and date of birth at the same centre is probably a
    // duplicate: ask before adding (if the check itself fails, just continue).
    const duplicate$ =
      id === undefined
        ? this.childApi.listForCenter(input.anganwadiId).pipe(
            map((children) => children.find((c) => isSameChild(c, input)) ?? null),
            catchError(() => of(null)),
          )
        : of(null);
    duplicate$
      .pipe(
        switchMap((duplicate) =>
          duplicate
            ? openConfirm(this.dialog, {
                titleKey: 'childForm.duplicateTitle',
                messageKey: 'childForm.duplicateMessage',
                params: { name: duplicate.name },
                confirmKey: 'childForm.addAnyway',
              })
            : of(true),
        ),
        tap((proceed) => {
          if (!proceed) this.saving.set(false);
        }),
        filter(Boolean),
        switchMap(() =>
          id === undefined
            ? this.childApi.create(input, awwId)
            : this.childApi.update(id, input, awwId),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.saved = true;
          this.form.markAsPristine();
          this.notify.success(id === undefined ? 'childForm.added' : 'childForm.saved', {
            name: input.name,
          });
          void this.router.navigate(['/students']);
        },
        error: (error: unknown) => {
          this.saving.set(false);
          const appError = toAppError(error);
          if (appError.kind === 'validation') {
            const unmatched = applyServerErrors(this.form, appError.fieldErrors, SERVER_FIELDS);
            this.formError.set(unmatched[0] ?? appError.serverMessage ?? null);
            validateAndFocus(this.form, this.host);
          } else {
            this.notify.error(appError);
          }
        },
      });
  }

  protected cancel(): void {
    void this.router.navigate(['/students']);
  }

  private fill(child: Child): void {
    this.originalDob = child.dateOfBirth;
    const gender = (CHILD_GENDERS as readonly string[]).includes(child.gender)
      ? (child.gender as ChildGender)
      : '';
    this.form.reset({
      name: child.name,
      dateOfBirth: child.dateOfBirth ?? '',
      gender,
      symbol: child.symbol,
      language: child.language,
      heightCm: child.heightCm === null ? '' : String(child.heightCm),
      weightKg: child.weightKg === null ? '' : String(child.weightKg),
      anganwadiId: child.anganwadiId,
    });
  }
}
