import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CompetencyService, Competency } from '../competency.service';
import { CommonModule, NgIf, NgFor } from '@angular/common';

@Component({
  selector: 'app-details',
  standalone: true,
  imports: [CommonModule, NgIf, NgFor],
  templateUrl: './details.component.html',
  styleUrl: './details.component.scss'
})
export class DetailsComponent implements OnInit {
  competency: Competency | undefined;

  constructor(private route: ActivatedRoute, private competencyService: CompetencyService) { }

  ngOnInit(): void {
    const competencyId = this.route.snapshot.paramMap.get('id');
    if (competencyId) {
      this.competency = this.competencyService.getCompetencyById(competencyId);
    }
  }
}
