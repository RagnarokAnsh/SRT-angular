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
  }

  ngAfterViewInit() {
    // Initialize chart immediately after view init if selections exist
    if (this.hasSelections) {
      this.initializeChart();
    }
    
    // Ensure chart is properly initialized after view is stable
    setTimeout(() => {
      if (!this.chartInstance && this.chart?.nativeElement && this.hasSelections) {
        this.initializeChart();
      }
    }, 100);
    
    // Also try to initialize on any future changes when chart element becomes available
    setTimeout(() => {
      if (!this.chartInstance && this.hasSelections) {
        this.initializeChart();
      }
    }, 500);
  }

  ngOnDestroy() {
    if (this.chartInstance) {
      this.chartInstance.dispose();
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
  
  // Competency patterns for better differentiation
  private competencyPatterns = [
    { color: '#3b82f6', pattern: 'solid', name: 'Pattern A' },
    { color: '#10b981', pattern: 'diagonal', name: 'Pattern B' },
    { color: '#f59e0b', pattern: 'dots', name: 'Pattern C' },
    { color: '#ef4444', pattern: 'vertical', name: 'Pattern D' },
    { color: '#8b5cf6', pattern: 'horizontal', name: 'Pattern E' },
    { color: '#06b6d4', pattern: 'grid', name: 'Pattern F' },
    { color: '#84cc16', pattern: 'cross', name: 'Pattern G' },
    { color: '#f97316', pattern: 'zigzag', name: 'Pattern H' }
  ];

  // Interactive legend state
  hiddenCompetencies: Set<number> = new Set();
  hiddenLevels: Set<string> = new Set();
  hoveredItem: { type: string; index: number } | null = null;

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
    metrics.assessedStudents = assessedStudentIds.size;
    

    
    this.dashboardData = metrics;
  }

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
            type: 'category',
            data: this.hasValidSelections() ? this.selectedSessions.map(s => s.label) : []
          },
          yAxis: {
            type: 'value',
            name: 'Number of Students',
            nameLocation: 'middle',
            nameGap: 50
          },
          series: [],
          legend: {
            data: this.assessmentLevels.map(level => level.label),
            top: 10,
            itemGap: 20,
            type: 'scroll',
            textStyle: {
              fontSize: 12
            }
          }
        }, true);
      } catch (error) {
        console.warn('Error setting empty chart:', error);
      }
      return;
    }

    // Build chart data with sessions on X-axis and grouped bars per competency
    const sessionNames = this.selectedSessions.map(s => s.label);
    
    // Create series for each competency and level combination
    const series: any[] = [];
    
    // For each competency, create series for each level
    this.selectedCompetencies.forEach((competency, competencyIndex) => {
      // Skip hidden competencies
      if (this.hiddenCompetencies.has(competency.value)) {
        return;
      }

      this.assessmentLevels.forEach((level, levelIndex) => {
        // Skip hidden levels
        if (this.hiddenLevels.has(level.value)) {
          return;
        }

        const seriesData: number[] = [];
        
                 // For each session, count students at this level for this competency
         this.selectedSessions.forEach(session => {
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
        
        // Create series name to group bars by competency
        const stackName = `competency_${competencyIndex}`;
        
        // Use the standard level color with hover effects
        const levelColor = this.assessmentLevels[levelIndex].color;
        const isHovered = this.hoveredItem && 
          ((this.hoveredItem.type === 'competency' && this.hoveredItem.index === competencyIndex) ||
           (this.hoveredItem.type === 'level' && this.hoveredItem.index === levelIndex));
        
        series.push({
          name: `${competency.label} - ${level.label}`,
          type: 'bar',
          stack: stackName,
          emphasis: {
            focus: 'series'
          },
          data: seriesData,
          itemStyle: {
            color: levelColor,
            // Add border to differentiate competencies
            borderColor: this.competencyPatterns[competencyIndex % this.competencyPatterns.length].color,
            borderWidth: 2,
            opacity: isHovered ? 1 : 0.85
          }
        });
      });
    });

    const option: EChartsOption = {
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: 'rgba(0, 0, 0, 0.1)',
        borderWidth: 1,
        textStyle: {
          color: '#374151'
        },
        formatter: (params: any) => {
          const competencyName = params.seriesName.split(' - ')[0];
          const levelName = params.seriesName.split(' - ')[1];
          const sessionName = params.name;
          const studentCount = params.value;
          
          return `
            <div style="font-weight: 600; margin-bottom: 8px; color: #1f2937;">
              ${sessionName}
            </div>
            <div style="margin-bottom: 4px;">
              <strong>${competencyName}</strong>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              ${params.marker} 
              <span style="color: #6b7280;">${levelName}:</span>
              <strong style="color: #1f2937;">${studentCount} student${studentCount !== 1 ? 's' : ''}</strong>
            </div>
          `;
        }
      },
      legend: {
        data: this.assessmentLevels.map(level => level.label),
        top: 10,
        itemGap: 20,
        type: 'scroll',
        textStyle: {
          fontSize: 12
        }
      },
      grid: {
        left: '5%',
        right: '4%',
        bottom: '12%',
        top: '18%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: sessionNames,
        axisLabel: {
          interval: 0,
          fontSize: 12
        }
      },
      yAxis: {
        type: 'value',
        name: 'Number of Students',
        nameLocation: 'middle',
        nameGap: 50
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
            type: 'category',
            data: [] 
          },
          yAxis: {
            type: 'value',
            name: 'Number of Students',
            nameLocation: 'middle',
            nameGap: 50
          },
          series: []
        }, true);
      } catch (error) {
        console.warn('⚠️ Error clearing chart data:', error);
      }
    }
  }

  getAssessmentProgress(): number {
    if (this.dashboardData.totalStudents === 0) return 0;
    return Math.round((this.dashboardData.assessedStudents / this.dashboardData.totalStudents) * 100);
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

  getCompetencyColor(index: number): string {
    return this.competencyPatterns[index % this.competencyPatterns.length].color;
  }

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
      
      // Recalculate gender distribution after loading students
      this.calculateGenderDistribution();
      
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
  }

  resetFilters(): void {
    // Reset hidden states
    this.hiddenCompetencies.clear();
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

  onLegendHover(type: string, index: number, isEntering: boolean): void {
    if (isEntering) {
      this.hoveredItem = { type, index };
      this.highlightChartSeries(type, index, true);
    } else {
      this.hoveredItem = null;
      this.highlightChartSeries(type, index, false);
    }
  }

  onLegendClick(type: string, value: number | string): void {
    if (type === 'competency') {
      const competencyId = value as number;
      if (this.hiddenCompetencies.has(competencyId)) {
        this.hiddenCompetencies.delete(competencyId);
      } else {
        this.hiddenCompetencies.add(competencyId);
      }
    } else if (type === 'level') {
      const levelValue = value as string;
      if (this.hiddenLevels.has(levelValue)) {
        this.hiddenLevels.delete(levelValue);
      } else {
        this.hiddenLevels.add(levelValue);
      }
    }
    
    // Update chart with hidden series
    this.updateChartVisibility();
    this.showMessage(`${type} ${this.hiddenCompetencies.has(value as number) || this.hiddenLevels.has(value as string) ? 'hidden' : 'shown'}`, 'info');
  }

  private highlightChartSeries(type: string, index: number, highlight: boolean): void {
    if (!this.chartInstance) return;

    try {
      if (type === 'competency') {
        // Highlight all series for this competency (all levels for this competency)
        const competencySeriesNames = this.assessmentLevels.map(level => 
          `${this.selectedCompetencies[index].label} - ${level.label}`
        );
        
        this.chartInstance.dispatchAction({
          type: highlight ? 'highlight' : 'downplay',
          seriesName: competencySeriesNames
        });
      } else if (type === 'level') {
        // Highlight all series for this level (this level across all competencies)
        const levelSeriesNames = this.selectedCompetencies.map(comp => 
          `${comp.label} - ${this.assessmentLevels[index].label}`
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

  private updateChartVisibility(): void {
    if (!this.chartInstance) return;

    try {
      // Update chart data by filtering out hidden series
      this.updateChart(); // This will rebuild the chart with current visibility state
    } catch (error) {
      console.warn('Error updating chart visibility:', error);
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