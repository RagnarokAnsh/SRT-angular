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
import { MessageService } from 'primeng/api';
import { ErrorHandlerService } from '../../../core/error/error-handler.service';
import { SkeletonLoaderComponent } from '../../../components/skeleton-loader';
import { LoggerService } from '../../../core/logger.service';

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
    MatIconModule,
    SkeletonLoaderComponent
  ],
  templateUrl: './create-edit-user.component.html',
  styleUrl: './create-edit-user.component.scss'
})
export class CreateEditUserComponent implements OnInit {
  userForm: FormGroup;
  isEditMode = false;
  userId: number | null = null;
  isLoading = false;
  showLocationFields = false;
  isLoadingUserData = false; // <-- Add this flag

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
    private userService: UserService,
    private messageService: MessageService,
    private errorHandler: ErrorHandlerService,
    private logger: LoggerService
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
      anganwadi_id: [null],
      gender: ['', Validators.required]
    });
  }

  ngOnInit() {
    this.availableRoles = this.userService.getAvailableRoles();
    this.loadCountries();

    const id = this.route.snapshot.paramMap.get('id');
    this.logger.log('ngOnInit - id from route:', id);
    if (id) {
      this.isEditMode = true;
      this.userId = +id;
      // In edit mode, password is optional
      this.userForm.get('password')?.clearValidators();
      this.userForm.get('password')?.updateValueAndValidity();
      this.logger.log('ngOnInit - Calling loadUserData with userId:', this.userId);
      this.loadUserData(this.userId);
    }
  }

  loadCountries() {
    this.userService.getCountries().subscribe({
      next: (countries) => {
        this.countries = countries;
      },
      error: (error) => {
        this.logger.error('Error loading countries:', error);
      }
    });
  }

  async loadUserData(id: number) {
    this.isLoadingUserData = true;
    this.userService.getUser(id).subscribe({
      next: async (user) => {
        // Patch basic fields first
        this.userForm.patchValue({
          name: user.name,
          email: user.email,
          role: user.roles[0]?.name || '',
          gender: user.gender
        });

        // Set role-based requirements
        if (user.roles[0]?.name) {
          this.onRoleChange(user.roles[0].name);
        }

        // Now load and patch location fields in sequence
        if (user.country_id) {
          await this.loadStates(user.country_id, user.state_id);
        }
        if (user.state_id !== null && user.state_id !== undefined) {
          await this.loadDistricts(Number(user.state_id), user.district_id);
        }
        if (user.district_id !== null && user.district_id !== undefined) {
          await this.loadProjects(Number(user.district_id), user.project);
        }
        if (
          user.district_id !== null && user.district_id !== undefined &&
          user.project
        ) {
          await this.loadSectors(Number(user.district_id), user.project, user.sector);
        }
        if (
          user.district_id !== null && user.district_id !== undefined &&
          user.project &&
          user.sector
        ) {
          await this.loadAnganwadiCenters(Number(user.district_id), user.project, user.sector, user.anganwadi_id);
        }

        this.messageService.add({
          severity: 'info',
          summary: 'User Loaded',
          detail: `Successfully loaded user data for ${user.name}`,
          life: 3000
        });
        this.isLoadingUserData = false;
      },
      error: (error) => {
        this.isLoadingUserData = false;
        this.goBack();
      }
    });
  }

  loadStates(countryId: number, stateId: number | null): Promise<void> {
    return new Promise((resolve) => {
      this.userService.getStatesByCountry(countryId).subscribe(states => {
        this.states = states;
        this.userForm.patchValue({ country_id: countryId, state_id: stateId });
        resolve();
      });
    });
  }
  loadDistricts(stateId: number, districtId: number | null): Promise<void> {
    return new Promise((resolve) => {
      this.userService.getDistrictsByState(stateId).subscribe(districts => {
        this.districts = districts;
        this.userForm.patchValue({ state_id: stateId, district_id: districtId });
        resolve();
      });
    });
  }
  loadProjects(districtId: number, project: string | null): Promise<void> {
    return new Promise((resolve) => {
      this.userService.getProjectsByDistrict(districtId).subscribe(projects => {
        this.projects = projects;
        this.userForm.patchValue({ district_id: districtId, project: project });
        resolve();
      });
    });
  }
  loadSectors(districtId: number, project: string, sector: string | null): Promise<void> {
    return new Promise((resolve) => {
      this.userService.getSectorsByProject(districtId, project).subscribe(sectors => {
        this.sectors = sectors;
        this.userForm.patchValue({ project: project, sector: sector });
        resolve();
      });
    });
  }
  loadAnganwadiCenters(districtId: number, project: string, sector: string, anganwadi_id: number | null): Promise<void> {
    return new Promise((resolve) => {
      this.userService.getAnganwadiCenters().subscribe(centers => {
        this.anganwadiCenters = centers.filter(center =>
          center.district_id === districtId &&
          center.project === project &&
          center.sector === sector
        );
        this.userForm.patchValue({ sector: sector, anganwadi_id: anganwadi_id });
        resolve();
      });
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
    const locationFields = ['country_id', 'state_id', 'district_id', 'project', 'sector', 'anganwadi_id'];

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
      anganwadi_id: null
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
          this.logger.error('Error loading states:', error);
        }
      });
    }
    if (!this.isLoadingUserData) { // <-- Only reset if not loading user data
      this.userForm.patchValue({
        state_id: null,
        district_id: null,
        project: null,
        sector: null,
        anganwadi_id: null
      });
      this.districts = [];
      this.projects = [];
      this.sectors = [];
      this.anganwadiCenters = [];
    }
  }

  onStateChange(stateId: number) {
    if (stateId) {
      this.userService.getDistrictsByState(stateId).subscribe({
        next: (districts) => {
          this.districts = districts;
        },
        error: (error) => {
          this.logger.error('Error loading districts:', error);
        }
      });
    }
    if (!this.isLoadingUserData) { // <-- Only reset if not loading user data
      this.userForm.patchValue({
        district_id: null,
        project: null,
        sector: null,
        anganwadi_id: null
      });
      this.projects = [];
      this.sectors = [];
      this.anganwadiCenters = [];
    }
  }

  onDistrictChange(districtId: number) {
    if (districtId) {
      this.userService.getProjectsByDistrict(districtId).subscribe({
        next: (projects) => {
          this.projects = projects;
        },
        error: (error) => {
          this.logger.error('Error loading projects:', error);
        }
      });
    }
    if (!this.isLoadingUserData) { // <-- Only reset if not loading user data
      this.userForm.patchValue({
        project: null,
        sector: null,
        anganwadi_id: null
      });
      this.sectors = [];
      this.anganwadiCenters = [];
    }
  }

  onProjectChange(project: string) {
    const districtId = this.userForm.get('district_id')?.value;
    if (project && districtId) {
      this.userService.getSectorsByProject(districtId, project).subscribe({
        next: (sectors) => {
          this.sectors = sectors;
        },
        error: (error) => {
          this.logger.error('Error loading sectors:', error);
        }
      });
    }
    if (!this.isLoadingUserData) { // <-- Only reset if not loading user data
      this.userForm.patchValue({
        sector: null,
        anganwadi_id: null
      });
      this.anganwadiCenters = [];
    }
  }

  onSectorChange(sector: string) {
    const districtId = this.userForm.get('district_id')?.value;
    const project = this.userForm.get('project')?.value;

    if (sector && districtId && project) {
      // Use the new API endpoint to get all anganwadi centers
      this.userService.getAnganwadiCenters().subscribe({
        next: (centers) => {
          // Filter centers by district, project and sector
          this.anganwadiCenters = centers.filter(center =>
            center.district_id === districtId &&
            center.project === project &&
            center.sector === sector
          );
        },
        error: (error) => {
          this.logger.error('Error loading anganwadi centers:', error);
        }
      });
    }
    if (!this.isLoadingUserData) { // <-- Only reset if not loading user data
      this.userForm.patchValue({
        anganwadi_id: null
      });
    }
  }

  isFieldRequired(fieldName: string): boolean {
    return this.currentRequiredFields.includes(fieldName);
  }

  onSubmit() {
    if (this.userForm.valid) {
      this.isLoading = true;

      // Create a properly formatted request object
      const formData: any = {
        name: this.userForm.get('name')?.value,
        email: this.userForm.get('email')?.value,
        role: this.userForm.get('role')?.value,
        gender: this.userForm.get('gender')?.value
      };

      // Add password if provided (required for new users, optional for edit)
      const password = this.userForm.get('password')?.value;
      if (password) {
        formData.password = password;
      } else if (!this.isEditMode) {
        // Password is required for new users
        formData.password = '';
      }

      // Add location fields if required by role
      if (this.currentRequiredFields.includes('country_id') && this.userForm.get('country_id')?.value) {
        formData.country_id = Number(this.userForm.get('country_id')?.value);
      }

      if (this.currentRequiredFields.includes('state_id') && this.userForm.get('state_id')?.value) {
        formData.state_id = Number(this.userForm.get('state_id')?.value);
      }

      if (this.currentRequiredFields.includes('district_id') && this.userForm.get('district_id')?.value) {
        formData.district_id = Number(this.userForm.get('district_id')?.value);
      }

      if (this.currentRequiredFields.includes('project') && this.userForm.get('project')?.value) {
        formData.project = this.userForm.get('project')?.value;
      }

      if (this.currentRequiredFields.includes('sector') && this.userForm.get('sector')?.value) {
        formData.sector = this.userForm.get('sector')?.value;
      }

      if (this.currentRequiredFields.includes('anganwadi_id') && this.userForm.get('anganwadi_id')?.value) {
        // API expects anganwadi_id as a number (BIGINT in the database)
        formData.anganwadi_id = Number(this.userForm.get('anganwadi_id')?.value);
      }

      this.logger.log('Submitting user data:', formData);

      const operation = this.isEditMode && this.userId
        ? this.userService.updateUser(this.userId, formData)
        : this.userService.createUser(formData);

      operation.subscribe({
        next: (response) => {
          this.logger.log('User operation successful, attempting to go back.');

          // Show success message with the user's name
          const userName = this.userForm.get('name')?.value;
          if (this.isEditMode) {
            this.messageService.add({
              severity: 'success',
              summary: 'User Updated',
              detail: `User ${userName} has been successfully updated`,
              life: 3000
            });
          } else {
            this.messageService.add({
              severity: 'success',
              summary: 'User Created',
              detail: `User ${userName} has been successfully created`,
              life: 3000
            });
          }

          this.isLoading = false;
          this.goBack();
        },
        error: (error) => {
          this.isLoading = false;
          this.logger.error('Error saving user:', error);
          this.logger.error('Error details:', error.error);

          this.errorHandler.handleError(error, this.isEditMode ? 'user-edit' : 'user-create').subscribe();
        }
      });
    }
  }

  goBack() {
    this.logger.log('goBack called, navigating to /admin/users');
    this.router.navigate(['/admin/users']);
  }
}