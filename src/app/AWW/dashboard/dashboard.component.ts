import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';
import { StudentService, Student, ApiStudent } from '../student-management/student.service';
import { AssessmentService } from '../assessments/assessment.service';
import { forkJoin, of, Observable } from 'rxjs';
import { catchError, switchMap, map } from 'rxjs/operators';

interface StudentWithGender extends Student {
  gender: string;
}

interface AssessmentData {
  students: Student[];
  assessments: any[];
}

interface DashboardData {
  genderDistribution: { male: number; female: number };
  competencyProgress: { completed: number; total: number };
  studentLevels: { 
    beginner: number; 
    progressing: number; 
    advancing: number; 
    preschoolReady: number 
  };
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  // Real data properties
  students: StudentWithGender[] = [];
  loading = true;
  error: string | null = null;
  private _genderDistribution = { male: 0, female: 0 };

  // Computed properties for data display
  get totalStudents(): number {
    return this.students.length;
  }

  // Getter for gender distribution
  get genderDistribution() {
    return this._genderDistribution;
  }

  // For now, we'll keep these as placeholders
  get competencyProgress() {
    return { completed: 0, total: 0 };
  }

  get studentLevels() {
    return {
      beginner: 0,
      progressing: 0,
      advancing: 0,
      preschoolReady: 0
    };
  }

  // Gender Distribution Chart (Modern Doughnut) - Fixed colors
  genderChartData: ChartConfiguration<'doughnut'>['data'] = {
    labels: ['Boys', 'Girls'],
    datasets: [{
      data: [0, 0], // Will be updated when data loads
      backgroundColor: [
        'rgba(79, 70, 229, 0.8)', // indigo-600 (matching boys stat card)
        'rgba(219, 39, 119, 0.8)'  // pink-600 (matching girls stat card)
      ],
      borderColor: [
        'rgba(79, 70, 229, 1)',    // indigo-600
        'rgba(219, 39, 119, 1)'    // pink-600
      ],
      borderWidth: 3,
      hoverOffset: 8
    }]
  };

  genderChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          font: {
            family: 'Figtree, sans-serif',
            size: 14,
            weight: 500
          },
          padding: 25,
          color: '#374151',
          usePointStyle: true,
          pointStyle: 'circle'
        }
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
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const value = context.parsed as number;
            const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
            return `${context.label}: ${value} (${percentage}%)`;
          }
        }
      }
    },
    animation: {
      duration: 1500,
      easing: 'easeInOutCubic'
    }
  };

  // Student Levels Chart (Modern Horizontal Bar)
  levelChartData: ChartConfiguration<'bar'>['data'] = {
    labels: ['Beginner', 'Progressing', 'Advancing', 'Preschool Ready'],
    datasets: [{
      data: [
        this.studentLevels.beginner,
        this.studentLevels.progressing,
        this.studentLevels.advancing,
        this.studentLevels.preschoolReady
      ],
      backgroundColor: [
        'rgba(245, 158, 11, 0.8)',
        'rgba(59, 130, 246, 0.8)',
        'rgba(139, 92, 246, 0.8)',
        'rgba(16, 185, 129, 0.8)'
      ],
      borderColor: [
        'rgba(245, 158, 11, 1)',
        'rgba(59, 130, 246, 1)',
        'rgba(139, 92, 246, 1)',
        'rgba(16, 185, 129, 1)'
      ],
      borderWidth: 2,
      borderRadius: 8,
      borderSkipped: false
    }]
  };

  levelChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
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
            const percentage = ((context.parsed.x / this.totalStudents) * 100).toFixed(1);
            return `${context.parsed.x} students (${percentage}%)`;
          }
        }
      }
    },
    scales: {
      x: {
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
          color: '#6b7280'
        },
        border: {
          display: false
        }
      },
      y: {
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
    private cdr: ChangeDetectorRef
  ) {
    // Register Chart.js components
    Chart.register(...registerables);
  }

  ngOnInit() {
    this.loadStudentData();
  }

  loadStudentData(): void {
    this.loading = true;
    this.error = null;
    
    // Get students data
    this.studentService.getStudents().subscribe({
      next: (students) => {
        this.students = students || [];
        this.updateGenderDistribution();
        this.updateCharts();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading students:', error);
        this.error = 'Failed to load student data. Please try again later.';
        this.loading = false;
      }
    });
  }

  /**
   * Helper method to normalize gender values
   */
  private normalizeGender(gender: string | undefined | null): 'male' | 'female' | 'other' {
    if (!gender) return 'other';
    
    const normalizedGender = gender.toLowerCase().trim();
    
    // Handle various male representations
    if (normalizedGender === 'male' || normalizedGender === 'm' || normalizedGender === 'boy') {
      return 'male';
    }
    
    // Handle various female representations
    if (normalizedGender === 'female' || normalizedGender === 'f' || normalizedGender === 'girl') {
      return 'female';
    }
    
    return 'other';
  }

  /**
   * Update gender distribution for stat cards
   */
  private updateGenderDistribution(): void {
    // Reset counts
    this._genderDistribution = { male: 0, female: 0 };
    
    // Count students by normalized gender
    this.students.forEach(student => {
      const normalizedGender = this.normalizeGender(student.gender);
      if (normalizedGender === 'male') {
        this._genderDistribution.male++;
      } else if (normalizedGender === 'female') {
        this._genderDistribution.female++;
      }
    });

    console.log('Gender Distribution Updated:', this._genderDistribution);
  }
  
  private updateCharts(): void {
    if (!this.students || this.students.length === 0) {
      // Reset charts to empty state
      this.genderChartData = {
        labels: ['Boys', 'Girls'],
        datasets: [{
          data: [0, 0],
          backgroundColor: [
            'rgba(79, 70, 229, 0.8)',
            'rgba(219, 39, 119, 0.8)'
          ],
          borderColor: [
            'rgba(79, 70, 229, 1)',
            'rgba(219, 39, 119, 1)'
          ],
          borderWidth: 3,
          hoverOffset: 8
        }]
      };
      this.levelChartData = { labels: [], datasets: [] };
      return;
    }

    // Update gender chart with fixed Boys/Girls order and colors
    const newGenderChartData: ChartConfiguration<'doughnut'>['data'] = {
      labels: ['Boys', 'Girls'],
      datasets: [{
        data: [this._genderDistribution.male, this._genderDistribution.female],
        backgroundColor: [
          'rgba(79, 70, 229, 0.8)', // indigo-600 for boys (matching stat card)
          'rgba(219, 39, 119, 0.8)'  // pink-600 for girls (matching stat card)
        ],
        borderColor: [
          'rgba(79, 70, 229, 1)',    // indigo-600
          'rgba(219, 39, 119, 1)'    // pink-600
        ],
        borderWidth: 3,
        hoverOffset: 8
      }]
    };
    
    // Update level chart data
    const levelLabels = ['Beginner', 'Progressing', 'Advancing', 'Preschool Ready'];
    const levelData = [
      this.studentLevels.beginner,
      this.studentLevels.progressing,
      this.studentLevels.advancing,
      this.studentLevels.preschoolReady
    ];

    const newLevelChartData: ChartConfiguration<'bar'>['data'] = {
      labels: [...levelLabels],
      datasets: [{
        data: [...levelData],
        backgroundColor: [
          'rgba(245, 158, 11, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(139, 92, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)'
        ],
        borderColor: [
          'rgba(245, 158, 11, 1)',
          'rgba(59, 130, 246, 1)',
          'rgba(139, 92, 246, 1)',
          'rgba(16, 185, 129, 1)'
        ],
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false
      }]
    };

    // Update the chart data
    this.genderChartData = { ...newGenderChartData };
    this.levelChartData = { ...newLevelChartData };
    
    // Manually trigger change detection
    this.cdr.detectChanges();
  }
}