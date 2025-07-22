import { Component, OnInit } from '@angular/core';
import { LoggerService } from '../../core/logger.service';

@Component({
  selector: 'app-state-dashboard',
  imports: [],
  templateUrl: './state-dashboard.component.html',
  styleUrl: './state-dashboard.component.scss'
})
export class StateDashboardComponent implements OnInit {
  constructor(
    private logger: LoggerService
  ) {}

  ngOnInit(): void {
    this.logger.log('StateDashboardComponent initialized');
  }
}
