import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CompetencyService, AppCompetency } from '../../competency.service';
import { CommonModule, NgIf, NgFor } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { register } from 'swiper/element/bundle';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import { LoggerService } from '../../core/logger.service';

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
  competency: AppCompetency | undefined;
  checkboxes: boolean[] = [false, false, false, false];
  isMobile: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private competencyService: CompetencyService,
    private logger: LoggerService
  ) { }

  ngOnInit(): void {
    const competencyId = this.route.snapshot.paramMap.get('id');
    if (competencyId) {
      this.competencyService.getCompetencyById(+competencyId).subscribe(comp => this.competency = comp);
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
    if (this.competency) {
      // Store the competency name in localStorage for backward compatibility
      localStorage.setItem('selectedCompetencyName', this.competency.name);
      this.logger.log('Navigating to assessments for competency:', this.competency.name);
      // Navigate to the assessments page with the competency ID
      this.router.navigate(['/assessments', this.competency.id]);
    } else {
      this.logger.warn('No competency available, navigating to /assessments');
      // Fallback to the regular assessments route if no competency is available
      this.router.navigate(['/assessments']);
    }
  }
}
