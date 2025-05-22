import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CompetencyService, Competency } from '../competency.service';
import { CommonModule, NgIf, NgFor } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { register } from 'swiper/element/bundle';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

register(); // Register Swiper custom elements

@Component({
  selector: 'app-details',
  standalone: true,
  imports: [CommonModule, NgIf, NgFor, FormsModule],
  templateUrl: './details.component.html',
  styleUrl: './details.component.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class DetailsComponent implements OnInit {
  competency: Competency | undefined;
  checkboxes: boolean[] = [false, false, false, false];
  isMobile: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private competencyService: CompetencyService
  ) { }

  ngOnInit(): void {
    const competencyId = this.route.snapshot.paramMap.get('id');
    if (competencyId) {
      this.competency = this.competencyService.getCompetencyById(competencyId);
    }
    this.checkScreenSize();
    window.addEventListener('resize', () => this.checkScreenSize());
  }

  checkScreenSize(): void {
    this.isMobile = window.innerWidth < 768;
  }

  areAllCheckboxesChecked(): boolean {
    return this.checkboxes.every(checkbox => checkbox);
  }

  continueToAssessment(): void {
    this.router.navigate(['/assessments']);
  }
}
