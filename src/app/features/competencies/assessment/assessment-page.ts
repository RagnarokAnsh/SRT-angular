import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  numberAttribute,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  FormRecord,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { filter, forkJoin, of, switchMap } from 'rxjs';

import { AssessmentApi } from '@core/api/assessment-api';
import { ChildApi } from '@core/api/child-api';
import { CompetencyApi } from '@core/api/competency-api';
import { AccessService } from '@core/auth/access';
import type { ApiCenter } from '@core/models/center';
import { isKnownCompetency, needsMeasurements } from '@core/catalog/media';
import { CHILD_LIMITS } from '@core/models/child';
import { LEVELS, type Level } from '@core/models/level';
import { NotifyService } from '@core/notify/notify';
import { toIsoDate } from '@core/util/dates';
import { validateAndFocus } from '@shared/forms/form-utils';
import { ValidationMessagePipe } from '@shared/forms/validation-message-pipe';
import { decimalInRange, plainText, requiredText } from '@shared/forms/validators';
import { createLoader } from '@shared/loader';
import { AgePipe } from '@shared/pipes/age-pipe';
import { AppDatePipe } from '@shared/pipes/app-date-pipe';
import { CompetencyNamePipe } from '@shared/pipes/catalog-pipes';
import { PluralPipe } from '@shared/pipes/plural-pipe';
import { scrollToElement } from '@shared/scroll';
import { type HasUnsavedChanges, warnBeforeUnload } from '@shared/unsaved-changes-guard';
import { CenterPicker } from '@shared/ui/center-picker';
import { openConfirm } from '@shared/ui/confirm-dialog';
import { ErrorState } from '@shared/ui/error-state';
import { LevelBadge } from '@shared/ui/level-badge';
import { PageHeader } from '@shared/ui/page-header';
import { Skeleton } from '@shared/ui/skeleton';
import { StateMessage } from '@shared/ui/state-message';

import {
  type ChildProgress,
  MAX_SESSIONS,
  buildSubmissions,
  matchProgress,
  reconcileFailures,
  submitEach,
} from './assessment-model';

type Step = 'select' | 'record';
type ListFilter = 'all' | 'todo' | 'done';

export const REMARKS_MAX = 500;
const HEIGHT_RANGE = CHILD_LIMITS.heightCm;
const WEIGHT_RANGE = CHILD_LIMITS.weightKg;

type MeasurementGroup = FormGroup<{ height: FormControl<string>; weight: FormControl<string> }>;

interface Failure {
  childId: number;
  name: string;
  message: string;
  /** The session number that was being saved. */
  session: number;
}

@Component({
  selector: 'app-assessment-page',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    TranslocoPipe,
    ValidationMessagePipe,
    AgePipe,
    AppDatePipe,
    CompetencyNamePipe,
    PluralPipe,
    PageHeader,
    Skeleton,
    ErrorState,
    StateMessage,
    LevelBadge,
    CenterPicker,
  ],
  templateUrl: './assessment-page.html',
  styleUrl: './assessment-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(window:beforeunload)': 'onBeforeUnload($event)' },
})
export class AssessmentPage implements HasUnsavedChanges {
  private readonly competencyApi = inject(CompetencyApi);
  private readonly childApi = inject(ChildApi);
  private readonly assessmentApi = inject(AssessmentApi);
  private readonly access = inject(AccessService);
  private readonly notify = inject(NotifyService);
  private readonly dialog = inject(MatDialog);
  private readonly transloco = inject(TranslocoService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);

  /** Competency id (route parameter). */
  readonly id = input.required({ transform: numberAttribute });

  protected readonly levels = LEVELS;
  protected readonly maxSessions = MAX_SESSIONS;
  protected readonly remarksMax = REMARKS_MAX;
  protected readonly heightRange = HEIGHT_RANGE;
  protected readonly weightRange = WEIGHT_RANGE;

  // Which centre: the worker's own, or one an administrator chose from the centres they may see.
  protected readonly isWorker = this.access.worksInOwnCenter;
  protected readonly pickedCenter = signal<ApiCenter | null>(null);
  protected readonly centerId = computed(() =>
    this.isWorker() ? this.access.ownCenterId() : (this.pickedCenter()?.id ?? null),
  );

  protected readonly competency = createLoader(() => this.competencyApi.competency(this.id()), {
    lazy: true,
  });
  protected readonly data = createLoader(
    () => {
      const centerId = this.centerId();
      if (centerId === null) return of({ children: [], records: [] });
      return forkJoin({
        children: this.childApi.listForCenter(centerId),
        records: this.assessmentApi.forCompetency(centerId, this.id()),
      });
    },
    { lazy: true },
  );

  protected readonly step = signal<Step>('select');
  protected readonly query = signal('');
  protected readonly listFilter = signal<ListFilter>('all');
  protected readonly selected = signal<ReadonlySet<number>>(new Set());
  protected readonly expanded = signal<number | null>(null);

  protected readonly level = signal<Level | null>(null);
  protected readonly levelError = signal(false);
  protected readonly remarks = new FormControl('', {
    nonNullable: true,
    validators: [Validators.maxLength(REMARKS_MAX), plainText],
  });
  protected readonly measurements = new FormRecord<MeasurementGroup>({});
  protected readonly submitting = signal(false);
  protected readonly failures = signal<Failure[]>([]);
  protected readonly today = signal(toIsoDate());

  protected readonly measured = computed(() => {
    const competency = this.competency.data();
    return !!competency && needsMeasurements(competency);
  });

  protected readonly rubricKey = computed(() => {
    const competency = this.competency.data();
    return (level: Level) =>
      competency && isKnownCompetency(competency.slug)
        ? `catalog.competencies.${competency.slug}.levels.${level}`
        : `levels.${level}.generic`;
  });

  protected readonly progress = computed<ChildProgress[]>(() => {
    const data = this.data.data();
    if (!data) return [];
    return matchProgress(data.children, data.records).sort((a, b) =>
      a.child.name.localeCompare(b.child.name),
    );
  });

  protected readonly counts = computed(() => {
    const all = this.progress();
    const todo = all.filter((p) => p.nextSession !== null).length;
    return { all: all.length, todo, done: all.length - todo };
  });

  protected readonly visible = computed(() => {
    const needle = this.query().trim().toLocaleLowerCase();
    const mode = this.listFilter();
    return this.progress().filter((p) => {
      if (mode === 'todo' && p.nextSession === null) return false;
      if (mode === 'done' && p.nextSession !== null) return false;
      return !needle || p.child.name.toLocaleLowerCase().includes(needle);
    });
  });

  protected readonly selectable = computed(() =>
    this.visible().filter((p) => p.nextSession !== null),
  );
  protected readonly allSelected = computed(() => {
    const options = this.selectable();
    return options.length > 0 && options.every((p) => this.selected().has(p.child.id));
  });
  protected readonly someSelected = computed(
    () => !this.allSelected() && this.selectable().some((p) => this.selected().has(p.child.id)),
  );
  protected readonly chosen = computed(() =>
    this.progress().filter((p) => this.selected().has(p.child.id) && p.nextSession !== null),
  );

  constructor() {
    effect(() => {
      const data = this.data.data();
      if (data && !this.data.loading()) untracked(() => this.reconcileFailures());
    });
    // A new competency or centre starts a fresh assessment; the previous lists are dropped
    // first so they can never be shown (or saved) as the new ones.
    effect(() => {
      this.id();
      const centerId = this.centerId();
      untracked(() => {
        this.competency.clear();
        this.competency.reload();
        this.data.clear();
        if (centerId !== null) this.data.reload();
        this.resetForm();
      });
    });
  }

  /**
   * A result that failed (e.g. timed out) may have been stored by the server after all. Once the
   * list has been reloaded, those students are taken off the retry list so that trying again
   * can never record the same observation twice.
   */
  private reconcileFailures(): void {
    const failures = this.failures();
    if (!failures.length) return;
    const { retry, stored, dropped } = reconcileFailures(failures, this.progress());
    if (!dropped.length) return;
    for (const id of dropped) this.remove(id);
    this.failures.set(retry);
    if (stored) this.notify.successCount('assessment.savedAfterAll', stored);
    if (!retry.length) this.resetForm();
  }

  hasUnsavedChanges(): boolean {
    return (
      this.submitting() ||
      this.selected().size > 0 ||
      this.level() !== null ||
      this.remarks.value.trim() !== ''
    );
  }

  /** Leaving while results are being sent would stop the ones not sent yet. */
  isSaving(): boolean {
    return this.submitting();
  }

  protected onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges()) warnBeforeUnload(event);
  }

  // Step 1: choosing children

  protected toggle(childId: number, checked: boolean): void {
    const next = new Set(this.selected());
    if (checked) next.add(childId);
    else next.delete(childId);
    this.selected.set(next);
  }

  protected toggleAll(checked: boolean): void {
    const next = new Set(this.selected());
    for (const p of this.selectable()) {
      if (checked) next.add(p.child.id);
      else next.delete(p.child.id);
    }
    this.selected.set(next);
  }

  protected toggleHistory(childId: number): void {
    this.expanded.set(this.expanded() === childId ? null : childId);
  }

  protected continue(): void {
    if (!this.chosen().length) return;
    this.syncMeasurementControls();
    this.failures.set([]);
    this.today.set(toIsoDate());
    this.goTo('record');
  }

  // Step 2: recording the level

  protected chooseLevel(level: Level): void {
    this.level.set(level);
    this.levelError.set(false);
  }

  protected remove(childId: number, moveFocus = false): void {
    const index = this.chosen().findIndex((p) => p.child.id === childId);
    this.toggle(childId, false);
    this.measurements.removeControl(String(childId));
    if (!this.chosen().length) {
      this.goTo('select');
    } else if (moveFocus) {
      // The button that had focus is gone: move to the next chip (or the heading).
      this.afterRender(() => {
        const buttons = this.host.nativeElement.querySelectorAll<HTMLElement>('.chip__remove');
        const next = buttons[Math.min(index, buttons.length - 1)];
        (next ?? this.host.nativeElement.querySelector<HTMLElement>('#who-title'))?.focus();
      });
    }
  }

  /** Back to the centre picker; asks first when that would throw away work. */
  protected changeCenter(): void {
    const work = this.selected().size > 0 || this.failures().length > 0 || this.level() !== null;
    if (!work) {
      this.pickedCenter.set(null);
      return;
    }
    openConfirm(this.dialog, {
      titleKey: 'assessment.changeCenterTitle',
      messageKey: 'assessment.changeCenterMessage',
      confirmKey: 'common.changeCenter',
    })
      .pipe(filter(Boolean), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.pickedCenter.set(null));
  }

  protected back(): void {
    this.goTo('select');
  }

  protected measurementGroup(childId: number): MeasurementGroup | null {
    return this.measurements.controls[String(childId)] ?? null;
  }

  protected save(): void {
    if (this.submitting()) return;
    const level = this.level();
    this.levelError.set(level === null);
    this.remarks.markAsTouched();
    const formsValid = validateAndFocus(
      new FormGroup({ remarks: this.remarks, measurements: this.measurements }),
      this.host,
    );
    if (level === null) {
      if (formsValid) {
        const fieldset = this.host.nativeElement.querySelector<HTMLElement>('#level-legend');
        if (fieldset) scrollToElement(fieldset, 'center');
        this.host.nativeElement
          .querySelector<HTMLInputElement>('input[name="level"]')
          ?.focus({ preventScroll: true });
      }
      return;
    }
    if (!formsValid) return;

    const count = this.chosen().length;
    if (!count) {
      this.goTo('select');
      return;
    }
    const attempted = new Map(this.chosen().map((p) => [p.child.id, p.nextSession ?? 0]));
    openConfirm(this.dialog, {
      titleKey: 'assessment.confirmTitle',
      messageKey: 'assessment.confirmMessage',
      count,
      params: { level: this.transloco.translate(`levels.${level}.label`) },
      confirmKey: 'assessment.save',
    })
      .pipe(
        filter(Boolean),
        switchMap(() => {
          this.submitting.set(true);
          this.failures.set([]);
          const today = toIsoDate();
          this.today.set(today);
          const submissions = buildSubmissions({
            children: this.chosen().map((progress) => {
              const group = this.measurementGroup(progress.child.id);
              return {
                progress,
                heightCm: group ? Number(group.controls.height.value) : null,
                weightKg: group ? Number(group.controls.weight.value) : null,
              };
            }),
            competencyId: this.id(),
            level,
            remarks: this.remarks.value,
            anganwadiId: this.centerId() as number,
            today,
          });
          return submitEach(submissions, (s) => this.assessmentApi.submit(s));
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((results) => {
        this.submitting.set(false);
        const savedIds = results.filter((r) => !r.error).map((r) => r.childId);
        const failed = results.filter((r) => r.error);
        for (const id of savedIds) this.remove(id);
        // Always reload: saved students move to their next session, and failed ones may have
        // been stored after all (see reconcileFailures).
        this.data.reload();

        if (!failed.length) {
          this.notify.successCount('assessment.saved', savedIds.length);
          this.resetForm();
          this.focusStep('select');
          return;
        }
        const names = new Map(this.progress().map((p) => [p.child.id, p.child.name]));
        this.failures.set(
          failed.map((f) => ({
            childId: f.childId,
            name: names.get(f.childId) ?? `#${f.childId}`,
            message: f.error ? this.notify.describe(f.error) : '',
            session: attempted.get(f.childId) ?? 0,
          })),
        );
        if (savedIds.length) {
          this.notify.info('assessment.partlySaved', {
            saved: savedIds.length,
            failed: failed.length,
          });
        }
      });
  }

  private syncMeasurementControls(): void {
    if (!this.measured()) return;
    const wanted = new Set(this.chosen().map((p) => String(p.child.id)));
    for (const key of Object.keys(this.measurements.controls)) {
      if (!wanted.has(key)) this.measurements.removeControl(key);
    }
    for (const key of wanted) {
      if (this.measurements.controls[key]) continue;
      this.measurements.addControl(
        key,
        new FormGroup({
          height: new FormControl('', {
            nonNullable: true,
            validators: [
              requiredText,
              decimalInRange(HEIGHT_RANGE.min, HEIGHT_RANGE.max, CHILD_LIMITS.decimals),
            ],
          }),
          weight: new FormControl('', {
            nonNullable: true,
            validators: [
              requiredText,
              decimalInRange(WEIGHT_RANGE.min, WEIGHT_RANGE.max, CHILD_LIMITS.decimals),
            ],
          }),
        }),
      );
    }
  }

  private goTo(step: Step): void {
    this.step.set(step);
    this.host.nativeElement.ownerDocument.defaultView?.scrollTo({ top: 0 });
    this.focusStep(step);
  }

  /** The button that was used is replaced by the new step: give focus to its heading. */
  private focusStep(step: Step): void {
    this.afterRender(() =>
      this.host.nativeElement
        .querySelector<HTMLElement>(step === 'record' ? '#who-title' : '#step-select')
        ?.focus({ preventScroll: true }),
    );
  }

  private afterRender(write: () => void): void {
    afterNextRender({ write }, { injector: this.injector });
  }

  private resetForm(): void {
    this.selected.set(new Set());
    this.level.set(null);
    this.levelError.set(false);
    this.remarks.reset('');
    for (const key of Object.keys(this.measurements.controls)) this.measurements.removeControl(key);
    this.failures.set([]);
    this.step.set('select');
  }
}
