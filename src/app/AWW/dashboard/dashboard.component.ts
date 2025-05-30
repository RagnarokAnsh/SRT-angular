import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';

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
  // Mock data with your specified requirements
  mockData: DashboardData = {
    genderDistribution: { male: 65, female: 35 }, // 65% boys, 35% girls
    competencyProgress: { completed: 12, total: 17 }, // 12 out of 17 competencies
    studentLevels: {
      beginner: 28,
      progressing: 42,
      advancing: 18,
      preschoolReady: 12
    }
  };

  // Computed properties for better data display
  get totalStudents(): number {
    return this.mockData.genderDistribution.male + this.mockData.genderDistribution.female;
  }

  get competencyPercentage(): number {
    return Math.round((this.mockData.competencyProgress.completed / this.mockData.competencyProgress.total) * 100);
  }

  get totalLevelStudents(): number {
    const levels = this.mockData.studentLevels;
    return levels.beginner + levels.progressing + levels.advancing + levels.preschoolReady;
  }

  // Gender Distribution Chart (Modern Doughnut)
  genderChartData: ChartConfiguration<'doughnut'>['data'] = {
    labels: ['Boys', 'Girls'],
    datasets: [{
      data: [this.mockData.genderDistribution.male, this.mockData.genderDistribution.female],
      backgroundColor: [
        'rgba(99, 102, 241, 0.8)',
        'rgba(236, 72, 153, 0.8)'
      ],
      borderColor: [
        'rgba(99, 102, 241, 1)',
        'rgba(236, 72, 153, 1)'
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
            const percentage = ((context.parsed / this.totalStudents) * 100).toFixed(1);
            return `${context.label}: ${context.parsed} (${percentage}%)`;
          }
        }
      }
    },
    animation: {
      duration: 1500,
      easing: 'easeInOutCubic'
    }
  };

  // Competency Progress Chart (Modern Progress Bar)
  // competencyChartData: ChartConfiguration<'doughnut'>['data'] = {
  //   labels: ['Completed', 'Remaining'],
  //   datasets: [{
  //     data: [
  //       this.mockData.competencyProgress.completed,
  //       this.mockData.competencyProgress.total - this.mockData.competencyProgress.completed
  //     ],
  //     backgroundColor: [
  //       'rgba(16, 185, 129, 0.8)',
  //       'rgba(229, 231, 235, 0.8)'
  //     ],
  //     borderColor: [
  //       'rgba(16, 185, 129, 1)',
  //       'rgba(229, 231, 235, 1)'
  //     ],
  //     borderWidth: 3,
  //     hoverOffset: 6
  //   }]
  // };

  // competencyChartOptions: ChartConfiguration<'doughnut'>['options'] = {
  //   responsive: true,
  //   maintainAspectRatio: false,
  //   cutout: '70%',
  //   plugins: {
  //     legend: {
  //       display: false
  //     },
  //     tooltip: {
  //       backgroundColor: 'rgba(255, 255, 255, 0.95)',
  //       titleColor: '#1f2937',
  //       bodyColor: '#374151',
  //       borderColor: 'rgba(0, 0, 0, 0.1)',
  //       borderWidth: 1,
  //       cornerRadius: 12,
  //       titleFont: {
  //         size: 16,
  //         weight: 600
  //       },
  //       bodyFont: {
  //         size: 14,
  //         weight: 500
  //       },
  //       callbacks: {
  //         label: (context) => {
  //           return `${context.label}: ${context.parsed} competencies`;
  //         }
  //       }
  //     }
  //   },
  //   animation: {
  //     duration: 1500,
  //     easing: 'easeInOutCubic'
  //   }
  // };

  // Student Levels Chart (Modern Horizontal Bar)
  levelChartData: ChartConfiguration<'bar'>['data'] = {
    labels: ['Beginner', 'Progressing', 'Advancing', 'Preschool Ready'],
    datasets: [{
      data: [
        this.mockData.studentLevels.beginner,
        this.mockData.studentLevels.progressing,
        this.mockData.studentLevels.advancing,
        this.mockData.studentLevels.preschoolReady
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
            const percentage = ((context.parsed.x / this.totalLevelStudents) * 100).toFixed(1);
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

  ngOnInit() {
    Chart.register(...registerables);
  }
}