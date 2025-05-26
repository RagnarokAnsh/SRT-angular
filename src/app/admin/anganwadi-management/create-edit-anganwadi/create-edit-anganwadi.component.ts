import { Component, OnInit } from '@angular/core';
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
    MatProgressSpinnerModule
  ],
  template: `
    <div class="card">
      <div class="card-body">
        <h2 class="heading-heading mb-4">
          <span class="heading-highlight">{{isEditMode ? 'Edit' : 'Add'}}</span> Anganwadi Center
        </h2>

        <form [formGroup]="anganwadiForm" (ngSubmit)="onSubmit()">
          <div class="row">
            <div class="col-md-6 mb-3">
              <mat-form-field appearance="outline" class="w-100">
                <mat-label>Center Name</mat-label>
                <input matInput formControlName="name" placeholder="Enter center name">
                <mat-error *ngIf="anganwadiForm.get('name')?.hasError('required')">
                  Center name is required
                </mat-error>
              </mat-form-field>
            </div>

            <div class="col-md-6 mb-3">
              <mat-form-field appearance="outline" class="w-100">
                <mat-label>Center Code</mat-label>
                <input matInput formControlName="code" placeholder="Enter center code">
                <mat-error *ngIf="anganwadiForm.get('code')?.hasError('required')">
                  Center code is required
                </mat-error>
              </mat-form-field>
            </div>

            <div class="col-md-6 mb-3">
              <mat-form-field appearance="outline" class="w-100">
                <mat-label>Project</mat-label>
                <input matInput formControlName="project" placeholder="Enter project name">
                <mat-error *ngIf="anganwadiForm.get('project')?.hasError('required')">
                  Project is required
                </mat-error>
              </mat-form-field>
            </div>

            <div class="col-md-6 mb-3">
              <mat-form-field appearance="outline" class="w-100">
                <mat-label>Sector</mat-label>
                <input matInput formControlName="sector" placeholder="Enter sector">
                <mat-error *ngIf="anganwadiForm.get('sector')?.hasError('required')">
                  Sector is required
                </mat-error>
              </mat-form-field>
            </div>

            <div class="col-md-4 mb-3">
              <mat-form-field appearance="outline" class="w-100">
                <mat-label>Country</mat-label>
                <mat-select formControlName="country_id" (selectionChange)="onCountryChange($event.value)">
                  <mat-option *ngFor="let country of countries" [value]="country.id">
                    {{country.name}}
                  </mat-option>
                </mat-select>
                <mat-error *ngIf="anganwadiForm.get('country_id')?.hasError('required')">
                  Country is required
                </mat-error>
              </mat-form-field>
            </div>

            <div class="col-md-4 mb-3">
              <mat-form-field appearance="outline" class="w-100">
                <mat-label>State</mat-label>
                <mat-select formControlName="state_id" 
                           [disabled]="!anganwadiForm.get('country_id')?.value || loadingStates"
                           (selectionChange)="onStateChange($event.value)">
                  <mat-option *ngIf="loadingStates" disabled>
                    <mat-spinner diameter="20"></mat-spinner> Loading...
                  </mat-option>
                  <mat-option *ngFor="let state of states" [value]="state.id">
                    {{state.name}}
                  </mat-option>
                </mat-select>
                <mat-error *ngIf="anganwadiForm.get('state_id')?.hasError('required')">
                  State is required
                </mat-error>
              </mat-form-field>
            </div>

            <div class="col-md-4 mb-3">
              <mat-form-field appearance="outline" class="w-100">
                <mat-label>District</mat-label>
                <mat-select formControlName="district_id" 
                           [disabled]="!anganwadiForm.get('state_id')?.value || loadingDistricts">
                  <mat-option *ngIf="loadingDistricts" disabled>
                    <mat-spinner diameter="20"></mat-spinner> Loading...
                  </mat-option>
                  <mat-option *ngFor="let district of districts" [value]="district.id">
                    {{district.name}}
                  </mat-option>
                </mat-select>
                <mat-error *ngIf="anganwadiForm.get('district_id')?.hasError('required')">
                  District is required
                </mat-error>
              </mat-form-field>
            </div>
          </div>

          <div class="d-flex justify-content-end gap-2 mt-4">
            <button type="button" class="btn btn-outline-secondary" (click)="goBack()">Cancel</button>
            <button type="submit" class="btn btn-primary" [disabled]="anganwadiForm.invalid || submitting">
              <mat-spinner *ngIf="submitting" diameter="20" class="me-2"></mat-spinner>
              {{isEditMode ? 'Update' : 'Create'}} Center
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .mat-mdc-form-field {
      width: 100%;
    }
    
    .mat-spinner {
      display: inline-block;
      margin-right: 8px;
    }

    .mat-mdc-option .mat-spinner {
      margin-right: 8px;
      vertical-align: middle;
    }
  `]
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

  // Store original values for edit mode
  private originalCountryId?: number;
  private originalStateId?: number;
  private originalDistrictId?: number;

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
    // Only reset if this is not during initial load for edit mode
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
          
          // If in edit mode and this is the original country, restore the original state
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
    // Only reset if this is not during initial load for edit mode
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
          
          // If in edit mode and this is the original state, restore the original district
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
        // Store original values
        this.originalCountryId = center.country_id;
        this.originalStateId = center.state_id;
        this.originalDistrictId = center.district_id;
        
        // Patch the form with center data
        this.anganwadiForm.patchValue(center);
        
        // Load dependent dropdowns
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
            this.submitting = false;
            this.goBack();
          },
          error: (error) => {
            console.error('Error updating anganwadi center:', error);
            this.submitting = false;
          }
        });
      } else {
        this.anganwadiService.createAnganwadiCenter(centerData).subscribe({
          next: () => {
            this.submitting = false;
            this.goBack();
          },
          error: (error) => {
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