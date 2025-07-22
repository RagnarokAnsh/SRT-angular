import { Component, OnInit } from '@angular/core';
import { LoggerService } from '../../core/logger.service';

@Component({
  selector: 'app-dpo-dashboard',
  imports: [],
  templateUrl: './dpo-dashboard.component.html',
  styleUrl: './dpo-dashboard.component.scss'
})
export class DpoDashboardComponent implements OnInit {
  constructor(
    private logger: LoggerService
  ) {}

  ngOnInit(): void {
    this.logger.log('DpoDashboardComponent initialized');
  }
}
