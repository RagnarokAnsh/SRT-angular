import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CompetencyService, AppDomain } from '../../competency.service';
import { NgFor } from '@angular/common';
import { LoggerService } from '../../core/logger.service';

@Component({
  selector: 'app-select-competency',
  imports: [NgFor],
  templateUrl: './select-competency.component.html',
  styleUrl: './select-competency.component.scss'
})
export class SelectCompetencyComponent implements OnInit {
  domains: AppDomain[] = [];

  constructor(private router: Router, private competencyService: CompetencyService, private logger: LoggerService) { }

  ngOnInit(): void {
    this.competencyService.getDomainsWithCompetencies().subscribe({
      next: (domains) => {
        this.domains = domains;
        this.logger.log('Loaded domains:', domains);
      },
      error: (error) => {
        this.logger.error('Error loading domains:', error);
      }
    });
  }

  goToDetails(competencyId: number): void {
    this.logger.log('Navigating to details for competencyId:', competencyId);
    this.router.navigate(['/details', competencyId]);
  }
}
