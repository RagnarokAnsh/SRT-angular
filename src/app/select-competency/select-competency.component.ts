import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CompetencyService, Domain } from '../competency.service';
import { NgFor, NgIf } from '@angular/common';

@Component({
  selector: 'app-select-competency',
  imports: [NgFor, NgIf],
  templateUrl: './select-competency.component.html',
  styleUrl: './select-competency.component.scss'
})
export class SelectCompetencyComponent implements OnInit {
  domains: Domain[] = [];

  constructor(private router: Router, private competencyService: CompetencyService) { }

  ngOnInit(): void {
    this.domains = this.competencyService.getDomains();
  }

  goToDetails(competencyId: string): void {
    this.router.navigate(['/details', competencyId]);
  }
}
