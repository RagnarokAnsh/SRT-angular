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
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { map, of, startWith } from 'rxjs';

import { CenterApi } from '@core/api/center-api';
import { centerInArea } from '@core/auth/access';
import { LocationCache } from '@core/api/location-cache';
import { UserApi } from '@core/api/user-api';
import { ROLE_LOCATION_DEPTH, ROLE_PRIORITY } from '@core/auth/roles';
import { SessionStore } from '@core/auth/session';
import type { RoleName } from '@core/models/role';
import { type ApiUser, USER_GENDERS, type UserInput } from '@core/models/user';
import { toAppError } from '@core/network/app-error';
import { NotifyService } from '@core/notify/notify';
import { applyServerErrors, validateAndFocus } from '@shared/forms/form-utils';
import { LocationCascade } from '@shared/forms/location-cascade';
import { LocationFields } from '@shared/forms/location-fields';
import { ValidationMessagePipe } from '@shared/forms/validation-message-pipe';
import {
  EMAIL_MAX,
  NAME_MAX,
  PASSWORD_MAX,
  emailAddress,
  isPositiveId,
  minTextLength,
  personName,
  requiredText,
  strongPassword,
} from '@shared/forms/validators';
import { createLoader } from '@shared/loader';
import { type HasUnsavedChanges, warnBeforeUnload } from '@shared/unsaved-changes-guard';
import { ErrorState } from '@shared/ui/error-state';
import { PageHeader } from '@shared/ui/page-header';
import { Skeleton } from '@shared/ui/skeleton';
import { StateMessage } from '@shared/ui/state-message';

import { primaryRole } from './user-list-page';

const LOCATION_KEYS = ['country_id', 'state_id', 'district_id', 'project', 'sector'] as const;

@Component({
  selector: 'app-user-form-page',
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
    LocationFields,
    ErrorState,
    PageHeader,
    Skeleton,
    StateMessage,
  ],
  templateUrl: './user-form-page.html',
  styleUrl: '../admin-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(window:beforeunload)': 'onBeforeUnload($event)' },
})
export class UserFormPage implements HasUnsavedChanges {
  private readonly userApi = inject(UserApi);
  private readonly session = inject(SessionStore);
  private readonly centerApi = inject(CenterApi);
  private readonly notify = inject(NotifyService);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  /** Route parameter; absent when adding a user. */
  readonly id = input<number | undefined, unknown>(undefined, {
    transform: (value: unknown) =>
      value === undefined || value === null ? undefined : Number(value),
  });

  protected readonly roles = ROLE_PRIORITY;
  protected readonly genders = USER_GENDERS;
  protected readonly nameMax = NAME_MAX;
  protected readonly emailMax = EMAIL_MAX;
  protected readonly passwordMax = PASSWORD_MAX;
  protected readonly isEdit = computed(() => this.id() !== undefined);
  protected readonly showPassword = signal(false);
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);
  private saved = false;

  protected readonly form = inject(NonNullableFormBuilder).group({
    name: ['', [requiredText, minTextLength(2), Validators.maxLength(NAME_MAX), personName]],
    email: ['', [Validators.required, emailAddress, Validators.maxLength(EMAIL_MAX)]],
    password: ['', [Validators.maxLength(PASSWORD_MAX), strongPassword]],
    role: ['' as RoleName | '', Validators.required],
    gender: ['', Validators.required],
    country_id: [null as number | null],
    state_id: [null as number | null],
    district_id: [null as number | null],
    project: [''],
    sector: [''],
    anganwadi_id: [null as number | null],
  });

  protected readonly location = new LocationCascade(
    this.form.controls,
    inject(LocationCache),
    this.destroyRef,
  );

  /** All values, including disabled fields (e.g. your own role). */
  private readonly value = toSignal(
    this.form.valueChanges.pipe(
      map(() => this.form.getRawValue()),
      startWith(this.form.getRawValue()),
    ),
    { initialValue: this.form.getRawValue() },
  );
  protected readonly role = computed(() => (this.value().role || null) as RoleName | null);
  protected readonly depth = computed(() => {
    const role = this.role();
    return role ? ROLE_LOCATION_DEPTH[role] : 0;
  });
  protected readonly needsCenter = computed(() => this.role() === 'aww');

  protected readonly invalidId = computed(
    () => this.id() !== undefined && !isPositiveId(this.id()),
  );
  /** Admins can't change their own role (they could lock themselves out). */
  protected readonly editingSelf = computed(
    () => this.id() !== undefined && this.id() === this.session.user()?.id,
  );

  protected readonly existing = createLoader(
    () => {
      const id = this.id();
      return id === undefined || !isPositiveId(id) ? of(null) : this.userApi.get(id);
    },
    { lazy: true },
  );
  protected readonly centers = createLoader(() => this.centerApi.list(), { lazy: true });

  /** Centres in the chosen district, project and sector (the same check that scopes access). */
  protected readonly centerOptions = computed(() => {
    const v = this.value();
    const area = {
      depth: 5,
      countryId: v.country_id,
      stateId: v.state_id,
      districtId: v.district_id,
      project: v.project,
      sector: v.sector,
    };
    return (this.centers.data() ?? []).filter((center) => centerInArea(center, area));
  });

  constructor() {
    // The role decides which location fields apply (and are required).
    effect(() => {
      const depth = this.depth();
      const needsCenter = this.needsCenter();
      untracked(() => {
        LOCATION_KEYS.forEach((key, index) =>
          this.configure(this.form.controls[key], index < depth),
        );
        this.configure(this.form.controls.anganwadi_id, needsCenter);
        if (needsCenter && !this.centers.data() && !this.centers.loading()) this.centers.reload();
      });
    });
    effect(() => {
      const isEdit = this.isEdit();
      untracked(() => {
        const password = this.form.controls.password;
        password.setValidators(
          isEdit
            ? [Validators.maxLength(PASSWORD_MAX), strongPassword]
            : [requiredText, Validators.maxLength(PASSWORD_MAX), strongPassword],
        );
        password.updateValueAndValidity({ emitEvent: false });
        this.existing.reload();
      });
    });
    effect(() => {
      const user = this.existing.data();
      if (user) untracked(() => this.fill(user));
    });
    effect(() => {
      const self = this.editingSelf();
      untracked(() => {
        if (self) this.form.controls.role.disable({ emitEvent: false });
        else this.form.controls.role.enable({ emitEvent: false });
      });
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

    const v = this.form.getRawValue();
    const role = v.role as RoleName;
    const depth = ROLE_LOCATION_DEPTH[role];
    const input: UserInput = {
      name: v.name.trim().replace(/\s+/g, ' '),
      email: v.email.trim().toLowerCase(),
      role,
      gender: v.gender,
    };
    if (v.password) input.password = v.password;
    if (depth >= 1 && v.country_id) input.country_id = v.country_id;
    if (depth >= 2 && v.state_id) input.state_id = v.state_id;
    if (depth >= 3 && v.district_id) input.district_id = v.district_id;
    if (depth >= 4 && v.project) input.project = v.project;
    if (depth >= 5 && v.sector) input.sector = v.sector;
    if (role === 'aww' && v.anganwadi_id) input.anganwadi_id = v.anganwadi_id;

    const id = this.id();
    this.saving.set(true);
    (id === undefined ? this.userApi.create(input) : this.userApi.update(id, input))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.saved = true;
          this.form.markAsPristine();
          this.notify.success(id === undefined ? 'admin.users.added' : 'admin.users.saved', {
            name: input.name,
          });
          void this.router.navigate(['/admin/users']);
        },
        error: (error: unknown) => {
          this.saving.set(false);
          const appError = toAppError(error);
          if (appError.kind === 'validation') {
            const unmatched = applyServerErrors(this.form, appError.fieldErrors);
            this.formError.set(unmatched[0] ?? appError.serverMessage ?? null);
            validateAndFocus(this.form, this.host);
          } else {
            this.notify.error(appError);
          }
        },
      });
  }

  protected cancel(): void {
    void this.router.navigate(['/admin/users']);
  }

  private configure(control: AbstractControl, active: boolean): void {
    if (active) {
      control.setValidators(Validators.required);
      control.enable({ emitEvent: false });
    } else {
      control.clearValidators();
      control.disable({ emitEvent: false });
    }
    control.updateValueAndValidity({ emitEvent: false });
  }

  private fill(user: ApiUser): void {
    this.form.patchValue({
      name: user.name,
      email: user.email,
      password: '',
      role: primaryRole(user) ?? '',
      gender: user.gender ?? '',
      anganwadi_id: user.anganwadi_id ?? user.anganwadi?.id ?? null,
    });
    this.location.fill({
      country_id: user.country_id ?? null,
      state_id: user.state_id ?? null,
      district_id: user.district_id ?? null,
      project: user.project ?? '',
      sector: user.sector ?? '',
    });
    this.form.markAsPristine();
  }
}
