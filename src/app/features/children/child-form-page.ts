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
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
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
  toChildGender,
} from '@core/models/child';
import { toAppError } from '@core/network/app-error';
import { NotifyService } from '@core/notify/notify';
import { type IsoDate, addYears, ageOn, isValidIsoDate, toIsoDate } from '@core/util/dates';
import { tidyText, toAsciiDigits } from '@core/util/text';
import { clearServerErrors, reportServerErrors, validateAndFocus } from '@shared/forms/form-utils';
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
  return tidyText(name).toLocaleLowerCase();
}

/**
 * The API keeps one name; the form asks for the first and last name, as the previous version
 * did. The first word is the first name, the rest the last name.
 */
export function splitName(name: string): { firstName: string; lastName: string } {
  const [firstName = '', ...rest] = tidyText(name).split(' ');
  return { firstName, lastName: rest.join(' ') };
}

export function joinName(firstName: string, lastName: string): string {
  return tidyText(`${firstName} ${lastName}`);
}

/** Same name (ignoring case, spacing and how the letters were typed) and same date of birth. */
export function isSameChild(
  child: Pick<Child, 'name' | 'dateOfBirth'>,
  input: Pick<ChildInput, 'name' | 'dateOfBirth'>,
): boolean {
  return (
    child.dateOfBirth === input.dateOfBirth && normalized(child.name) === normalized(input.name)
  );
}

/** API field names (422 errors) → form controls. The age is worked out from the birth date. */
const SERVER_FIELDS: Record<string, string> = {
  date_of_birth: 'dateOfBirth',
  age: 'dateOfBirth',
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
  private readonly injector = inject(Injector);
  private readonly transloco = inject(TranslocoService);

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
  /** A stored name of one word can still be saved as it is, without a last name. */
  private oneWordName = false;

  private readonly ageRule = (control: AbstractControl): ValidationErrors | null =>
    this.originalDob && control.value === this.originalDob
      ? null
      : ageInRange(CHILD_LIMITS.ageMin, CHILD_LIMITS.ageMax)(control);

  private readonly lastNameRule = (control: AbstractControl): ValidationErrors | null =>
    this.oneWordName ? null : requiredText(control);

  protected readonly form = inject(NonNullableFormBuilder).group({
    firstName: [
      '',
      [requiredText, minTextLength(2), Validators.maxLength(CHILD_LIMITS.firstNameMax), personName],
    ],
    lastName: [
      '',
      [
        this.lastNameRule,
        minTextLength(2),
        Validators.maxLength(CHILD_LIMITS.lastNameMax),
        personName,
      ],
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
    clearServerErrors(this.form);
    if (!validateAndFocus(this.form, this.host)) return;

    const value = this.form.getRawValue();
    const input: ChildInput = {
      name: joinName(value.firstName, value.lastName),
      dateOfBirth: value.dateOfBirth,
      gender: value.gender as ChildGender,
      symbol: tidyText(value.symbol),
      language: tidyText(value.language),
      heightCm: Number(toAsciiDigits(value.heightCm.trim())),
      weightKg: Number(toAsciiDigits(value.weightKg.trim())),
      anganwadiId: value.anganwadiId as number,
    };
    const id = this.id();
    const original = this.existing.data() ?? null;
    const userId = this.session.user()?.id ?? null;
    // Editing keeps who added the student; a worker adding one is recorded as theirs.
    const awwId = (id !== undefined ? original?.awwId : null) ?? (this.isWorker() ? userId : null);
    this.saving.set(true);
    // Another student with the same name and date of birth at the same centre is probably a
    // duplicate: ask before saving (if the check itself fails, just continue). When editing,
    // only if the name or date of birth changed.
    const checkDuplicate = id === undefined || !original || !isSameChild(original, input);
    const duplicate$ = checkDuplicate
      ? this.childApi.listForCenter(input.anganwadiId).pipe(
          map((children) => children.find((c) => c.id !== id && isSameChild(c, input)) ?? null),
          catchError(() => of(null)),
        )
      : of(null);
    duplicate$
      .pipe(
        switchMap((duplicate) =>
          duplicate
            ? openConfirm(this.dialog, {
                titleKey: 'childForm.duplicateTitle',
                messageKey:
                  id === undefined
                    ? 'childForm.duplicateMessage'
                    : 'childForm.duplicateEditMessage',
                params: { name: duplicate.name },
                confirmKey: id === undefined ? 'childForm.addAnyway' : 'childForm.saveAnyway',
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
            this.formError.set(
              reportServerErrors(this.form, appError, {
                host: this.host,
                injector: this.injector,
                fallback: this.transloco.translate('errors.rejected'),
                fieldMap: SERVER_FIELDS,
                // A worker's centre isn't shown on the form.
                hidden: this.isWorker() ? ['anganwadiId'] : [],
              }),
            );
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
    const { firstName, lastName } = splitName(child.name);
    this.oneWordName = lastName === '';
    // Older records may say "boy" or "Male": shown as the matching choice, not as missing.
    const gender = toChildGender(child.gender) ?? '';
    this.form.reset({
      firstName,
      lastName,
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
