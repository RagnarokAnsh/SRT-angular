import { Component, OnInit, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';

// PrimeNG Imports
import { MultiSelectModule } from 'primeng/multiselect';
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

// Interfaces
interface SessionOption {
  label: string;
  value: number;
  code: string;
}

interface DomainOption {
  label: string;
  value: number;
  code: string;
}

interface CompetencyOption {
  label: string;
  value: number;
  code: string;
  domainId: number;
}

interface AssessmentLevel {
  label: string;
  value: string;
  color: string;
}

interface DashboardData {
  totalStudents: number;
  assessedStudents: number;
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
    BaseChartDirective,
    SkeletonLoaderComponent,
    MultiSelectModule,
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
export class DashboardComponent implements OnInit {
  @ViewChild('chart', { static: false }) chart!: ElementRef;

  // Loading state
  loading = true;
  loadingAssessments = false;

  // Data
  students: Student[] = [];
  domains: AppDomain[] = [];
  assessmentData: AssessmentStudent[] = [];
  currentUserAnganwadiId: number | null = null;

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

  // Selected values
  selectedSessions: SessionOption[] = [];
  selectedDomains: DomainOption[] = [];
  selectedCompetencies: CompetencyOption[] = [];

  // Assessment levels
  assessmentLevels: AssessmentLevel[] = [
    { label: 'Beginner', value: 'Beginner', color: '#ff9800' },
    { label: 'Progressing', value: 'Progressing', color: '#2196f3' },
    { label: 'Advanced', value: 'Advanced', color: '#9c27b0' },
    { label: 'School Ready', value: 'PSR', color: '#4caf50' }
  ];

  // Dashboard metrics
  dashboardData: DashboardData = {
    totalStudents: 0,
    assessedStudents: 0,
    levelDistribution: {
      beginner: 0,
      progressing: 0,
      advanced: 0,
      schoolReady: 0
    }
  };

  // Chart configuration
  chartData: ChartConfiguration<'bar'>['data'] = {
    labels: ['Beginner', 'Progressing', 'Advanced', 'School Ready'],
    datasets: [{
      label: 'Number of Students',
      data: [0, 0, 0, 0],
      backgroundColor: [
        'rgba(255, 152, 0, 0.8)',
        'rgba(33, 150, 243, 0.8)',
        'rgba(156, 39, 176, 0.8)',
        'rgba(76, 175, 80, 0.8)'
      ],
      borderColor: [
        'rgba(255, 152, 0, 1)',
        'rgba(33, 150, 243, 1)',
        'rgba(156, 39, 176, 1)',
        'rgba(76, 175, 80, 1)'
      ],
      borderWidth: 2,
      borderRadius: 8,
      borderSkipped: false
    }]
  };

  chartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#1f2937',
        bodyColor: '#374151',
        borderColor: 'rgba(0, 0, 0, 0.1)',
        borderWidth: 1,
        cornerRadius: 12,
        titleFont: {
          size: 16,
          weight: 600
        },
        bodyFont: {
          size: 14,
          weight: 500
        },
        callbacks: {
          label: (context) => {
            const value = context.parsed.y;
            const total = this.dashboardData.totalStudents;
            const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
            return `${value} students (${percentage}%)`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
          display: true,
          drawOnChartArea: true,
          drawTicks: false
        },
        ticks: {
          font: {
            family: 'Figtree, sans-serif',
            size: 12,
            weight: 500
          },
          color: '#6b7280',
          stepSize: 1
        },
        border: {
          display: false
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: {
            family: 'Figtree, sans-serif',
            size: 13,
            weight: 500
          },
          color: '#374151'
        },
        border: {
          display: false
        }
      }
    },
    animation: {
      duration: 1500,
      easing: 'easeInOutCubic'
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
  ) {
    Chart.register(...registerables);
  }

  ngOnInit() {
    this.initializeDashboard();
  }

  private async initializeDashboard(): Promise<void> {
    this.loading = true;
    
    try {
      // Get current user's anganwadi ID
      await this.getCurrentUserAnganwadiId();
      
      // Load all required data in parallel
      await Promise.all([
        this.loadStudents(),
        this.loadDomainsAndCompetencies()
      ]);
      
      // Set default selections to show some data initially
      this.setDefaultSelections();
      
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
        this.logger.log('Current user anganwadi ID:', this.currentUserAnganwadiId);
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
      this.studentService.getStudents().subscribe({
        next: (students) => {
          this.students = students || [];
          this.dashboardData.totalStudents = this.students.length;
          this.logger.log('Loaded students:', this.students.length);
          resolve();
        },
        error: (error) => {
          this.logger.error('Error loading students:', error);
          reject(error);
        }
      });
    });
  }

  private async loadDomainsAndCompetencies(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.competencyService.getDomainsWithCompetencies().subscribe({
        next: (domains) => {
          this.domains = domains || [];
          this.setupDropdownOptions();
          this.logger.log('Loaded domains and competencies:', this.domains.length);
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
    // Setup domain options
    this.domainOptions = this.domains.map(domain => ({
      label: domain.name,
      value: domain.id,
      code: `D${domain.id}`
    }));

    // Setup competency options
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
    // Select all sessions by default
    this.selectedSessions = [...this.sessionOptions];
    
    // Select first domain if available
    if (this.domainOptions.length > 0) {
      this.selectedDomains = [this.domainOptions[0]];
      this.onDomainChange();
    }
  }

  onDomainChange(): void {
    // Filter competencies based on selected domains
    if (this.selectedDomains.length > 0) {
      const selectedDomainIds = this.selectedDomains.map(d => d.value);
      this.filteredCompetencyOptions = this.competencyOptions.filter(
        comp => selectedDomainIds.includes(comp.domainId)
      );
      
      // Clear competency selection if it's not in the filtered list
      this.selectedCompetencies = this.selectedCompetencies.filter(
        comp => this.filteredCompetencyOptions.some(filtered => filtered.value === comp.value)
      );
    } else {
      this.filteredCompetencyOptions = [...this.competencyOptions];
      this.selectedCompetencies = [];
    }
    
    this.updateDashboard();
  }

  onCompetencyChange(): void {
    this.updateDashboard();
  }

  onSessionChange(): void {
    this.updateDashboard();
  }

  private async updateDashboard(): Promise<void> {
    if (!this.hasValidSelections()) {
      this.resetDashboardData();
      return;
    }

    this.loadingAssessments = true;
    
    try {
      await this.loadAssessmentData();
      this.calculateDashboardMetrics();
      this.updateChart();
    } catch (error) {
      this.logger.error('Error updating dashboard:', error);
      this.showMessage('Failed to update dashboard data.', 'error');
    } finally {
      this.loadingAssessments = false;
    }
  }

  private hasValidSelections(): boolean {
    return this.selectedSessions.length > 0 && 
           this.selectedCompetencies.length > 0 && 
           this.currentUserAnganwadiId !== null;
  }

  private async loadAssessmentData(): Promise<void> {
    if (!this.currentUserAnganwadiId || this.selectedCompetencies.length === 0) {
      this.assessmentData = [];
      return;
    }

    const assessmentPromises = this.selectedCompetencies.map(competency =>
      this.assessmentService.getAssessmentsByAnganwadiAndCompetency(
        this.currentUserAnganwadiId!,
        competency.value
      ).toPromise()
    );

    try {
      const results = await Promise.all(assessmentPromises);
      this.assessmentData = results.flat().filter(item => item !== undefined);
      this.logger.log('Loaded assessment data:', this.assessmentData.length);
    } catch (error) {
      this.logger.error('Error loading assessment data:', error);
      this.assessmentData = [];
    }
  }

  private calculateDashboardMetrics(): void {
    const metrics = {
      totalStudents: this.students.length,
      assessedStudents: 0,
      levelDistribution: {
        beginner: 0,
        progressing: 0,
        advanced: 0,
        schoolReady: 0
      }
    };

    const selectedSessionNumbers = this.selectedSessions.map(s => s.value);
    const assessedStudentIds = new Set<number>();

    this.assessmentData.forEach(student => {
      selectedSessionNumbers.forEach(sessionNum => {
        const sessionKey = `session_${sessionNum}` as keyof AssessmentStudent;
        const sessionData = student[sessionKey];
        
        if (sessionData && typeof sessionData === 'object' && 'observation' in sessionData) {
          const observation = (sessionData as any).observation;
          if (observation && student.child_id) {
            assessedStudentIds.add(student.child_id);
            
            // Map observations to level categories
            const level = String(observation).toLowerCase();
            if (level.includes('beginner') || level === '1') {
              metrics.levelDistribution.beginner++;
            } else if (level.includes('progressing') || level === '2') {
              metrics.levelDistribution.progressing++;
            } else if (level.includes('advanced') || level === '3') {
              metrics.levelDistribution.advanced++;
            } else if (level.includes('psr') || level.includes('school ready') || level === '4') {
              metrics.levelDistribution.schoolReady++;
            }
          }
        }
      });
    });

    metrics.assessedStudents = assessedStudentIds.size;
    this.dashboardData = metrics;
    
    this.logger.log('Dashboard metrics calculated:', metrics);
  }

  private updateChart(): void {
    const newChartData: ChartConfiguration<'bar'>['data'] = {
      labels: ['Beginner', 'Progressing', 'Advanced', 'School Ready'],
      datasets: [{
        label: 'Number of Students',
        data: [
          this.dashboardData.levelDistribution.beginner,
          this.dashboardData.levelDistribution.progressing,
          this.dashboardData.levelDistribution.advanced,
          this.dashboardData.levelDistribution.schoolReady
        ],
        backgroundColor: [
          'rgba(255, 152, 0, 0.8)',
          'rgba(33, 150, 243, 0.8)',
          'rgba(156, 39, 176, 0.8)',
          'rgba(76, 175, 80, 0.8)'
        ],
        borderColor: [
          'rgba(255, 152, 0, 1)',
          'rgba(33, 150, 243, 1)',
          'rgba(156, 39, 176, 1)',
          'rgba(76, 175, 80, 1)'
        ],
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false
      }]
    };

    this.chartData = { ...newChartData };
    this.cdr.detectChanges();
  }

  private resetDashboardData(): void {
    this.dashboardData = {
      totalStudents: this.students.length,
      assessedStudents: 0,
      levelDistribution: {
        beginner: 0,
        progressing: 0,
        advanced: 0,
        schoolReady: 0
      }
    };
    this.updateChart();
  }

  // Utility methods
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

  // Getter methods for template
  get hasSelections(): boolean {
    return this.selectedSessions.length > 0 && this.selectedCompetencies.length > 0;
  }

  get selectionSummary(): string {
    const sessions = this.selectedSessions.length;
    const competencies = this.selectedCompetencies.length;
    return `${sessions} session${sessions !== 1 ? 's' : ''}, ${competencies} competenc${competencies !== 1 ? 'ies' : 'y'}`;
  }
}