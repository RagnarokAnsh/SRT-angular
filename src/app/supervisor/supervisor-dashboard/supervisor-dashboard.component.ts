import { Component, OnInit } from '@angular/core';
import { LoggerService } from '../../core/logger.service';

@Component({
  selector: 'app-supervisor-dashboard',
  imports: [],
  templateUrl: './supervisor-dashboard.component.html',
  styleUrl: './supervisor-dashboard.component.scss'
})
export class SupervisorDashboardComponent implements OnInit {
  constructor(
    private logger: LoggerService
  ) {}

  ngOnInit(): void {
    this.logger.log('SupervisorDashboardComponent initialized');
  }
}
