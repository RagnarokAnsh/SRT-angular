import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxEchartsModule } from 'ngx-echarts';
import type { EChartsOption } from 'echarts';

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
  imports: [CommonModule, NgxEchartsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  // Mock data - replace with API data later
  mockData: DashboardData = {
    genderDistribution: { male: 45, female: 55 },
    competencyProgress: { completed: 12, total: 17 },
    studentLevels: {
      beginner: 25,
      progressing: 35,
      advancing: 20,
      preschoolReady: 20
    }
  };

  genderChartOptions: EChartsOption = {};
  competencyChartOptions: EChartsOption = {};
  levelChartOptions: EChartsOption = {};

  ngOnInit() {
    this.initializeCharts();
  }

  private initializeCharts() {
    // Gender Distribution Chart
    this.genderChartOptions = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c}%',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderColor: '#eee',
        borderWidth: 1,
        textStyle: {
          color: '#333'
        },
        padding: [8, 12]
      },
      legend: {
        orient: 'horizontal',
        bottom: 0,
        itemWidth: 12,
        itemHeight: 12,
        textStyle: {
          color: 'var(--text-color)',
          fontSize: 12,
          fontWeight: 500
        },
        itemGap: 20
      },
      series: [
        {
          name: 'Gender Distribution',
          type: 'pie',
          radius: ['45%', '70%'],
          center: ['50%', '45%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 6,
            borderColor: '#fff',
            borderWidth: 2
          },
          label: {
            show: true,
            position: 'center',
            formatter: '{d}%',
            fontSize: 24,
            fontWeight: 'bold',
            color: 'var(--text-color)'
          },
          emphasis: {
            scale: true,
            scaleSize: 5,
            label: {
              show: true,
              fontSize: 28,
              fontWeight: 'bold'
            }
          },
          data: [
            { 
              value: this.mockData.genderDistribution.male, 
              name: 'Male',
              itemStyle: { 
                color: {
                  type: 'linear' as const,
                  x: 0,
                  y: 0,
                  x2: 0,
                  y2: 1,
                  colorStops: [{
                    offset: 0, color: '#2196F3'
                  }, {
                    offset: 1, color: '#1976D2'
                  }]
                }
              }
            },
            { 
              value: this.mockData.genderDistribution.female, 
              name: 'Female',
              itemStyle: { 
                color: {
                  type: 'linear' as const,
                  x: 0,
                  y: 0,
                  x2: 0,
                  y2: 1,
                  colorStops: [{
                    offset: 0, color: '#E91E63'
                  }, {
                    offset: 1, color: '#C2185B'
                  }]
                }
              }
            }
          ],
          animationType: 'scale',
          animationEasing: 'elasticOut',
          animationDelay: function (idx) {
            return Math.random() * 200;
          }
        }
      ]
    };

    // Competency Progress Chart
    this.competencyChartOptions = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        },
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderColor: '#eee',
        borderWidth: 1,
        textStyle: {
          color: '#333'
        },
        padding: [8, 12]
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'value',
        max: this.mockData.competencyProgress.total,
        axisLabel: {
          color: 'var(--text-color)',
          fontSize: 12
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(0,0,0,0.1)'
          }
        }
      },
      yAxis: {
        type: 'category',
        data: ['Competencies'],
        axisLabel: {
          color: 'var(--text-color)',
          fontSize: 12
        }
      },
      series: [
        {
          name: 'Completed',
          type: 'bar',
          data: [this.mockData.competencyProgress.completed],
          itemStyle: {
            color: {
              type: 'linear' as const,
              x: 0,
              y: 0,
              x2: 1,
              y2: 0,
              colorStops: [{
                offset: 0, color: 'var(--primary-color)'
              }, {
                offset: 1, color: 'var(--primary-hover)'
              }]
            },
            borderRadius: [4, 4, 0, 0]
          },
          barWidth: '40%',
          animationDelay: function (idx) {
            return idx * 100;
          }
        }
      ],
      animationDuration: 1000,
      animationEasing: 'cubicOut'
    };

    // Student Levels Chart
    const levelColors = [
      {
        type: 'linear' as const,
        x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [{ offset: 0, color: '#FF9800' }, { offset: 1, color: '#F57C00' }]
      },
      {
        type: 'linear' as const,
        x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [{ offset: 0, color: '#2196F3' }, { offset: 1, color: '#1976D2' }]
      },
      {
        type: 'linear' as const,
        x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [{ offset: 0, color: '#9C27B0' }, { offset: 1, color: '#7B1FA2' }]
      },
      {
        type: 'linear' as const,
        x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [{ offset: 0, color: '#4CAF50' }, { offset: 1, color: '#388E3C' }]
      }
    ];

    this.levelChartOptions = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        },
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderColor: '#eee',
        borderWidth: 1,
        textStyle: {
          color: '#333'
        },
        padding: [8, 12]
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: ['Beginner', 'Progressing', 'Advancing', 'Preschool Ready'],
        axisLabel: {
          color: 'var(--text-color)',
          fontSize: 12,
          interval: 0,
          rotate: 30
        },
        axisTick: {
          alignWithLabel: true
        }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: 'var(--text-color)',
          fontSize: 12
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(0,0,0,0.1)'
          }
        }
      },
      series: [
        {
          name: 'Students',
          type: 'bar',
          data: [
            this.mockData.studentLevels.beginner,
            this.mockData.studentLevels.progressing,
            this.mockData.studentLevels.advancing,
            this.mockData.studentLevels.preschoolReady
          ],
          itemStyle: {
            color: function(params: any) {
              return levelColors[params.dataIndex];
            },
            borderRadius: [4, 4, 0, 0]
          },
          barWidth: '40%',
          animationDelay: function (idx) {
            return idx * 100;
          }
        }
      ],
      animationDuration: 1000,
      animationEasing: 'cubicOut'
    };
  }
}
