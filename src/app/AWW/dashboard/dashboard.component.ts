import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxEchartsModule } from 'ngx-echarts';
import type { EChartsOption } from 'echarts';


@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, NgxEchartsModule],
  template: `
  <div class="chart-container">
    <div echarts [options]="chartOptions" class="chart"></div>
  </div>
`,
styles: [`
  .chart-container {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    background: #0f0f1a;
    border-radius: 1rem;
    box-shadow: 0 0 20px rgba(0,255,255,0.1);
    padding: 2rem;
  }

  .chart {
    width: 400px;
    height: 400px;
  }
`]
})
export class DashboardComponent {
chartOptions: EChartsOption = {
  backgroundColor: 'transparent',
  angleAxis: {
    max: 100,
    show: false,
    startAngle: 90,
  },
  radiusAxis: {
    type: 'category',
    data: [''],
    z: 10,
    show: false,
  },
  polar: {},
  series: [
    {
      type: 'bar',
      data: [67],
      coordinateSystem: 'polar',
      name: 'Male',
      roundCap: true,
      color: '#00f0ff',
      itemStyle: {
        shadowBlur: 20,
        shadowColor: '#00f0ff',
      },
      emphasis: {
        focus: 'series',
      },
      animationDuration: 1000,
      animationEasing: 'elasticOut',
    },
    {
      type: 'bar',
      data: [33],
      coordinateSystem: 'polar',
      name: 'Female',
      roundCap: true,
      color: '#ff4fcf',
      itemStyle: {
        shadowBlur: 20,
        shadowColor: '#ff4fcf',
      },
      emphasis: {
        focus: 'series',
      },
      animationDelay: 300,
      animationDuration: 1200,
      animationEasing: 'cubicOut',
    }
  ],
  legend: {
    show: true,
    data: ['Male', 'Female'],
    bottom: 10,
    textStyle: {
      color: '#ccc',
      fontWeight: 'bold',
    }
  },
  tooltip: {
    trigger: 'item',
    formatter: '{b}: {c}%',
  }
};
}
