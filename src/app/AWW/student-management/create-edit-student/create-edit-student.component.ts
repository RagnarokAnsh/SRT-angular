import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { StudentService, Anganwadi } from '../student.service';
import { HttpClient } from '@angular/common/http';
import { UserService } from '../../../services/user.service';

@Component({
  selector: 'app-create-edit-student',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSelectModule
  ],
  template: `
    <div class="card">
      <div class="card-body">
        <h2 class="heading-heading mb-4">
          <span class="heading-highlight">{{isEditMode ? 'Edit' : 'Add'}}</span> Student
        </h2>
        
        <div *ngIf="isLoading" class="text-center my-4">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
          <p class="mt-2">Loading data...</p>
        </div>

        <form [formGroup]="studentForm" (ngSubmit)="onSubmit()" *ngIf="!isLoading">
          <div class="row">
            <div class="col-md-6 mb-3">
              <mat-form-field appearance="outline" class="w-100">
                <mat-label>First Name</mat-label>
                <input matInput formControlName="firstName" placeholder="Enter first name">
                <mat-error *ngIf="studentForm.get('firstName')?.hasError('required')">
                  First name is required
                </mat-error>
              </mat-form-field>
            </div>

            <div class="col-md-6 mb-3">
              <mat-form-field appearance="outline" class="w-100">
                <mat-label>Last Name</mat-label>
                <input matInput formControlName="lastName" placeholder="Enter last name">
                <mat-error *ngIf="studentForm.get('lastName')?.hasError('required')">
                  Last name is required
                </mat-error>
              </mat-form-field>
            </div>

            <div class="col-md-6 mb-3">
              <mat-form-field appearance="outline" class="w-100">
                <mat-label>Date of Birth</mat-label>
                <input matInput [matDatepicker]="picker" formControlName="dateOfBirth">
                <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
                <mat-datepicker #picker></mat-datepicker>
                <mat-error *ngIf="studentForm.get('dateOfBirth')?.hasError('required')">
                  Date of birth is required
                </mat-error>
              </mat-form-field>
            </div>

            <div class="col-md-6 mb-3">
              <mat-form-field appearance="outline" class="w-100">
                <mat-label>Symbol</mat-label>
                <input matInput formControlName="symbol" placeholder="Enter symbol">
                <mat-error *ngIf="studentForm.get('symbol')?.hasError('required')">
                  Symbol is required
                </mat-error>
              </mat-form-field>
            </div>

            <div class="col-md-6 mb-3">
              <mat-form-field appearance="outline" class="w-100">
                <mat-label>Height (cm)</mat-label>
                <input matInput type="number" formControlName="height" placeholder="Enter height">
                <mat-error *ngIf="studentForm.get('height')?.hasError('required')">
                  Height is required
                </mat-error>
                <mat-error *ngIf="studentForm.get('height')?.hasError('min')">
                  Height must be greater than 0
                </mat-error>
              </mat-form-field>
            </div>

            <div class="col-md-6 mb-3">
              <mat-form-field appearance="outline" class="w-100">
                <mat-label>Weight (kg)</mat-label>
                <input matInput type="number" formControlName="weight" placeholder="Enter weight">
                <mat-error *ngIf="studentForm.get('weight')?.hasError('required')">
                  Weight is required
                </mat-error>
                <mat-error *ngIf="studentForm.get('weight')?.hasError('min')">
                  Weight must be greater than 0
                </mat-error>
              </mat-form-field>
            </div>

            <div class="col-md-6 mb-3">
              <mat-form-field appearance="outline" class="w-100">
                <mat-label>Language</mat-label>
                <input matInput formControlName="language" placeholder="Enter language">
                <mat-error *ngIf="studentForm.get('language')?.hasError('required')">
                  Language is required
                </mat-error>
              </mat-form-field>
            </div>

            <div class="col-md-6 mb-3">
              <mat-form-field appearance="outline" class="w-100">
                <mat-label>Anganwadi Center</mat-label>
                <input matInput [value]="currentAnganwadiName" readonly>
                <mat-hint *ngIf="!isEditMode">Student will be assigned to your center</mat-hint>
              </mat-form-field>
              <!-- Hidden field to store the anganwadi ID -->
              <input type="hidden" formControlName="anganwadiId">
            </div>

            <div class="col-md-6 mb-3">
              <mat-form-field appearance="outline" class="w-100">
                <mat-label>Assigned Worker</mat-label>
                <input matInput [value]="currentUserName" readonly>
                <mat-hint *ngIf="!isEditMode">Student will be assigned to you</mat-hint>
              </mat-form-field>
              <!-- Hidden field to store the AWW ID -->
              <input type="hidden" formControlName="awwId">
            </div>
          </div>

          <div class="d-flex justify-content-end gap-2 mt-4">
            <button class="btn btn-primary" type="button" (click)="goBack()">Cancel</button>
            <button type="submit" [disabled]="studentForm.invalid" class="btn btn-primary">
              {{isEditMode ? 'Update' : 'Create'}} Student
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: []
})
export class CreateEditStudentComponent implements OnInit {
  studentForm: FormGroup;
  isEditMode = false;
  studentId: number | null = null;
  anganwadiCenters: Anganwadi[] = [];
  isLoading = true;
  currentAnganwadiId: number | null = null;
  currentAnganwadiName: string = 'Your Anganwadi Center';
  currentUserName: string = 'You';
  currentUserId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private studentService: StudentService,
    private http: HttpClient,
    private userService: UserService
  ) {
    this.studentForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      dateOfBirth: ['', Validators.required],
      symbol: ['', Validators.required],
      height: ['', [Validators.required, Validators.min(0)]],
      weight: ['', [Validators.required, Validators.min(0)]],
      language: ['', Validators.required],
      anganwadiId: ['', Validators.required],
      awwId: [''] // This will be set to the current user's ID
    });
    
    // Get current user information
    const currentUser = this.userService.getCurrentUser();
    if (currentUser) {
      this.currentUserId = currentUser.id;
      this.currentUserName = currentUser.name || 'You';
      this.studentForm.patchValue({ awwId: this.currentUserId });
      
      // If the user has an anganwadi_id field, use it to set the anganwadi ID in the form
      if (currentUser.anganwadi_id) {
        this.currentAnganwadiId = currentUser.anganwadi_id;
        this.studentForm.patchValue({ anganwadiId: currentUser.anganwadi_id });
      }
      
      // If the user has an anganwadi object, use it to set the anganwadi name
      if (currentUser.anganwadi && currentUser.anganwadi.name) {
        this.currentAnganwadiName = currentUser.anganwadi.name;
      }
    }
  }

  ngOnInit() {
    this.isLoading = true;
    
    // Get the current user's anganwadi center ID first
    this.studentService.getCurrentUserAnganwadiId().subscribe({
      next: (anganwadiId) => {
        if (anganwadiId) {
          this.currentAnganwadiId = anganwadiId;
          // Set the anganwadi ID in the form
          this.studentForm.patchValue({ anganwadiId: anganwadiId });
          
          // Load the anganwadi centers to get the name of the current center
          this.loadAnganwadiCenters();
          
          // If in edit mode, load the student data
          const id = this.route.snapshot.paramMap.get('id');
          if (id) {
            this.isEditMode = true;
            this.studentId = +id;
            this.loadStudentData(this.studentId);
          } else {
            this.isLoading = false;
          }
        } else {
          console.error('No anganwadi center ID found for the current user');
          this.isLoading = false;
        }
      },
      error: (error) => {
        console.error('Error getting current user anganwadi ID:', error);
        this.isLoading = false;
      }
    });
  }
  
  loadAnganwadiCenters() {
    this.http.get<Anganwadi[]>('http://3.111.249.111/sribackend/api/anganwadi-centers')
      .subscribe({
        next: (centers) => {
          this.anganwadiCenters = centers;
          
          // Find the current anganwadi center to display its name
          if (this.currentAnganwadiId) {
            const currentCenter = centers.find(center => center.id === this.currentAnganwadiId);
            if (currentCenter) {
              this.currentAnganwadiName = currentCenter.name;
            }
          }
          
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading anganwadi centers:', error);
          this.isLoading = false;
        }
      });
  }

  loadStudentData(id: number) {
    this.studentService.getStudent(id).subscribe(
      student => {
        this.studentForm.patchValue(student);
      },
      error => {
        console.error('Error loading student:', error);
        this.goBack();
      }
    );
  }

  onSubmit() {
    if (this.studentForm.valid) {
      const studentData = this.studentForm.value;
      console.log('Form data being submitted:', studentData);
      
      // Make sure anganwadiId is a number
      if (studentData.anganwadiId && typeof studentData.anganwadiId === 'string') {
        studentData.anganwadiId = parseInt(studentData.anganwadiId, 10);
      }
      
      if (this.isEditMode && this.studentId) {
        this.studentService.updateStudent(this.studentId, studentData).subscribe({
          next: (response) => {
            console.log('Update successful:', response);
            this.goBack();
          },
          error: (error) => {
            console.error('Error updating student:', error);
            alert(`Failed to update student: ${error.message || 'Unknown error'}`);
          }
        });
      } else {
        console.log('Creating new student with data:', studentData);
        this.studentService.createStudent(studentData).subscribe({
          next: (response) => {
            console.log('Create successful:', response);
            this.goBack();
          },
          error: (error) => {
            console.error('Error creating student:', error);
            alert(`Failed to create student: ${error.message || 'Unknown error'}`);
          }
        });
      }
    } else {
      console.error('Form is invalid:', this.studentForm.errors);
      // Mark all form controls as touched to show validation errors
      Object.keys(this.studentForm.controls).forEach(key => {
        const control = this.studentForm.get(key);
        control?.markAsTouched();
        console.log(`Form control ${key} errors:`, control?.errors);
      });
    }
  }

  goBack() {
    this.router.navigate(['/students']);
  }
} 