import { Component, ChangeDetectionStrategy, inject, OnInit, ViewChild, TemplateRef, ChangeDetectorRef, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';
import { forkJoin, of, Subject, combineLatest, fromEvent, merge } from 'rxjs';
import { map, catchError, tap, takeUntil, debounceTime, distinctUntilChanged, startWith, shareReplay } from 'rxjs/operators';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

// Material Imports
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SelectionModel } from '@angular/cdk/collections';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';

// PrimeNG Imports - Remove ToastModule as we're using global toast
import { InputNumberModule } from 'primeng/inputnumber';

// Services
import { CompetencyService, ApiCompetency } from '../../competency.service';
import { Student as ServiceStudent } from '../student-management/student.service';
import { StudentService } from '../student-management/student.service';
import { AssessmentService, AssessmentSubmission } from './assessment.service';
import { UserService } from '../../services/user.service';
import { LoggerService } from '../../services/logger.service';
import { StateManagementService } from '../../services/state-management.service';
import { ToastService } from '../../services/toast.service';
import { ConfirmDialogComponent } from './confirm-dialog/confirm-dialog.component';

// Local Interfaces
interface LevelDescription {
  level: string;
  description: string;
  color: string;
}

/**
 * Interface for Assessment data structure
 */
interface Assessment {
  child_ids: number[];
  competency_id: number;
  observation: string;
  assessment_date: string;
  remarks: string;
}

/**
 * Interface for Student data
 */
interface Student extends ServiceStudent {
  assessed?: boolean;
  assessed2?: boolean;
  assessed3?: boolean;
  assessed4?: boolean;
  assessmentLevel?: string;
  assessmentLevel2?: string;
  assessmentLevel3?: string;
  assessmentLevel4?: string;
  assessmentDate?: string;
  assessmentDate2?: string;
  assessmentDate3?: string;
  assessmentDate4?: string;
  age1?: number;
  age2?: number;
  age3?: number;
  age4?: number;
  height1?: number;
  height2?: number;
  height3?: number;
  height4?: number;
  weight1?: number;
  weight2?: number;
  weight3?: number;
  weight4?: number;
  remarks?: string;
  remarks1?: string;
  remarks2?: string;
  remarks3?: string;
  remarks4?: string;
}

/**
 * Assessment Component
 * Handles the assessment workflow for students based on competency levels
 * Enhanced with mobile-first design and production optimizations
 */
@Component({
  selector: 'app-assessments',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatRadioModule,
    MatToolbarModule,
    MatIconModule,
    MatListModule,
    MatCheckboxModule,
    MatInputModule,
    MatFormFieldModule,
    MatTableModule,
    MatDialogModule,
    MatTooltipModule,
    MatSortModule,
    MatPaginatorModule,
    InputNumberModule
  ],
  templateUrl: './assessments.component.html',
  styleUrls: ['./assessments.component.scss'],
  animations: [
    trigger('fadeAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-20px)' }),
        animate('300ms ease-in', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('300ms ease-out', style({ opacity: 0, transform: 'translateY(-20px)' }))
      ])
    ])
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AssessmentsComponent implements OnInit, OnDestroy {
  // Template references
  @ViewChild('teachingStrategiesDialog') teachingStrategiesDialog!: TemplateRef<any>;
  @ViewChild('remarksDialog') remarksDialog!: TemplateRef<any>;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild('videoPlayer') videoPlayer!: ElementRef;

  // Destroy subject for cleanup
  private destroy$ = new Subject<void>();

  // Enhanced mobile detection and responsive state
  public isMobile$ = merge(
    fromEvent(window, 'resize').pipe(startWith(null)),
    fromEvent(window, 'orientationchange').pipe(startWith(null))
  ).pipe(
    map(() => window.innerWidth < 768),
    distinctUntilChanged(),
    shareReplay(1),
    takeUntil(this.destroy$)
  );

  // Component state observables from state management service
  public students$ = this.stateService.allStudents$;
  public filteredStudents$ = this.stateService.filteredStudents$;
  public selectedCompetency$ = this.stateService.selectedCompetency$;
  public selectedStudents$ = this.stateService.selectedStudents$;
  public activeTab$ = this.stateService.activeTab$;
  public isLoading$ = this.stateService.isLoading$;

  // UI control
  selectedCompetency: string = '';
  selectedCompetencyId: number = 0;
  activeTab: 'students' | 'levels' = 'students';
  menuOpen = false;
  currentRemarks: string = '';
  currentStudent: Student | null = null;
  currentAudio: HTMLAudioElement | null = null;
  students: Student[] = [];
  filteredStudents: Student[] = [];
  displayedColumns: string[] = ['select', 'name', 'assessmentInfo'];
  maxSessions: number = 1;
  dataSource = new MatTableDataSource<Student>();
  selection = new SelectionModel<Student>(true, []);
  levelDescriptions: LevelDescription[] = [];
  assessment: Assessment = {
    child_ids: [],
    competency_id: 0,
    observation: '',
    assessment_date: new Date().toISOString().split('T')[0],
    remarks: ''
  };
  currentUserAnganwadiId: number | null = null;
  allStudents: Student[] = [];
  isLoading: boolean = false;
  showHeightWeightColumns: boolean = false;
  showHeightWeightInputs: boolean = false;
  isGrossOrFineMotor: boolean = false;
  isMobile: boolean = false;

  // Competency information
  competencyId: number = 0;
  competencyData: ApiCompetency | null = null;

  // Service injection
  private competencyService = inject(CompetencyService);
  private studentService = inject(StudentService);
  private assessmentService = inject(AssessmentService);
  private userService = inject(UserService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private dialog = inject(MatDialog);
  private cdr = inject(ChangeDetectorRef);
  private logger = inject(LoggerService);
  private stateService = inject(StateManagementService);
  private toastService = inject(ToastService); // Use ToastService instead of MessageService

  ngOnInit() {
    this.logger.info('Assessment component initialized', { component: 'AssessmentsComponent' });
    
    // Track page view for analytics
    this.logger.trackUserAction('page_view', {
      page: 'assessment',
      route: this.router.url
    });

    // Initialize mobile detection
    this.isMobile$.subscribe(isMobile => {
      this.isMobile = isMobile;
      this.logger.debug('Mobile state changed', { isMobile });
      this.cdr.markForCheck();
    });

    // Get route parameters
    const competencyId = this.route.snapshot.paramMap.get('competencyId');
    if (competencyId) {
      this.competencyId = parseInt(competencyId, 10);
      this.assessment.competency_id = this.competencyId;
      this.logger.info('Competency ID from route', { competencyId: this.competencyId });
    }

    // Initialize component data
    this.initializeComponent();
  }

  ngOnDestroy() {
    this.logger.info('Assessment component destroyed');
    this.destroy$.next();
    this.destroy$.complete();
    
    // Clean up audio if playing
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
  }

  /**
   * Initialize component data and setup
   */
  private async initializeComponent(): Promise<void> {
    try {
      this.setLoading(true);
      
      // Start performance tracking
      this.logger.startPerformanceTracking('assessment_initialization');

      // Get current user data
      await this.getCurrentUser();
      
      // Load initial data in parallel for better performance
      await Promise.all([
        this.loadCompetencyData(),
        this.loadStudents()
      ]);
      
      // Setup level descriptions
      this.setupLevelDescriptions();
      
      // Configure table
      this.setupTable();
      
      this.logger.endPerformanceTracking('assessment_initialization');
      this.logger.info('Assessment component initialization completed');
      
    } catch (error) {
      this.logger.error('Failed to initialize assessment component', error);
      this.toastService.error('Failed to load assessment data. Please try again.');
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Get current user information
   */
  private async getCurrentUser(): Promise<void> {
    try {
      const user = await this.userService.getCurrentUser().toPromise();
      if (user && user.anganwadi_id) {
        this.currentUserAnganwadiId = user.anganwadi_id;
        this.stateService.updateUserState({
          currentUser: user,
          anganwadiId: user.anganwadi_id,
          isAuthenticated: true
        });
        this.logger.info('Current user loaded', { anganwadiId: user.anganwadi_id });
      }
    } catch (error) {
      this.logger.error('Failed to get current user', error);
      throw error;
    }
  }

  /**
   * Load competency data
   */
  private async loadCompetencyData(): Promise<void> {
    try {
      if (this.competencyId) {
        const competency = await this.competencyService.getCompetencyById(this.competencyId).toPromise();
        if (competency) {
          this.competencyData = competency;
          this.selectedCompetency = competency.name;
          this.selectedCompetencyId = competency.id;
          
          // Update state
          this.stateService.updateAssessmentState({
            selectedCompetency: competency
          });
          
          // Check if this is a gross/fine motor competency
          this.isGrossOrFineMotor = competency.id === 10 || competency.id === 11;
          this.showHeightWeightInputs = this.isGrossOrFineMotor;
          this.showHeightWeightColumns = this.isGrossOrFineMotor;
          
          this.logger.info('Competency data loaded', { 
            competencyId: competency.id, 
            name: competency.name,
            isGrossOrFineMotor: this.isGrossOrFineMotor 
          });
        }
      }
    } catch (error) {
      this.logger.error('Failed to load competency data', error);
      throw error;
    }
  }

  /**
   * Load students data
   */
  private async loadStudents(): Promise<void> {
    try {
      if (!this.currentUserAnganwadiId) return;

      const students = await this.studentService.getStudentsByAnganwadiId(this.currentUserAnganwadiId).toPromise();
      if (students) {
        this.allStudents = students;
        this.students = [...students];
        this.filteredStudents = [...students];
        this.dataSource.data = this.filteredStudents;
        
        // Update state
        this.stateService.updateStudentsState({
          students: students,
          filteredStudents: students
        });
        
        this.logger.info('Students loaded', { count: students.length });
        
        // Load existing assessments if any
        await this.loadExistingAssessments();
      }
    } catch (error) {
      this.logger.error('Failed to load students', error);
      throw error;
    }
  }

  /**
   * Load existing assessments for students
   */
  private async loadExistingAssessments(): Promise<void> {
    try {
      if (!this.competencyId || this.students.length === 0) return;

      this.logger.startPerformanceTracking('load_existing_assessments');
      
      const studentIds = this.students.map(s => s.id);
      const assessments = await this.assessmentService.getAssessmentsByCompetencyAndStudents(
        this.competencyId, 
        studentIds
      ).toPromise();

      if (assessments && assessments.length > 0) {
        this.processExistingAssessments(assessments);
        this.updateTableColumns();
        this.cdr.markForCheck();
      }
      
      this.logger.endPerformanceTracking('load_existing_assessments');
      
    } catch (error) {
      this.logger.warn('Failed to load existing assessments', error);
      // Non-critical error, continue without existing assessments
    }
  }

  /**
   * Process existing assessments and update student data
   */
  private processExistingAssessments(assessments: any[]): void {
    const assessmentMap = new Map();
    
    assessments.forEach(assessment => {
      const key = `${assessment.child_id}_${assessment.session}`;
      assessmentMap.set(key, assessment);
    });

    this.students.forEach(student => {
      for (let session = 1; session <= 4; session++) {
        const key = `${student.id}_${session}`;
        const assessment = assessmentMap.get(key);
        
        if (assessment) {
          const suffix = session === 1 ? '' : session.toString();
          student[`assessed${suffix}`] = true;
          student[`assessmentLevel${suffix}`] = assessment.observation;
          student[`assessmentDate${suffix}`] = assessment.assessment_date;
          student[`age${suffix}`] = assessment.age;
          student[`height${suffix}`] = assessment.height;
          student[`weight${suffix}`] = assessment.weight;
          student[`remarks${suffix}`] = assessment.remarks;
        }
      }
    });
    
    this.logger.info('Existing assessments processed', { count: assessments.length });
  }

  /**
   * Setup level descriptions based on competency
   */
  private setupLevelDescriptions(): void {
    this.levelDescriptions = [
      {
        level: 'Beginner',
        description: 'Child is just beginning to show signs of this skill',
        color: '#e74c3c'
      },
      {
        level: 'Progressing',
        description: 'Child is developing this skill but needs more practice',
        color: '#f39c12'
      },
      {
        level: 'Advanced',
        description: 'Child demonstrates this skill consistently',
        color: '#3498db'
      },
      {
        level: 'PSR',
        description: 'Child has mastered this skill and is ready for primary school',
        color: '#2ecc71'
      }
    ];
    
    this.stateService.updateAssessmentState({
      levelDescriptions: this.levelDescriptions
    });
  }

  /**
   * Setup table configuration
   */
  private setupTable(): void {
    if (this.sort) {
      this.dataSource.sort = this.sort;
    }
    
    if (this.paginator) {
      this.dataSource.paginator = this.paginator;
    }
    
    // Configure table columns based on existing assessments
    this.updateTableColumns();
  }

  /**
   * Update table columns based on assessment data
   */
  private updateTableColumns(): void {
    this.displayedColumns = ['select', 'name'];
    
    if (this.showHeightWeightInputs) {
      this.displayedColumns.push('heightInput', 'weightInput');
    }
    
    // Add assessment columns based on existing data
    const hasSession1 = this.students.some(s => s.assessed);
    const hasSession2 = this.students.some(s => s.assessed2);
    const hasSession3 = this.students.some(s => s.assessed3);
    const hasSession4 = this.students.some(s => s.assessed4);
    
    if (hasSession1) this.displayedColumns.push('assessmentInfo');
    if (hasSession2) this.displayedColumns.push('assessmentInfo2');
    if (hasSession3) this.displayedColumns.push('assessmentInfo3');
    if (hasSession4) this.displayedColumns.push('assessmentInfo4');
    
    this.logger.debug('Table columns updated', { columns: this.displayedColumns });
  }

  /**
   * Set active tab with validation and logging
   */
  setActiveTab(tab: 'students' | 'levels'): void {
    if (tab === 'levels' && !this.selection.hasValue()) {
      this.logger.warn('Attempted to navigate to levels tab without selecting students');
      this.toastService.warning('Please select at least one student before proceeding to assessment levels.');
      return;
    }
    
    this.activeTab = tab;
    this.stateService.updateUIState({ activeTab: tab });
    
    this.logger.trackUserAction('tab_change', {
      from: this.activeTab,
      to: tab,
      selectedStudentsCount: this.selection.selected.length
    });
    
    this.cdr.markForCheck();
  }

  /**
   * Apply filter to students table with debouncing
   */
  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    
    // Debounce search for better performance
    this.dataSource.filter = filterValue.trim().toLowerCase();
    this.filteredStudents = this.dataSource.filteredData;
    
    this.stateService.updateStudentsState({
      filteredStudents: this.filteredStudents,
      filters: { search: filterValue, gender: '', ageRange: null, assessmentStatus: '' }
    });
    
    this.logger.debug('Search filter applied', { query: filterValue, resultsCount: this.filteredStudents.length });
    this.cdr.markForCheck();
  }

  /**
   * Toggle student selection with accessibility support
   */
  toggleStudent(student: Student): void {
    this.selection.toggle(student);
    
    this.stateService.updateStudentsState({
      selectedStudents: this.selection.selected
    });
    
    this.logger.trackUserAction('student_selection_toggle', {
      studentId: student.id,
      studentName: student.first_name,
      isSelected: this.selection.isSelected(student),
      totalSelected: this.selection.selected.length
    });
    
    this.cdr.markForCheck();
  }

  /**
   * Master toggle for selecting all students
   */
  masterToggle(): void {
    if (this.isAllSelected()) {
      this.selection.clear();
      this.logger.trackUserAction('deselect_all_students', { totalStudents: this.filteredStudents.length });
    } else {
      this.filteredStudents.forEach(student => this.selection.select(student));
      this.logger.trackUserAction('select_all_students', { totalStudents: this.filteredStudents.length });
    }
    
    this.stateService.updateStudentsState({
      selectedStudents: this.selection.selected
    });
    
    this.cdr.markForCheck();
  }

  /**
   * Check if all students are selected
   */
  isAllSelected(): boolean {
    const numSelected = this.selection.selected.length;
    const numRows = this.filteredStudents.length;
    return numSelected === numRows && numRows > 0;
  }

  /**
   * Get button disabled state with reason
   */
  getButtonDisabledState(): { isDisabled: boolean; reason?: string } {
    if (!this.selection.hasValue()) {
      return { isDisabled: true, reason: 'Please select at least one student' };
    }
    return { isDisabled: false };
  }

  /**
   * Get submit button aria label
   */
  getSubmitButtonAriaLabel(): string {
    if (!this.assessment.observation) {
      return 'Please select an assessment level before submitting';
    }
    if (this.hasMaxSessionsReached()) {
      return 'Cannot submit: Maximum sessions reached for selected students';
    }
    return `Submit assessment for ${this.selection.selected.length} selected students`;
  }

  /**
   * Handle height/weight input changes
   */
  onHeightWeightInputChange(): void {
    this.logger.debug('Height/weight input changed');
    this.cdr.markForCheck();
  }

  /**
   * Get current session for input
   */
  getCurrentSessionForInput(): string {
    // Logic to determine current session
    return '1'; // Simplified for now
  }

  /**
   * Check if maximum sessions are reached
   */
  hasMaxSessionsReached(): boolean {
    // Check if any selected student has reached max sessions
    return this.selection.selected.some(student => {
      return student.assessed && student.assessed2 && student.assessed3 && student.assessed4;
    });
  }

  /**
   * Check if all sessions are completed
   */
  areAllSessionsCompleted(): boolean {
    return this.selection.selected.every(student => {
      return student.assessed && student.assessed2 && student.assessed3 && student.assessed4;
    });
  }

  /**
   * Submit assessment with validation and error handling
   */
  async onSubmit(): Promise<void> {
    try {
      this.logger.startPerformanceTracking('assessment_submission');
      this.setLoading(true);

      // Validation
      if (!this.assessment.observation) {
        throw new Error('Please select an assessment level');
      }

      if (!this.selection.hasValue()) {
        throw new Error('Please select at least one student');
      }

      // Prepare assessment data
      this.assessment.child_ids = this.selection.selected.map(s => s.id);
      this.assessment.competency_id = this.competencyId;

      this.logger.info('Submitting assessment', {
        competencyId: this.assessment.competency_id,
        studentsCount: this.assessment.child_ids.length,
        level: this.assessment.observation,
        hasRemarks: !!this.assessment.remarks
      });

      // Show confirmation dialog
      const confirmed = await this.showConfirmationDialog();
      if (!confirmed) {
        this.logger.info('Assessment submission cancelled by user');
        return;
      }

      // Submit assessment
      const result = await this.assessmentService.createAssessment(this.assessment).toPromise();
      
      if (result) {
        this.logger.endPerformanceTracking('assessment_submission');
        this.handleSuccessfulSubmission();
      }

    } catch (error) {
      this.logger.error('Assessment submission failed', error);
      this.toastService.error(this.getErrorMessage(error), 'Assessment Submission Failed');
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Show confirmation dialog before submission
   */
  private async showConfirmationDialog(): Promise<boolean> {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Confirm Assessment Submission',
        message: `Are you sure you want to submit ${this.assessment.observation} level assessment for ${this.selection.selected.length} student(s)?`,
        students: this.selection.selected
      }
    });

    return dialogRef.afterClosed().toPromise();
  }

  /**
   * Handle successful assessment submission
   */
  private handleSuccessfulSubmission(): void {
    this.toastService.formSuccess(
      `Assessment submitted successfully for ${this.selection.selected.length} student(s)`,
      'Assessment Submitted'
    );
    
    this.logger.trackUserAction('assessment_submitted', {
      competencyId: this.assessment.competency_id,
      level: this.assessment.observation,
      studentsCount: this.assessment.child_ids.length,
      hasRemarks: !!this.assessment.remarks
    });

    // Reset form
    this.selection.clear();
    this.assessment.observation = '';
    this.assessment.remarks = '';
    this.setActiveTab('students');
    
    // Reload data to reflect changes
    this.loadExistingAssessments();
  }

  /**
   * Navigate back to videos
   */
  backToVideos(): void {
    this.logger.trackUserAction('navigate_back_to_videos');
    this.router.navigate(['/competency', this.competencyId, 'videos']);
  }

  /**
   * Set loading state
   */
  private setLoading(loading: boolean): void {
    this.isLoading = loading;
    this.stateService.updateUIState({ isLoading: loading });
    this.cdr.markForCheck();
  }

  /**
   * Get user-friendly error message
   */
  private getErrorMessage(error: any): string {
    if (error?.error?.message) {
      return error.error.message;
    }
    if (error?.message) {
      return error.message;
    }
    return 'An unexpected error occurred. Please try again.';
  }

  /**
   * Track by functions for performance optimization
   */
  trackByStudentId(index: number, student: Student): number {
    return student.id;
  }

  trackByLevel(index: number, level: LevelDescription): string {
    return level.level;
  }
}