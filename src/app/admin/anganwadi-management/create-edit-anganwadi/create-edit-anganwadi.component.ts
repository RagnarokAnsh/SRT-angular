import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AnganwadiService, Country, State, District } from '../anganwadi.service';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-create-edit-anganwadi',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    ToastModule
  ],

  templateUrl: './create-edit-anganwadi.component.html',
  styleUrl: './create-edit-anganwadi.component.scss'
})
export class CreateEditAnganwadiComponent implements OnInit {
  anganwadiForm: FormGroup;
  isEditMode = false;
  anganwadiId: number | null = null;
  
  countries: Country[] = [];
  states: State[] = [];
  districts: District[] = [];
  
  loadingStates = false;
  loadingDistricts = false;
  submitting = false;

  private originalCountryId?: number;
  private originalStateId?: number;
  private originalDistrictId?: number;

  private messageService = inject(MessageService);

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private anganwadiService: AnganwadiService
  ) {
    this.anganwadiForm = this.fb.group({
      name: ['', Validators.required],
      code: ['', Validators.required],
      project: ['', Validators.required],
      sector: ['', Validators.required],
      country_id: ['', Validators.required],
      state_id: ['', Validators.required],
      district_id: ['', Validators.required]
    });
  }

  ngOnInit() {
    this.loadCountries();
    
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.anganwadiId = +id;
      this.loadAnganwadiData(this.anganwadiId);
    }
  }

  loadCountries() {
    this.anganwadiService.getCountries().subscribe({
      next: (countries) => {
        this.countries = countries;
      },
      error: (error) => {
        console.error('Error loading countries:', error);
      }
    });
  }

  onCountryChange(countryId: number) {
    if (!this.isEditMode || countryId !== this.originalCountryId) {
      this.anganwadiForm.patchValue({
        state_id: '',
        district_id: ''
      });
      this.districts = [];
    }

    this.states = [];

    if (countryId) {
      this.loadingStates = true;
      this.anganwadiService.getStates(countryId).subscribe({
        next: (states) => {
          this.states = states;
          this.loadingStates = false;
          
          if (this.isEditMode && countryId === this.originalCountryId && this.originalStateId) {
            this.anganwadiForm.patchValue({ state_id: this.originalStateId });
            this.onStateChange(this.originalStateId);
          }
        },
        error: (error) => {
          console.error('Error loading states:', error);
          this.loadingStates = false;
        }
      });
    }
  }

  onStateChange(stateId: number) {
    if (!this.isEditMode || stateId !== this.originalStateId) {
      this.anganwadiForm.patchValue({
        district_id: ''
      });
    }

    this.districts = [];

    if (stateId) {
      this.loadingDistricts = true;
      this.anganwadiService.getDistricts(stateId).subscribe({
        next: (districts) => {
          this.districts = districts;
          this.loadingDistricts = false;
          
          if (this.isEditMode && stateId === this.originalStateId && this.originalDistrictId) {
            this.anganwadiForm.patchValue({ district_id: this.originalDistrictId });
          }
        },
        error: (error) => {
          console.error('Error loading districts:', error);
          this.loadingDistricts = false;
        }
      });
    }
  }

  loadAnganwadiData(id: number) {
    this.anganwadiService.getAnganwadiCenter(id).subscribe({
      next: (center) => {
        this.originalCountryId = center.country_id;
        this.originalStateId = center.state_id;
        this.originalDistrictId = center.district_id;
        
        this.anganwadiForm.patchValue(center);
        
        if (center.country_id) {
          this.onCountryChange(center.country_id);
        }
      },
      error: (error) => {
        console.error('Error loading anganwadi center:', error);
        this.goBack();
      }
    });
  }

  onSubmit() {
    if (this.anganwadiForm.valid) {
      this.submitting = true;
      const centerData = this.anganwadiForm.value;
      
      if (this.isEditMode && this.anganwadiId) {
        this.anganwadiService.updateAnganwadiCenter(this.anganwadiId, centerData).subscribe({
          next: () => {
            setTimeout(() => {
              this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: `Anganwadi center "${centerData.name}" updated successfully`,
                life: 3000
              });
            }, 0);
            this.submitting = false;
            this.goBack();
          },
          error: (error) => {
            setTimeout(() => {
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: `Failed to update anganwadi center: ${error.message || 'Unknown error'}`,
                life: 5000
              });
            }, 0);
            console.error('Error updating anganwadi center:', error);
            this.submitting = false;
          }
        });
      } else {
        this.anganwadiService.createAnganwadiCenter(centerData).subscribe({
          next: () => {
            setTimeout(() => {
              this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: `Anganwadi center "${centerData.name}" created successfully`,
                life: 3000
              });
            }, 0);
            this.submitting = false;
            this.goBack();
          },
          error: (error) => {
            setTimeout(() => {
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: `Failed to create anganwadi center: ${error.message || 'Unknown error'}`,
                life: 5000
              });
            }, 0);
            console.error('Error creating anganwadi center:', error);
            this.submitting = false;
          }
        });
      }
    }
  }

  goBack() {
    this.router.navigate(['/admin/anganwadi']);
  }
}