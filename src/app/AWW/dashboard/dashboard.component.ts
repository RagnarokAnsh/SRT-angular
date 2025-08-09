import { Component, OnInit, ChangeDetectorRef, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as echarts from 'echarts';
type EChartsOption = echarts.EChartsOption;
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// PrimeNG Imports
import { MultiSelectModule } from 'primeng/multiselect';
import { DropdownModule } from 'primeng/dropdown';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';

// Services
import { StudentService, Student } from '../student-management/student.service';
import { AssessmentService, AssessmentStudent } from '../assessments/assessment.service';
import { CompetencyService, AppDomain, AppCompetency } from '../../competency.service';
import { UserService } from '../../services/user.service';
import { SkeletonLoaderComponent } from '../../components/skeleton-loader';
import { LoggerService } from '../../core/logger.service';
import { CustomDropdownComponent, DropdownOption } from '../../components/custom-dropdown/custom-dropdown.component';

// Type aliases for better code readability
type SessionOption = DropdownOption & { code: string };
type DomainOption = DropdownOption & { code: string };
type CompetencyOption = DropdownOption & { code: string; domainId: number };

interface AssessmentLevel {
  label: string;
  value: string;
  color: string;
}

interface DashboardData {
  totalStudents: number;
  assessedStudents: number;
  totalPossibleAssessments: number;
  actualAssessmentsDone: number;
  genderDistribution: {
    boys: number;
    girls: number;
  };
  levelDistribution: {
    beginner: number;
    progressing: number;
    advanced: number;
    schoolReady: number;
  };
}

// VERSION 2 - Pending Assessment Interface
/*
interface PendingAssessment {
  studentId: number;
  studentName: string;
  studentGender: string;
  studentAge: number;
  pendingCompetencies: number;
  pendingSessions: number;
  competencyDetails: {
    competencyId: number;
    competencyName: string;
    missingSessions: number[];
  }[];
}
*/

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SkeletonLoaderComponent,
    CustomDropdownComponent,
    CardModule,
    ButtonModule,
    ProgressBarModule,
    TagModule,
    DividerModule,
    TooltipModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('chart', { static: false }) chart!: ElementRef;
  @ViewChild('sessionsDropdown', { static: false }) sessionsDropdown!: any;
  @ViewChild('domainDropdown', { static: false }) domainDropdown!: any;
  @ViewChild('competenciesDropdown', { static: false }) competenciesDropdown!: any;

  // Loading state
  loading = true;
  loadingAssessments = false;

  // Data
  students: Student[] = [];
  domains: AppDomain[] = [];
  
  // PRODUCTION APPROACH: Store ALL assessment data once
  allAssessmentData: AssessmentStudent[] = []; // Complete dataset
  assessmentData: AssessmentStudent[] = []; // Filtered data for current selections
  assessmentDataByCompetency: Map<number, AssessmentStudent[]> = new Map(); // Cached by competency
  
  // Pending assessments tracking - VERSION 2
  // pendingAssessments: PendingAssessment[] = [];
  // loadingPendingAssessments = false;
  
  currentUserAnganwadiId: number | null = null;
  
  // Cache management
  private dataLoaded = false;
  private lastDataLoadTime: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

  // ECharts instance
  chartInstance: echarts.ECharts | null = null;

  // Dropdown options
  sessionOptions: SessionOption[] = [
    { label: 'Session 1', value: 1, code: 'S1' },
    { label: 'Session 2', value: 2, code: 'S2' },
    { label: 'Session 3', value: 3, code: 'S3' },
    { label: 'Session 4', value: 4, code: 'S4' }
  ];

  domainOptions: DomainOption[] = [];
  competencyOptions: CompetencyOption[] = [];
  filteredCompetencyOptions: CompetencyOption[] = [];

  // Selected values - Single domain, multiple competencies
  selectedSessions: SessionOption[] = [];
  selectedDomain: DomainOption | null = null;
  selectedCompetencies: CompetencyOption[] = [];

  // Values for custom dropdowns - Initialize as empty to show placeholders
  selectedSessionValues: number[] = [];
  selectedDomainValue: number | null = null;
  selectedCompetencyValues: number[] = [];

  // Assessment levels with correct app colors
  assessmentLevels: AssessmentLevel[] = [
    { label: 'Beginner', value: 'Beginner', color: 'rgb(255, 197, 52)' },
    { label: 'Progressing', value: 'Progressing', color: 'rgb(251, 97, 47)' },
    { label: 'Advanced', value: 'Advanced', color: 'rgb(114, 190, 77)' },
    { label: 'School Ready', value: 'PSR', color: 'rgb(0, 171, 236)' }
  ];

  // Dashboard metrics
  dashboardData: DashboardData = {
    totalStudents: 0,
    assessedStudents: 0,
    totalPossibleAssessments: 0,
    actualAssessmentsDone: 0,
    genderDistribution: {
      boys: 0,
      girls: 0
    },
    levelDistribution: {
      beginner: 0,
      progressing: 0,
      advanced: 0,
      schoolReady: 0
    }
  };

  constructor(
    private studentService: StudentService,
    private assessmentService: AssessmentService,
    private competencyService: CompetencyService,
    private userService: UserService,
    private cdr: ChangeDetectorRef,
    private messageService: MessageService,
    private logger: LoggerService
  ) {}

  ngOnInit() {
    // Ensure dropdown values are explicitly empty to show placeholders
    this.selectedSessionValues = [];
    this.selectedDomainValue = null;
    this.selectedCompetencyValues = [];
    
    this.initializeDashboard(false); // Don't set defaults, show placeholders initially
    
    // Add keyboard shortcuts
    this.setupKeyboardShortcuts();
    
    // Initialize mobile orientation detection
    this.checkMobileOrientation();
    
    // Listen for orientation changes
    window.addEventListener('orientationchange', () => {
      setTimeout(() => this.checkMobileOrientation(), 100);
    });
    
    // Listen for window resize (for responsive design)
    window.addEventListener('resize', () => {
      this.checkMobileOrientation();
    });
  }

  ngAfterViewInit() {
    // Initialize chart immediately after view init if selections exist
    if (this.hasSelections) {
      this.initializeChart();
    }
    
    // Ensure chart is properly initialized after view is stable
    setTimeout(() => {
      this.ensureChartVisibility();
    }, 100);
    
    // Also try to initialize on any future changes when chart element becomes available
    setTimeout(() => {
      this.ensureChartVisibility();
    }, 500);
  }

  ngOnDestroy() {
    if (this.chartInstance) {
      this.chartInstance.dispose();
    }
  }

  private checkMobileOrientation(): void {
    const isMobile = window.innerWidth <= 768;
    const isPortrait = window.innerHeight > window.innerWidth;
    const wasMobilePortrait = this.isMobilePortrait;
    this.isMobilePortrait = isMobile && isPortrait;
    
    // If we switched from portrait to landscape and have selections, initialize chart
    if (wasMobilePortrait && !this.isMobilePortrait && this.hasSelections) {
      setTimeout(() => {
        this.initializeChart();
        this.ensureChartAndUpdate();
      }, 200); // Small delay to ensure DOM is updated
    }
    
    // Always ensure chart visibility after orientation change
    setTimeout(() => {
      this.ensureChartVisibility();
    }, 300);
    
    // Force change detection
    this.cdr.detectChanges();
  }

  private ensureChartVisibility(): void {
    // If chart should be visible but not initialized, initialize it
    if (!this.isMobilePortrait && this.hasSelections && !this.chartInstance && this.chart?.nativeElement) {
      setTimeout(() => {
        this.initializeChart();
        this.ensureChartAndUpdate();
      }, 100);
    }
    
    // If chart is initialized but should be resized, resize it
    if (this.chartInstance && this.chart?.nativeElement) {
      setTimeout(() => {
        this.chartInstance?.resize();
      }, 50);
    }
  }

  private initializeChart(): void {
    if (this.chart?.nativeElement) {
      try {
        // Dispose existing instance if it exists
        if (this.chartInstance) {
          this.chartInstance.dispose();
          this.chartInstance = null;
        }
        
        this.chartInstance = echarts.init(this.chart.nativeElement);
        
        // Resize chart on window resize
        window.addEventListener('resize', () => {
          if (this.chartInstance) {
            this.chartInstance.resize();
          }
        });
        
        // Don't update chart here - let the calling method handle it
      } catch (error) {
        this.logger.error('Error initializing ECharts:', error);
        this.chartInstance = null;
      }
    } else {
      // If chart element is not ready, don't warn - it might be hidden
      console.debug('Chart element not available for initialization');
    }
  }

  private async initializeDashboard(setDefaults: boolean = true): Promise<void> {
    this.loading = true;
    
    try {
      await this.getCurrentUserAnganwadiId();
      await Promise.all([
        this.loadStudents(),
        this.loadDomainsAndCompetencies()
      ]);
      
      // Load all assessment data immediately for overall progress calculation
      await this.loadAllAssessmentData();
      
      // Calculate overall assessment progress (independent of filters)
      this.calculateOverallAssessmentProgress();
      
      if (setDefaults) {
        this.setDefaultSelections();
      } else {
        // Ensure placeholders are shown by explicitly clearing values
        this.selectedSessionValues = [];
        this.selectedDomainValue = null;
        this.selectedCompetencyValues = [];
        this.filteredCompetencyOptions = [];
      }
      
      // Force change detection to ensure dropdowns update
      this.cdr.detectChanges();
    } catch (error) {
      this.logger.error('Error initializing dashboard:', error);
      this.showMessage('Failed to load dashboard data. Please try again later.', 'error');
    } finally {
      this.loading = false;
    }
  }

  private async getCurrentUserAnganwadiId(): Promise<void> {
    return new Promise((resolve, reject) => {
      const currentUser = this.userService.getCurrentUser();
      if (currentUser && this.userService.isAWW() && currentUser.anganwadi_id) {
        this.currentUserAnganwadiId = currentUser.anganwadi_id;
        resolve();
      } else {
        const error = 'Cannot load dashboard: AWW user missing anganwadi ID';
        this.logger.warn(error);
        reject(new Error(error));
      }
    });
  }

  private async loadStudents(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.studentService.getStudents(false).subscribe({
        next: (students) => {
          if (this.currentUserAnganwadiId) {
            this.students = (students || []).filter(
              s => s.anganwadiId === this.currentUserAnganwadiId
            );
          } else {
            this.students = [];
          }
          this.dashboardData.totalStudents = this.students.length;
          // Calculate gender distribution immediately when students are loaded
          this.calculateGenderDistribution();
          resolve();
        },
        error: (error) => {
          this.logger.error('Error loading students:', error);
          reject(error);
        }
      });
    });
  }

  // Separate method to calculate only gender distribution (independent of chart filters)
  private calculateGenderDistribution(): void {
    const genderDistribution = {
      boys: 0,
      girls: 0
    };

    // Calculate gender distribution
    this.students.forEach(student => {
      const gender = ((student as any).gender || '').toLowerCase();
      if (gender === 'boy' || gender === 'male') {
        genderDistribution.boys++;
      } else if (gender === 'girl' || gender === 'female') {
        genderDistribution.girls++;
      }
    });

    // Update only the gender distribution in dashboard data
    this.dashboardData.genderDistribution = genderDistribution;
  }

  // New method to calculate overall assessment progress (independent of filters)
  private calculateOverallAssessmentProgress(): void {
    if (!this.students.length || !this.competencyOptions.length) {
      this.dashboardData.totalPossibleAssessments = 0;
      this.dashboardData.actualAssessmentsDone = 0;
      return;
    }

    // Calculate total possible assessments: all students * all competencies * all sessions
    const totalStudents = this.students.length;
    const totalCompetencies = this.competencyOptions.length;
    const totalSessions = this.sessionOptions.length;
    
    this.dashboardData.totalPossibleAssessments = totalStudents * totalCompetencies * totalSessions;

    // Count actual assessments done from all assessment data
    let actualAssessmentsCount = 0;

    // Use allAssessmentData instead of filtered assessmentData
    this.allAssessmentData.forEach(student => {
      this.sessionOptions.forEach(session => {
        const sessionKey = `session_${session.value}` as keyof AssessmentStudent;
        const sessionData = student[sessionKey];

        if (sessionData && typeof sessionData === 'object' && 'observation' in sessionData) {
          const observation = String((sessionData as any).observation).toLowerCase();
          
          if (observation && observation.trim() !== '') {
            actualAssessmentsCount++;
          }
        }
      });
    });

    this.dashboardData.actualAssessmentsDone = actualAssessmentsCount;
  }

  // Method to trim long competency names for chart display
  private trimCompetencyName(name: string): string {
    const maxLength = 25; // Maximum characters for y-axis labels
    if (name.length <= maxLength) {
      return name;
    }
    
    // Try to find a good break point (space, hyphen, etc.)
    const breakPoints = [' - ', ' ', '-', '_'];
    let trimmedName = name;
    
    for (const breakPoint of breakPoints) {
      const index = name.lastIndexOf(breakPoint, maxLength);
      if (index > maxLength * 0.6) { // Only break if we can keep at least 60% of the name
        trimmedName = name.substring(0, index) + '...';
        break;
      }
    }
    
    // If no good break point found, just truncate
    if (trimmedName === name) {
      trimmedName = name.substring(0, maxLength - 3) + '...';
    }
    
    return trimmedName;
  }

  private async loadDomainsAndCompetencies(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.competencyService.getDomainsWithCompetencies().subscribe({
        next: (domains) => {
          this.domains = domains || [];
          this.setupDropdownOptions();
          resolve();
        },
        error: (error) => {
          this.logger.error('Error loading domains and competencies:', error);
          reject(error);
        }
      });
    });
  }

  private setupDropdownOptions(): void {
    this.domainOptions = this.domains.map(domain => ({
      label: domain.name,
      value: domain.id,
      code: `D${domain.id}`
    }));

    this.competencyOptions = [];
    this.domains.forEach(domain => {
      domain.competencies.forEach(competency => {
        this.competencyOptions.push({
          label: competency.name,
          value: competency.id,
          code: `C${competency.id}`,
          domainId: domain.id
        });
      });
    });

    this.filteredCompetencyOptions = [...this.competencyOptions];
  }

  private setDefaultSelections(): void {
    this.selectedSessions = [...this.sessionOptions];
    this.selectedSessionValues = this.sessionOptions.map(s => s.value);
    
    if (this.domainOptions.length > 0) {
      this.selectedDomain = this.domainOptions[0];
      this.selectedDomainValue = this.domainOptions[0].value;
      this.onDomainChange(this.domainOptions[0]);
    }
  }

  onDomainChange(domain?: DomainOption): void {
    if (domain) {
      this.selectedDomain = domain;
      this.selectedDomainValue = domain.value;
    }
    
    if (this.selectedDomain) {
      this.filteredCompetencyOptions = this.competencyOptions.filter(
        comp => comp.domainId === this.selectedDomain!.value
      );
      
      // Select first 4 competencies by default (max for chart readability)
      this.selectedCompetencies = this.filteredCompetencyOptions.slice(0, 4);
      this.selectedCompetencyValues = this.selectedCompetencies.map(c => c.value);
    } else {
      this.filteredCompetencyOptions = [];
      this.selectedCompetencies = [];
      this.selectedCompetencyValues = [];
    }
    
    // Trigger change detection
    this.cdr.detectChanges();
    
    // Update dashboard - load data if not cached, otherwise just filter
    if (this.hasValidSelections()) {
      if (this.dataLoaded) {
        // Data already loaded, just filter and update
        this.filterAssessmentData();
        this.calculateDashboardMetrics();
        this.cdr.detectChanges();
        setTimeout(() => this.ensureChartAndUpdate(), 100);
      } else {
        // Load data first time
        this.updateDashboard();
      }
    } else {
      this.resetDashboardData();
    }
  }

  onCompetencyChange(competencies?: CompetencyOption[]): void {
    if (competencies) {
      this.selectedCompetencies = Array.isArray(competencies) ? competencies : [competencies];
      this.selectedCompetencyValues = this.selectedCompetencies.map(c => c.value);
    }
    
    // Limit to 4 competencies for chart readability
    if (this.selectedCompetencies.length > 4) {
      this.selectedCompetencies = this.selectedCompetencies.slice(0, 4);
      this.selectedCompetencyValues = this.selectedCompetencies.map(c => c.value);
    }
    
    // Trigger change detection
    this.cdr.detectChanges();
    
    // Update dashboard - filter existing data since all competencies are loaded
    if (this.hasValidSelections()) {
      if (this.dataLoaded) {
        // Data already loaded, just filter and update
        this.filterAssessmentData();
        this.calculateDashboardMetrics();
        this.cdr.detectChanges();
        setTimeout(() => this.ensureChartAndUpdate(), 100);
      } else {
        // Load data first time
        this.updateDashboard();
      }
    } else {
      this.resetDashboardData();
    }
  }

  onSessionChange(sessions?: SessionOption[]): void {
    if (sessions) {
      this.selectedSessions = Array.isArray(sessions) ? sessions : [sessions];
      this.selectedSessionValues = this.selectedSessions.map(s => s.value);
    }
    
    // Sessions only require recalculating metrics, no data reloading needed
    if (this.hasValidSelections() && this.dataLoaded) {
      this.calculateDashboardMetrics();
      this.cdr.detectChanges();
      this.ensureChartAndUpdate();
    } else if (this.hasValidSelections()) {
      // Load data if not already loaded
      this.updateDashboard();
    } else {
      // Clear chart if no valid selections
      this.resetDashboardData();
    }
  }

  private async updateDashboard(): Promise<void> {
    if (!this.hasValidSelections()) {
      this.resetDashboardData();
      return;
    }

    this.loadingAssessments = true;
    
    try {
      this.logger.log('Starting dashboard update...');
      
      // Load ALL assessment data once (with caching)
      await this.loadAllAssessmentData();
      
      // Calculate metrics with the filtered data
      this.calculateDashboardMetrics();
      
      // Force change detection to ensure chart element is in DOM
      this.cdr.detectChanges();
      
      // Wait a bit for DOM to update, then update chart
      setTimeout(() => {
        if (this.assessmentData.length > 0 || this.hasValidSelections()) {
          this.logger.log('Data loaded, updating chart...');
          this.ensureChartAndUpdate();
        } else {
          this.logger.log('No data available, clearing chart...');
          this.clearChart();
        }
      }, 200);
      
    } catch (error) {
      this.logger.error('Error updating dashboard:', error);
      this.showMessage('Failed to update dashboard data.', 'error');
      // Clear chart on error
      this.clearChart();
    } finally {
      this.loadingAssessments = false;
      // Trigger another change detection after loading is complete
      this.cdr.detectChanges();
    }
  }

  private ensureChartAndUpdate(): void {
    // If no selections, don't try to update chart
    if (!this.hasSelections) {
      return;
    }

    // Ensure chart element is available
    if (!this.chart?.nativeElement) {
      this.logger.log('Chart element not available, retrying...');
      setTimeout(() => this.ensureChartAndUpdate(), 100);
      return;
    }

    // Initialize chart if not exists
    if (!this.chartInstance) {
      this.logger.log('Initializing chart...');
      this.initializeChart();
      
      // Wait for chart to be properly initialized
      setTimeout(() => {
        if (this.chartInstance) {
          this.logger.log('Chart initialized, updating...');
          this.updateChart();
        } else {
          this.logger.warn('Chart initialization failed, retrying...');
          setTimeout(() => this.ensureChartAndUpdate(), 200);
        }
      }, 100);
      return;
    }

    // Update chart immediately if instance exists
    if (this.chartInstance) {
      this.logger.log('Updating existing chart...');
      this.updateChart();
    }
  }

  private hasValidSelections(): boolean {
    return this.selectedSessions.length > 0 && 
           this.selectedCompetencies.length > 0 && 
           this.currentUserAnganwadiId !== null;
  }



  // Removed duplicate - now declared above with other data properties
  
  // Interactive legend state
  hiddenLevels: Set<string> = new Set();
  hoveredItem: { type: string; index: number } | null = null;

  // Mobile orientation detection
  isMobilePortrait = false;

  // PRODUCTION METHOD: Load ALL assessment data once
  private async loadAllAssessmentData(): Promise<void> {
    if (!this.currentUserAnganwadiId) {
      this.allAssessmentData = [];
      this.dataLoaded = false;
      return;
    }

    // Check if data is already loaded and still fresh
    const now = Date.now();
    if (this.dataLoaded && (now - this.lastDataLoadTime) < this.CACHE_DURATION) {
      this.logger.log('Using cached assessment data');
      this.filterAssessmentData();
      return;
    }

    try {
      // For now, use the existing API until bulk endpoint is available
      this.logger.log('Loading assessment data for anganwadi:', this.currentUserAnganwadiId);
      
      // Use the existing working API approach
      await this.loadAssessmentDataFallback();
      
    } catch (error) {
      this.logger.error('Error loading assessment data:', error);
      this.allAssessmentData = [];
      this.dataLoaded = false;
      this.filterAssessmentData();
    }
  }

  // Load assessment data using existing API - Load ALL competencies at once for better performance
  private async loadAssessmentDataFallback(): Promise<void> {
    if (!this.currentUserAnganwadiId) {
      this.allAssessmentData = [];
      this.dataLoaded = true;
      this.lastDataLoadTime = Date.now();
      this.filterAssessmentData();
      return;
    }

    try {
      // Load data for ALL competencies at once (better performance)
      const allCompetencyIds = this.competencyOptions.map(c => c.value);
      
      this.logger.log('Loading assessment data for ALL competencies:', allCompetencyIds);

      // Load data for all competencies in parallel
      const assessmentPromises = allCompetencyIds.map(async competencyId => {
        try {
          const data = await this.assessmentService.getAssessmentsByAnganwadiAndCompetency(
            this.currentUserAnganwadiId!,
            competencyId
          ).toPromise();
          this.logger.log(`Loaded ${(data || []).length} records for competency ${competencyId}`);
          return { competencyId, data: data || [] };
        } catch (error) {
          this.logger.error(`Error loading data for competency ${competencyId}:`, error);
          return { competencyId, data: [] };
        }
      });

      const results = await Promise.all(assessmentPromises);
      
      // Clear existing data
      this.assessmentDataByCompetency.clear();
      this.allAssessmentData = [];
      
      // Store data by competency and combine all data
      results.forEach(result => {
        this.assessmentDataByCompetency.set(result.competencyId, result.data);
        this.allAssessmentData.push(...result.data);
      });

      // Remove duplicate students from combined array
      const uniqueStudents = new Map<string, AssessmentStudent>();
      this.allAssessmentData.forEach(student => {
        const studentKey = `${student.name}_${student.child_id || 'unknown'}`;
        if (!uniqueStudents.has(studentKey)) {
          uniqueStudents.set(studentKey, student);
        }
      });
      this.allAssessmentData = Array.from(uniqueStudents.values());

      this.dataLoaded = true;
      this.lastDataLoadTime = Date.now();
      
      this.logger.log(`Loaded ${this.allAssessmentData.length} unique assessment records for all competencies`);
      
      // Now filter for selected competencies
      this.filterAssessmentData();
      
    } catch (error) {
      this.logger.error('Error loading assessment data:', error);
      this.allAssessmentData = [];
      this.assessmentData = [];
      this.assessmentDataByCompetency.clear();
      this.dataLoaded = false;
    }
  }

  // Filter the loaded data based on current selections
  private filterAssessmentData(): void {
    if (!this.hasValidSelections()) {
      this.assessmentData = [];
      return;
    }

    // Filter data for selected competencies from the complete dataset
    this.assessmentData = [];
    const selectedCompetencyIds = this.selectedCompetencies.map(c => c.value);
    
    // Get data for each selected competency
    selectedCompetencyIds.forEach(competencyId => {
      const competencyData = this.assessmentDataByCompetency.get(competencyId) || [];
      this.assessmentData.push(...competencyData);
    });

    // Remove duplicate students from combined array
    const uniqueStudents = new Map<string, AssessmentStudent>();
    this.assessmentData.forEach(student => {
      const studentKey = `${student.name}_${student.child_id || 'unknown'}`;
      if (!uniqueStudents.has(studentKey)) {
        uniqueStudents.set(studentKey, student);
      }
    });
    this.assessmentData = Array.from(uniqueStudents.values());
    
    this.logger.log(`Filtered to ${this.assessmentData.length} students for selected competencies`);
  }





  private calculateDashboardMetrics(): void {
    const metrics = {
      totalStudents: this.students.length,
      assessedStudents: 0,
      totalPossibleAssessments: this.dashboardData.totalPossibleAssessments, // Preserve overall progress
      actualAssessmentsDone: this.dashboardData.actualAssessmentsDone, // Preserve overall progress
      genderDistribution: this.dashboardData.genderDistribution, // Use existing gender data
      levelDistribution: {
        beginner: 0,
        progressing: 0,
        advanced: 0,
        schoolReady: 0
      }
    };

    const nameToId = new Map<string, number>();
    this.students.forEach(s => {
      const fullName = (s as any).name || (s.firstName + (s.lastName ? ' ' + s.lastName : ''));
      nameToId.set(fullName.trim(), s.id);
    });

    const levelStudentIds = {
      beginner: new Set<number>(),
      progressing: new Set<number>(),
      advanced: new Set<number>(),
      schoolReady: new Set<number>()
    };
    const assessedStudentIds = new Set<number>();

    // Note: We don't recalculate totalPossibleAssessments and actualAssessmentsDone here
    // as they are now calculated independently in calculateOverallAssessmentProgress()

    // Count level distribution for filtered data only (for chart display)
    this.assessmentData.forEach(student => {
      this.selectedSessions.forEach(session => {
        const sessionKey = `session_${session.value}` as keyof AssessmentStudent;
        const sessionData = student[sessionKey];

        if (sessionData && typeof sessionData === 'object' && 'observation' in sessionData) {
          const observation = String((sessionData as any).observation).toLowerCase();
          const name = (student as any).name;
          const id = nameToId.get(name?.trim());
          
          if (observation && id) {
            assessedStudentIds.add(id);

            const level = String(observation).toLowerCase();
            
            if (level.includes('beginner') || level.includes('beginning') || level === '1') {
              levelStudentIds.beginner.add(id);
            } else if (level.includes('progressing') || level === '2') {
              levelStudentIds.progressing.add(id);
            } else if (level.includes('advanced') || level.includes('advancing') || level === '3') {
              levelStudentIds.advanced.add(id);
            } else if (level.includes('psr') || level.includes('school ready') || level === '4') {
              levelStudentIds.schoolReady.add(id);
            } else {
              console.warn(`Unknown observation level: "${observation}" for student: ${name}`);
            }
          }
        }
      });
    });

    metrics.levelDistribution.beginner = levelStudentIds.beginner.size;
    metrics.levelDistribution.progressing = levelStudentIds.progressing.size;
    metrics.levelDistribution.advanced = levelStudentIds.advanced.size;
    metrics.levelDistribution.schoolReady = levelStudentIds.schoolReady.size;
    metrics.assessedStudents = assessedStudentIds.size; // Keep for backward compatibility
    
    this.dashboardData = metrics;
    
    // Calculate pending assessments - VERSION 2
    // this.calculatePendingAssessments();
  }

  // VERSION 2 - Pending Assessments Methods
  /*
  private calculatePendingAssessments(): void {
    if (!this.students.length || !this.competencyOptions.length) {
      // this.pendingAssessments = []; // VERSION 2
      return;
    }

    // this.pendingAssessments = []; // VERSION 2

    // For each student, check which competencies and sessions are missing
    this.students.forEach(student => {
      const fullName = `${student.firstName} ${student.lastName}`.trim();
      const studentAge = this.calculateAge(student.dateOfBirth);
      
      // const pendingAssessment: PendingAssessment = { // VERSION 2
      //   studentId: student.id,
      //   studentName: fullName,
      //   studentGender: (student as any).gender || 'Not specified',
      //   studentAge: studentAge,
      //   pendingCompetencies: 0,
      //   pendingSessions: 0,
      //   competencyDetails: []
      // };

      // Check each competency
      this.competencyOptions.forEach(competency => {
        const competencyAssessments = this.assessmentDataByCompetency.get(competency.value) || [];
        const studentAssessment = competencyAssessments.find(assessment => 
          assessment.name === fullName
        );

        const missingSessions: number[] = [];
        
        // Check each session (1-4)
        for (let session = 1; session <= 4; session++) {
          const sessionKey = `session_${session}` as keyof AssessmentStudent;
          const sessionData = studentAssessment?.[sessionKey];
          
          // Session is missing if:
          // 1. No assessment data for this student-competency combination, OR
          // 2. Session data exists but has no observation
          if (!studentAssessment || 
              !sessionData || 
              typeof sessionData === 'string' || 
              !(sessionData && typeof sessionData === 'object' && 'observation' in sessionData) ||
              !sessionData.observation) {
            missingSessions.push(session);
          }
        }

        if (missingSessions.length > 0) {
          // pendingAssessment.competencyDetails.push({ // VERSION 2
          //   competencyId: competency.value,
          //   competencyName: competency.label,
          //   missingSessions: missingSessions
          // });
          // pendingAssessment.pendingCompetencies++; // VERSION 2
          // pendingAssessment.pendingSessions += missingSessions.length; // VERSION 2
        }
      });

      // Only add students who have pending assessments
      // if (pendingAssessment.pendingCompetencies > 0) { // VERSION 2
      //   this.pendingAssessments.push(pendingAssessment); // VERSION 2
      // }
    });

    // Sort by number of pending competencies (highest first)
    // this.pendingAssessments.sort((a, b) => b.pendingCompetencies - a.pendingCompetencies); // VERSION 2
  }

  private calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    let age = today.getFullYear() - dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - dateOfBirth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
      age--;
    }
    
    return age;
  }

  getTotalPendingCompetencies(): number {
    // return this.pendingAssessments.reduce((total, student) => total + student.pendingCompetencies, 0); // VERSION 2
    return 0; // VERSION 2
  }

  getTotalPendingSessions(): number {
    // return this.pendingAssessments.reduce((total, student) => total + student.pendingSessions, 0); // VERSION 2
    return 0; // VERSION 2
  }

  viewAllPendingAssessments(event: Event): void {
    event.preventDefault();
    this.showMessage(`Showing all ${0} children with pending assessments`, 'info'); // VERSION 2
  }
  */

  private updateChart(): void {
    if (!this.chartInstance) {
      this.logger.warn('Chart instance not available yet, retrying...');
      // Retry after a short delay
      setTimeout(() => {
        if (this.chartInstance) {
          this.updateChart();
        } else {
          // If still not available, try to initialize
          this.initializeChart();
          setTimeout(() => {
            if (this.chartInstance) {
              this.updateChart();
            }
          }, 100);
        }
      }, 100);
      return;
    }

    // If we don't have valid selections or data, show empty chart
    if (!this.hasValidSelections() || this.assessmentData.length === 0) {
      try {
        this.chartInstance.setOption({
          xAxis: { 
            type: 'value',
            name: 'Number of Students',
            nameLocation: 'middle',
            nameGap: 50
          },
          yAxis: {
            type: 'category',
            data: this.hasValidSelections() ? this.selectedSessions.map(s => s.label) : []
          },
          series: [],
          legend: {
            show: false
          }
        }, true);
      } catch (error) {
        console.warn('Error setting empty chart:', error);
      }
      return;
    }

    // Build chart data with competencies on Y-axis and horizontal bars per session
    const competencyNames = this.selectedCompetencies.map(c => this.trimCompetencyName(c.label));
    
    // Create series for each session and level combination
    const series: any[] = [];
    
    // For each session, create series for each level
    this.selectedSessions.forEach((session, sessionIndex) => {
      // Skip hidden sessions (if we implement session hiding)
      // if (this.hiddenSessions.has(session.value)) {
      //   return;
      // }

      this.assessmentLevels.forEach((level, levelIndex) => {
        // Skip hidden levels
        if (this.hiddenLevels.has(level.value)) {
          return;
        }

        const seriesData: number[] = [];
        
        // For each competency, count students at this level for this session
        this.selectedCompetencies.forEach(competency => {
          let count = 0;
          
          // Get assessment data for this specific competency
          const competencyAssessments = this.assessmentDataByCompetency.get(competency.value) || [];
          
          competencyAssessments.forEach(student => {
            const sessionKey = `session_${session.value}` as keyof AssessmentStudent;
            const sessionData = student[sessionKey];
            
            if (sessionData && typeof sessionData === 'object' && 'observation' in sessionData) {
              const observation = String((sessionData as any).observation).toLowerCase();
              const levelMatches = 
                (level.value === 'Beginner' && (observation.includes('beginner') || observation.includes('beginning') || observation === '1')) ||
                (level.value === 'Progressing' && (observation.includes('progressing') || observation === '2')) ||
                (level.value === 'Advanced' && (observation.includes('advanced') || observation.includes('advancing') || observation === '3')) ||
                (level.value === 'PSR' && (observation.includes('psr') || observation.includes('school ready') || observation === '4'));
              
              if (levelMatches) {
                count++;
              }
            }
          });
          
          seriesData.push(count);
        });
        
        // Create series name to group bars by session
        const stackName = `session_${sessionIndex}`;
        
        // Use the standard level color
        const levelColor = this.assessmentLevels[levelIndex].color;
        const isHovered = this.hoveredItem && 
          this.hoveredItem.type === 'level' && this.hoveredItem.index === levelIndex;
        
        series.push({
          name: `${session.label} - ${level.label}`,
          type: 'bar',
          stack: stackName,
          emphasis: {
            focus: 'series',
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(0, 0, 0, 0.3)',
              shadowOffsetX: 2,
              shadowOffsetY: 2
            }
          },
          data: seriesData,
          itemStyle: {
            color: levelColor,
            opacity: isHovered ? 1 : 0.85,
            borderRadius: [0, 4, 4, 0]
          },
          animation: true,
          animationDuration: 300,
          animationEasing: 'cubicOut'
        });
      });
    });

    const option: EChartsOption = {
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        borderColor: 'rgba(0, 0, 0, 0.1)',
        borderWidth: 1,
        borderRadius: 8,
        textStyle: {
          color: '#374151',
          fontSize: 12
        },
        padding: [12, 16],
        extraCssText: 'box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);',
        formatter: (params: any) => {
          const sessionName = params.seriesName.split(' - ')[0];
          const levelName = params.seriesName.split(' - ')[1];
          const fullCompetencyName = this.selectedCompetencies[params.dataIndex]?.label || competencyNames[params.dataIndex];
          const studentCount = params.value;
          
          return `
            <div style="font-weight: 600; margin-bottom: 8px; color: #1f2937; font-size: 14px;">
              ${fullCompetencyName}
            </div>
            <div style="margin-bottom: 6px; color: #6b7280; font-size: 12px;">
              <strong>${sessionName}</strong>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="display: inline-block; width: 12px; height: 12px; background-color: ${params.color}; border-radius: 2px;"></span>
              <span style="color: #6b7280; font-size: 12px;">${levelName}:</span>
              <strong style="color: #1f2937; font-size: 13px;">${studentCount} student${studentCount !== 1 ? 's' : ''}</strong>
            </div>
          `;
        }
      },
      legend: {
        show: false
      },
      grid: {
        left: '2%', // Increased left margin for longer competency names
        right: '4%',
        bottom: '5%',
        top: '0%',
        containLabel: true
      },
      xAxis: {
        type: 'value',
        name: 'Number of Students',
        nameLocation: 'middle',
        nameGap: 50,
        nameTextStyle: {
          color: '#6b7280',
          fontSize: 12,
          fontWeight: 500
        },
        axisLabel: {
          color: '#6b7280',
          fontSize: 11
        },
        axisLine: {
          lineStyle: {
            color: '#e5e7eb'
          }
        },
        splitLine: {
          lineStyle: {
            color: '#f3f4f6',
            type: 'dashed'
          }
        }
      },
      yAxis: {
        type: 'category',
        data: competencyNames,
        axisLabel: {
          interval: 0,
          fontSize: 11,
          color: '#000',
          fontWeight: 500,
          width: 120,
          overflow: 'truncate'
        },
        axisLine: {
          lineStyle: {
            color: '#e5e7eb'
          }
        },
        axisTick: {
          show: false
        }
      },
      series
    };

    try {
      this.chartInstance.setOption(option, true);
      // Force chart to resize to ensure proper rendering
      setTimeout(() => {
        if (this.chartInstance) {
          this.chartInstance.resize();
        }
      }, 50);

    } catch (error) {
      this.logger.error('Error setting chart option:', error);
      
      // Try to recreate the chart instance
      try {
        if (this.chartInstance) {
          this.chartInstance.dispose();
        }
        this.chartInstance = null;
        this.initializeChart();
        if (this.chartInstance) {
          (this.chartInstance as echarts.ECharts).setOption(option, true);
        }
      } catch (recreateError) {
        this.logger.error('Failed to recreate chart:', recreateError);
      }
    }
  }

  private resetDashboardData(): void {
    this.dashboardData = {
      totalStudents: this.students.length,
      assessedStudents: 0,
      totalPossibleAssessments: this.dashboardData.totalPossibleAssessments, // Preserve overall progress
      actualAssessmentsDone: this.dashboardData.actualAssessmentsDone, // Preserve overall progress
      genderDistribution: this.dashboardData.genderDistribution, // Preserve gender data
      levelDistribution: {
        beginner: 0,
        progressing: 0,
        advanced: 0,
        schoolReady: 0
      }
    };
    
    this.clearChart();
  }

  private clearChart(): void {
    // Clear chart data but don't dispose instance
    if (this.chartInstance) {
      try {
        this.chartInstance.setOption({
          xAxis: { 
            type: 'value',
            name: 'Number of Students',
            nameLocation: 'middle',
            nameGap: 50
          },
          yAxis: {
            type: 'category',
            data: [] 
          },
          series: []
        }, true);
      } catch (error) {
        console.warn('⚠️ Error clearing chart data:', error);
      }
    }
  }

  getAssessmentProgress(): number {
    if (this.dashboardData.totalPossibleAssessments === 0) return 0;
    return Math.round((this.dashboardData.actualAssessmentsDone / this.dashboardData.totalPossibleAssessments) * 100);
  }

  private showMessage(message: string, severity: 'success' | 'error' | 'info' | 'warn' = 'info'): void {
    this.messageService.add({
      severity,
      summary: severity === 'error' ? 'Error' : 'Info',
      detail: message,
      life: 5000
    });
  }

  get hasSelections(): boolean {
    return this.selectedSessions.length > 0 && this.selectedCompetencies.length > 0;
  }

  get selectionSummary(): string {
    const sessions = this.selectedSessions.length;
    const competencies = this.selectedCompetencies.length;
    return `${sessions} session${sessions !== 1 ? 's' : ''}, ${competencies} competenc${competencies !== 1 ? 'ies' : 'y'}`;
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // Removed getCompetencyColor method - no longer needed with horizontal bars

  exportChartData(): void {
    try {
      // Create a new workbook
      const workbook = XLSX.utils.book_new();
      
      // 1. Summary Sheet
      const summaryData = [
        ['Assessment Dashboard Export'],
        ['Generated:', new Date().toLocaleString()],
        [''],
        ['Filter Summary:'],
        ['Selected Domain:', this.selectedDomain?.label || 'None'],
        ['Selected Sessions:', this.selectedSessions.map(s => s.label).join(', ')],
        ['Selected Competencies:', this.selectedCompetencies.map(c => c.label).join(', ')],
        [''],
        ['Dashboard Metrics:'],
        ['Total Students:', this.dashboardData.totalStudents],
        ['Boys:', this.dashboardData.genderDistribution.boys],
        ['Girls:', this.dashboardData.genderDistribution.girls],
        [''],
        ['Assessment Level Distribution:'],
        ['Beginner:', this.dashboardData.levelDistribution.beginner],
        ['Progressing:', this.dashboardData.levelDistribution.progressing],
        ['Advanced:', this.dashboardData.levelDistribution.advanced],
        ['School Ready:', this.dashboardData.levelDistribution.schoolReady]
      ];
      
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
      
      // 2. Students Data Sheet
      if (this.students.length > 0) {
        const studentsData = this.students.map(student => ({
          'Student ID': student.id,
          'Student Name': student.firstName + ' ' + (student.lastName || ''),
          'Date of Birth': student.dateOfBirth,
          'Gender': (student as any).gender || 'Not specified',
          'Height (cm)': (student as any).heightCm || '',
          'Weight (kg)': (student as any).weightKg || '',
          'Language': (student as any).language || '',
          'Anganwadi ID': student.anganwadiId,
          'Anganwadi Name': (student as any).anganwadi?.name || ''
        }));
        
        const studentsSheet = XLSX.utils.json_to_sheet(studentsData);
        XLSX.utils.book_append_sheet(workbook, studentsSheet, 'Students');
      }
      
      // 3. Assessment Data Sheet
      if (this.assessmentData.length > 0) {
        const assessmentExportData = this.assessmentData.map(assessment => {
          const baseData: any = {
            'Student Name': assessment.name,
            'Competency': this.getCompetencyName(assessment)
          };
          
          // Add session data
          for (let i = 1; i <= 4; i++) {
            const sessionKey = `session_${i}` as keyof typeof assessment;
            const sessionData = assessment[sessionKey];
            if (sessionData && typeof sessionData === 'object' && 'observation' in sessionData) {
              baseData[`Session ${i} Level`] = (sessionData as any).observation;
              baseData[`Session ${i} Date`] = (sessionData as any).assessed_at || '';
            } else {
              baseData[`Session ${i} Level`] = 'Not Assessed';
              baseData[`Session ${i} Date`] = '';
            }
          }
          
          return baseData;
        });
        
        const assessmentSheet = XLSX.utils.json_to_sheet(assessmentExportData);
        XLSX.utils.book_append_sheet(workbook, assessmentSheet, 'Assessment Data');
      }
      
      // 4. Chart Data Sheet (Session-wise breakdown)
      if (this.hasSelections) {
        const chartData: any[] = [];
        
        // Headers
        const headers = ['Session', 'Competency', 'Beginner', 'Progressing', 'Advanced', 'School Ready', 'Total'];
        chartData.push(headers);
        
        // Data rows
        this.selectedSessions.forEach(session => {
          this.selectedCompetencies.forEach(competency => {
            const competencyAssessments = this.assessmentDataByCompetency.get(competency.value) || [];
            const levelCounts = { beginner: 0, progressing: 0, advanced: 0, schoolReady: 0 };
            
            competencyAssessments.forEach(student => {
              const sessionKey = `session_${session.value}` as keyof typeof student;
              const sessionData = student[sessionKey];
              
              if (sessionData && typeof sessionData === 'object' && 'observation' in sessionData) {
                const observation = String((sessionData as any).observation).toLowerCase();
                if (observation.includes('beginner') || observation.includes('beginning') || observation === '1') levelCounts.beginner++;
                else if (observation.includes('progressing') || observation === '2') levelCounts.progressing++;
                else if (observation.includes('advanced') || observation.includes('advancing') || observation === '3') levelCounts.advanced++;
                else if (observation.includes('psr') || observation.includes('school ready') || observation === '4') levelCounts.schoolReady++;
              }
            });
            
            const total = levelCounts.beginner + levelCounts.progressing + levelCounts.advanced + levelCounts.schoolReady;
            
            chartData.push([
              session.label,
              competency.label,
              levelCounts.beginner,
              levelCounts.progressing,
              levelCounts.advanced,
              levelCounts.schoolReady,
              total
            ]);
          });
        });
        
        const chartSheet = XLSX.utils.aoa_to_sheet(chartData);
        XLSX.utils.book_append_sheet(workbook, chartSheet, 'Chart Data');
      }
      
      // Generate Excel file and download
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      const fileName = `Assessment-Dashboard-${new Date().toISOString().split('T')[0]}.xlsx`;
      saveAs(blob, fileName);
      
      this.showMessage('Excel file exported successfully!', 'success');
      
    } catch (error) {
      console.error('Error exporting Excel file:', error);
      this.showMessage('Error exporting data. Please try again.', 'error');
    }
  }

  private getCompetencyName(assessment: any): string {
    // Try to find competency name from the assessment data structure
    // This might need adjustment based on your actual assessment data structure
    const competency = this.selectedCompetencies.find(c => {
      // Add logic to match competency based on assessment data
      return true; // Placeholder - adjust based on your data structure
    });
    return competency?.label || 'Unknown Competency';
  }

  async refreshData(): Promise<void> {
    try {
      // Only refresh assessment data and chart, not the entire dashboard
      if (this.hasValidSelections()) {
        this.loadingAssessments = true;
        
        // Invalidate cache to force fresh data load
        this.invalidateDataCache();
        
        // Clear existing chart instance to force recreation
        if (this.chartInstance) {
          this.chartInstance.dispose();
          this.chartInstance = null;
        }
        
        await this.loadAllAssessmentData();
        this.calculateDashboardMetrics();
        
        // Force change detection to ensure chart element is in DOM
        this.cdr.detectChanges();
        
        // Wait for DOM update and ensure chart is properly initialized
        setTimeout(() => {
          this.ensureChartAndUpdate();
        }, 200);
        
        this.showMessage('Chart data refreshed successfully!', 'success');

      } else {
        this.showMessage('Please select filters before refreshing.', 'info');
      }
    } catch (error) {
      this.logger.error('❌ Error refreshing chart data:', error);
      this.showMessage('Failed to refresh chart data. Please try again.', 'error');
    } finally {
      this.loadingAssessments = false;
    }
  }

  async refreshFullDashboard(): Promise<void> {
    try {
      // Store current selections before refresh
      const currentSessions = [...this.selectedSessions];
      const currentDomain = this.selectedDomain;
      const currentCompetencies = [...this.selectedCompetencies];
      
      // Clear any existing chart state and cache
      this.resetDashboardData();
      this.invalidateDataCache();
      
      // Force reload of all data without setting defaults
      await this.initializeDashboard(false);
      
      // Recalculate gender distribution and overall progress after loading students
      this.calculateGenderDistribution();
      this.calculateOverallAssessmentProgress();
      
      // Restore the previous selections instead of using defaults
      if (currentSessions.length > 0) {
        this.selectedSessions = currentSessions;
        this.selectedSessionValues = currentSessions.map(s => s.value);
      }
      if (currentDomain) {
        this.selectedDomain = currentDomain;
        this.selectedDomainValue = currentDomain.value;
        this.onDomainChange(currentDomain);
        // Restore specific competencies if they were selected
        if (currentCompetencies.length > 0) {
          this.selectedCompetencies = currentCompetencies.filter(comp => 
            this.filteredCompetencyOptions.some(option => option.value === comp.value)
          );
          this.selectedCompetencyValues = this.selectedCompetencies.map(c => c.value);
        }
      }
      
      // Load assessment data with current selections if available
      if (this.hasValidSelections()) {
        await this.loadAllAssessmentData();
        this.calculateDashboardMetrics();
        
        // Ensure chart is updated
        this.cdr.detectChanges();
        setTimeout(() => {
          this.ensureChartAndUpdate();
        }, 100);
      }
      
      this.showMessage('Dashboard refreshed successfully!', 'success');
      
    } catch (error) {
      this.logger.error('❌ Error refreshing dashboard:', error);
      this.showMessage('Failed to refresh dashboard data. Please try again.', 'error');
    }
  }

  toggleFullscreen(): void {
    const chartElement = this.chart?.nativeElement;
    if (chartElement) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        chartElement.requestFullscreen().catch(() => {
          this.showMessage('Fullscreen not supported', 'warn');
        });
      }
    }
  }



  // Force refresh assessment data cache
  private invalidateDataCache(): void {
    this.dataLoaded = false;
    this.lastDataLoadTime = 0;
    this.allAssessmentData = [];
    this.assessmentData = [];
    this.assessmentDataByCompetency.clear();
    // Note: We don't reset totalPossibleAssessments and actualAssessmentsDone here
    // as they are calculated independently and should persist across cache invalidation
  }

  resetFilters(): void {
    // Reset hidden states
    this.hiddenLevels.clear();
    
    // Clear all selections to show placeholders
    this.selectedSessions = [];
    this.selectedDomain = null;
    this.selectedCompetencies = [];
    this.filteredCompetencyOptions = [];
    
    // Clear dropdown values and explicitly set to empty arrays/null
    this.selectedSessionValues = [];
    this.selectedDomainValue = null;
    this.selectedCompetencyValues = [];
    
    // Clear chart and dashboard data
    this.resetDashboardData();
    
    // Dispose chart instance to clear visualization
    if (this.chartInstance) {
      this.chartInstance.dispose();
      this.chartInstance = null;
    }
    
    // Force change detection to update UI and ensure dropdowns show placeholders
    this.cdr.detectChanges();
    
    // Force update dropdown components
    setTimeout(() => {
      if (this.sessionsDropdown) {
        this.sessionsDropdown.forceReset();
      }
      if (this.domainDropdown) {
        this.domainDropdown.forceReset();
      }
      if (this.competenciesDropdown) {
        this.competenciesDropdown.forceReset();
      }
      this.cdr.detectChanges();
    }, 0);
    
    setTimeout(() => {
      this.cdr.detectChanges();
    }, 100);
    
    this.showMessage('All filters cleared successfully!', 'info');
  }

  onLegendClick(type: string, value: number | string): void {
    if (type === 'level') {
      const levelValue = value as string;
      if (this.hiddenLevels.has(levelValue)) {
        this.hiddenLevels.delete(levelValue);
      } else {
        this.hiddenLevels.add(levelValue);
      }
      
      // Update chart with hidden series
      this.updateChart();
      this.showMessage(`Level ${this.hiddenLevels.has(value as string) ? 'hidden' : 'shown'}`, 'info');
    }
  }

  onLegendHover(type: string, index: number, isEntering: boolean): void {
    if (isEntering) {
      this.hoveredItem = { type, index };
      this.highlightChartSeries(type, index, true);
    } else {
      this.hoveredItem = null;
      this.highlightChartSeries(type, index, false);
    }
  }

  private highlightChartSeries(type: string, index: number, highlight: boolean): void {
    if (!this.chartInstance) return;

    try {
      if (type === 'level') {
        // Highlight all series for this level (this level across all sessions)
        const levelSeriesNames = this.selectedSessions.map(session => 
          `${session.label} - ${this.assessmentLevels[index].label}`
        );
        
        this.chartInstance.dispatchAction({
          type: highlight ? 'highlight' : 'downplay',
          seriesName: levelSeriesNames
        });
      }
    } catch (error) {
      console.warn('Error highlighting chart series:', error);
    }
  }

  onRefreshClick(event: MouseEvent): void {
    if (event.ctrlKey || event.metaKey) {
      // Ctrl+Click or Cmd+Click for full dashboard refresh
      this.refreshFullDashboard();
    } else {
      // Regular click for chart data refresh only
      this.refreshData();
    }
  }

  private setupKeyboardShortcuts(): void {
    document.addEventListener('keydown', (event: KeyboardEvent) => {
      // F5 or Ctrl+R for chart refresh
      if (event.key === 'F5' || (event.ctrlKey && event.key === 'r')) {
        event.preventDefault();
        this.refreshData();
      }
      // Ctrl+Shift+R for full dashboard refresh
      // if (event.ctrlKey && event.shiftKey && event.key === 'R') {
      //   event.preventDefault();
      //   this.refreshFullDashboard();
      // }
    });
  }

  // Debug method - you can call this from browser console
  debugChartState(): void {
    // Debug method - removed console logs
  }
}