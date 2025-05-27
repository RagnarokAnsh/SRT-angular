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
import { MatIconModule } from '@angular/material/icon';
import { UserService, User, Country, State, District, Project, Sector, AnganwadiCenter } from '../user.service';

@Component({
  selector: 'app-create-edit-user',
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
    MatIconModule
  ],
  template: `
    <div class="card">
      <div class="card-body">
        <h2 class="heading-heading mb-4">
          <span class="heading-highlight">{{isEditMode ? 'Edit' : 'Add'}}</span> User
        </h2>

        <form [formGroup]="userForm" (ngSubmit)="onSubmit()">
          <!-- Basic Information -->
          <div class="row">
            <div class="col-md-6 mb-3">
              <mat-form-field appearance="outline" class="w-100">
                <mat-label>Full Name</mat-label>
                <input matInput formControlName="name" placeholder="Enter full name">
                <mat-error *ngIf="userForm.get('name')?.hasError('required')">
                  Name is required
                </mat-error>
              </mat-form-field>
            </div>

            <div class="col-md-6 mb-3">
              <mat-form-field appearance="outline" class="w-100">
                <mat-label>Email</mat-label>
                <input matInput type="email" formControlName="email" placeholder="Enter email address">
                <mat-error *ngIf="userForm.get('email')?.hasError('required')">
                  Email is required
                </mat-error>
                <mat-error *ngIf="userForm.get('email')?.hasError('email')">
                  Please enter a valid email address
                </mat-error>
              </mat-form-field>
            </div>

            <div class="col-md-6 mb-3">
              <mat-form-field appearance="outline" class="w-100">
                <mat-label>Password</mat-label>
                <input matInput type="password" formControlName="password" 
                       [placeholder]="isEditMode ? 'Leave blank to keep current password' : 'Enter password'">
                <mat-error *ngIf="userForm.get('password')?.hasError('required')">
                  Password is required
                </mat-error>
                <mat-error *ngIf="userForm.get('password')?.hasError('minlength')">
                  Password must be at least 6 characters long
                </mat-error>
              </mat-form-field>
            </div>

            <div class="col-md-6 mb-3">
              <mat-form-field appearance="outline" class="w-100">
                <mat-label>Role</mat-label>
                <mat-select formControlName="role" (selectionChange)="onRoleChange($event.value)">
                  <mat-option *ngFor="let role of availableRoles" [value]="role">
                    {{role | titlecase}}
                  </mat-option>
                </mat-select>
                <mat-error *ngIf="userForm.get('role')?.hasError('required')">
                  Role is required
                </mat-error>
              </mat-form-field>
            </div>
          </div>

          <!-- Location Fields (shown based on role) -->
          <div *ngIf="showLocationFields" class="border-top pt-4 mt-4">
            <h5 class="mb-3">Location Information</h5>
            
            <div class="row">
              <div class="col-md-6 mb-3" *ngIf="isFieldRequired('country_id')">
                <mat-form-field appearance="outline" class="w-100">
                  <mat-label>Country</mat-label>
                  <mat-select formControlName="country_id" (selectionChange)="onCountryChange($event.value)">
                    <mat-option *ngFor="let country of countries" [value]="country.id">
                      {{country.name}}
                    </mat-option>
                  </mat-select>
                  <mat-error *ngIf="userForm.get('country_id')?.hasError('required')">
                    Country is required for this role
                  </mat-error>
                </mat-form-field>
              </div>

              <div class="col-md-6 mb-3" *ngIf="isFieldRequired('state_id')">
                <mat-form-field appearance="outline" class="w-100">
                  <mat-label>State</mat-label>
                  <mat-select formControlName="state_id" (selectionChange)="onStateChange($event.value)" 
                             [disabled]="!userForm.get('country_id')?.value">
                    <mat-option *ngFor="let state of states" [value]="state.id">
                      {{state.name}}
                    </mat-option>
                  </mat-select>
                  <mat-error *ngIf="userForm.get('state_id')?.hasError('required')">
                    State is required for this role
                  </mat-error>
                </mat-form-field>
              </div>

              <div class="col-md-6 mb-3" *ngIf="isFieldRequired('district_id')">
                <mat-form-field appearance="outline" class="w-100">
                  <mat-label>District</mat-label>
                  <mat-select formControlName="district_id" (selectionChange)="onDistrictChange($event.value)"
                             [disabled]="!userForm.get('state_id')?.value">
                    <mat-option *ngFor="let district of districts" [value]="district.id">
                      {{district.name}}
                    </mat-option>
                  </mat-select>
                  <mat-error *ngIf="userForm.get('district_id')?.hasError('required')">
                    District is required for this role
                  </mat-error>
                </mat-form-field>
              </div>

              <div class="col-md-6 mb-3" *ngIf="isFieldRequired('project')">
                <mat-form-field appearance="outline" class="w-100">
                  <mat-label>Project</mat-label>
                  <mat-select formControlName="project" (selectionChange)="onProjectChange($event.value)"
                             [disabled]="!userForm.get('district_id')?.value">
                    <mat-option *ngFor="let project of projects" [value]="project">
                      {{project}}
                    </mat-option>
                  </mat-select>
                  <mat-error *ngIf="userForm.get('project')?.hasError('required')">
                    Project is required for this role
                  </mat-error>
                </mat-form-field>
              </div>

              <div class="col-md-6 mb-3" *ngIf="isFieldRequired('sector')">
                <mat-form-field appearance="outline" class="w-100">
                  <mat-label>Sector</mat-label>
                  <mat-select formControlName="sector" (selectionChange)="onSectorChange($event.value)"
                             [disabled]="!userForm.get('project')?.value">
                    <mat-option *ngFor="let sector of sectors" [value]="sector">
                      {{sector}}
                    </mat-option>
                  </mat-select>
                  <mat-error *ngIf="userForm.get('sector')?.hasError('required')">
                    Sector is required for this role
                  </mat-error>
                </mat-form-field>
              </div>

              <div class="col-md-6 mb-3" *ngIf="isFieldRequired('aganwadi')">
                <mat-form-field appearance="outline" class="w-100">
                  <mat-label>Anganwadi Center</mat-label>
                  <mat-select formControlName="aganwadi" 
                             [disabled]="!userForm.get('sector')?.value">
                    <mat-option *ngFor="let center of anganwadiCenters" [value]="center.name">
                      {{center.name}}
                    </mat-option>
                  </mat-select>
                  <mat-error *ngIf="userForm.get('aganwadi')?.hasError('required')">
                    Anganwadi Center is required for this role
                  </mat-error>
                </mat-form-field>
              </div>
            </div>
          </div>

          <!-- Submit Buttons -->
          <div class="d-flex justify-content-end gap-2 mt-4">
            <button class="btn btn-primary" (click)="goBack()">Cancel</button>
            <button type="submit" 
                   [disabled]="userForm.invalid || isLoading" class="btn btn-primary">
              <mat-spinner *ngIf="isLoading" diameter="20" class="me-2"></mat-spinner>
              {{isEditMode ? 'Update' : 'Create'}} User
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .border-top {
      border-top: 1px solid #dee2e6 !important;
    }

    mat-spinner {
      display: inline-block;
      margin-right: 8px;
    }

    .w-100 {
      width: 100%;
    }
  `]
})
export class CreateEditUserComponent implements OnInit {
  userForm: FormGroup;
  isEditMode = false;
  userId: number | null = null;
  isLoading = false;
  showLocationFields = false;

  // Data arrays
  availableRoles: string[] = [];
  countries: Country[] = [];
  states: State[] = [];
  districts: District[] = [];
  projects: Project[] = [];
  sectors: Sector[] = [];
  anganwadiCenters: AnganwadiCenter[] = [];

  // Current required fields based on role
  currentRequiredFields: string[] = [];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService
  ) {
    this.userForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      role: ['', Validators.required],
      country_id: [null],
      state_id: [null],
      district_id: [null],
      project: [null],
      sector: [null],
      aganwadi: [null]
    });
  }

  ngOnInit() {
    this.availableRoles = this.userService.getAvailableRoles();
    this.loadCountries();

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.userId = +id;
      // In edit mode, password is optional
      this.userForm.get('password')?.clearValidators();
      this.userForm.get('password')?.updateValueAndValidity();
      this.loadUserData(this.userId);
    }
  }

  loadCountries() {
    this.userService.getCountries().subscribe({
      next: (countries) => {
        this.countries = countries;
      },
      error: (error) => {
        console.error('Error loading countries:', error);
      }
    });
  }

  loadUserData(id: number) {
    this.userService.getUser(id).subscribe({
      next: (user) => {
        this.userForm.patchValue({
          name: user.name,
          email: user.email,
          role: user.roles[0]?.name || '',
          country_id: user.country_id,
          state_id: user.state_id,
          district_id: user.district_id,
          project: user.project,
          sector: user.sector,
          aganwadi: user.aganwadi
        });

        // Load dependent data if values exist
        if (user.country_id) {
          this.onCountryChange(user.country_id);
        }
        if (user.state_id) {
          this.onStateChange(user.state_id);
        }
        if (user.district_id) {
          this.onDistrictChange(user.district_id);
        }
        if (user.project) {
          this.onProjectChange(user.project);
        }
        if (user.sector) {
          this.onSectorChange(user.sector);
        }

        // Set role-based requirements
        if (user.roles[0]?.name) {
          this.onRoleChange(user.roles[0].name);
        }
      },
      error: (error) => {
        console.error('Error loading user:', error);
        this.goBack();
      }
    });
  }

  onRoleChange(role: string) {
    this.currentRequiredFields = this.userService.getRoleRequiredFields(role);
    this.showLocationFields = this.currentRequiredFields.length > 0;
    this.updateFieldValidators();
    this.resetDependentFields();
  }

  updateFieldValidators() {
    // Clear all location field validators first
    const locationFields = ['country_id', 'state_id', 'district_id', 'project', 'sector', 'aganwadi'];
    
    locationFields.forEach(field => {
      const control = this.userForm.get(field);
      if (control) {
        control.clearValidators();
        if (this.currentRequiredFields.includes(field)) {
          control.setValidators([Validators.required]);
        }
        control.updateValueAndValidity();
      }
    });
  }

  resetDependentFields() {
    // Reset all location fields when role changes
    this.userForm.patchValue({
      country_id: null,
      state_id: null,
      district_id: null,
      project: null,
      sector: null,
      aganwadi: null
    });

    // Clear dependent arrays
    this.states = [];
    this.districts = [];
    this.projects = [];
    this.sectors = [];
    this.anganwadiCenters = [];
  }

  onCountryChange(countryId: number) {
    if (countryId) {
      this.userService.getStatesByCountry(countryId).subscribe({
        next: (states) => {
          this.states = states;
        },
        error: (error) => {
          console.error('Error loading states:', error);
        }
      });
    }

    // Reset dependent fields
    this.userForm.patchValue({
      state_id: null,
      district_id: null,
      project: null,
      sector: null,
      aganwadi: null
    });
    this.districts = [];
    this.projects = [];
    this.sectors = [];
    this.anganwadiCenters = [];
  }

  onStateChange(stateId: number) {
    if (stateId) {
      this.userService.getDistrictsByState(stateId).subscribe({
        next: (districts) => {
          this.districts = districts;
        },
        error: (error) => {
          console.error('Error loading districts:', error);
        }
      });
    }

    // Reset dependent fields
    this.userForm.patchValue({
      district_id: null,
      project: null,
      sector: null,
      aganwadi: null
    });
    this.projects = [];
    this.sectors = [];
    this.anganwadiCenters = [];
  }

  onDistrictChange(districtId: number) {
    if (districtId) {
      this.userService.getProjectsByDistrict(districtId).subscribe({
        next: (projects) => {
          this.projects = projects;
          console.log(this.projects);
          
        },
        error: (error) => {
          console.error('Error loading projects:', error);
        }
      });
    }

    // Reset dependent fields
    this.userForm.patchValue({
      project: null,
      sector: null,
      aganwadi: null
    });
    this.sectors = [];
    this.anganwadiCenters = [];
  }

  onProjectChange(project: string) {
    const districtId = this.userForm.get('district_id')?.value;
    if (project && districtId) {
      this.userService.getSectorsByProject(districtId, project).subscribe({
        next: (sectors) => {
          this.sectors = sectors;
        },
        error: (error) => {
          console.error('Error loading sectors:', error);
        }
      });
    }

    // Reset dependent fields
    this.userForm.patchValue({
      sector: null,
      aganwadi: null
    });
    this.anganwadiCenters = [];
  }

  onSectorChange(sector: string) {
    const districtId = this.userForm.get('district_id')?.value;
    const project = this.userForm.get('project')?.value;
    
    if (sector && districtId && project) {
      this.userService.getCentersBySector(districtId, project, sector).subscribe({
        next: (centers) => {
          this.anganwadiCenters = centers;
        },
        error: (error) => {
          console.error('Error loading anganwadi centers:', error);
        }
      });
    }

    // Reset anganwadi field
    this.userForm.patchValue({
      aganwadi: null
    });
  }

  isFieldRequired(fieldName: string): boolean {
    return this.currentRequiredFields.includes(fieldName);
  }

  onSubmit() {
    if (this.userForm.valid) {
      this.isLoading = true;
      const formData = { ...this.userForm.value };
      
      // Remove password if empty in edit mode
      if (this.isEditMode && !formData.password) {
        delete formData.password;
      }

      // Remove null values for optional fields
      Object.keys(formData).forEach(key => {
        if (formData[key] === null || formData[key] === '') {
          delete formData[key];
        }
      });

      const operation = this.isEditMode && this.userId
        ? this.userService.updateUser(this.userId, formData)
        : this.userService.createUser(formData);

      operation.subscribe({
        next: () => {
          this.isLoading = false;
          this.goBack();
        },
        error: (error) => {
          this.isLoading = false;
          console.error('Error saving user:', error);
          // You might want to show a toast/snackbar here
        }
      });
    }
  }

  goBack() {
    this.router.navigate(['/users']);
  }
}