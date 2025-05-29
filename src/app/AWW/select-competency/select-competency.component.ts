import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CompetencyService, AppDomain } from '../../competency.service';
import { NgFor } from '@angular/common';

@Component({
  selector: 'app-select-competency',
  imports: [NgFor],
  templateUrl: './select-competency.component.html',
  styleUrl: './select-competency.component.scss'
})
export class SelectCompetencyComponent implements OnInit {
  domains: AppDomain[] = [];

  constructor(private router: Router, private competencyService: CompetencyService) { }

  ngOnInit(): void {
    this.competencyService.getDomainsWithCompetencies().subscribe(data => this.domains = data);
  }

  goToDetails(competencyId: number): void {
    this.router.navigate(['/details', competencyId.toString()]);
  }
}
