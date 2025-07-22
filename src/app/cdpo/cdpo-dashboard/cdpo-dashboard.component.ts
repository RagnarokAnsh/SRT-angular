import { Component, OnInit } from '@angular/core';
import { LoggerService } from '../../core/logger.service';

@Component({
  selector: 'app-cdpo-dashboard',
  imports: [],
  templateUrl: './cdpo-dashboard.component.html',
  styleUrl: './cdpo-dashboard.component.scss'
})
export class CdpoDashboardComponent implements OnInit {
  constructor(
    private logger: LoggerService
  ) {}

  ngOnInit(): void {
    this.logger.log('CdpoDashboardComponent initialized');
  }
}
