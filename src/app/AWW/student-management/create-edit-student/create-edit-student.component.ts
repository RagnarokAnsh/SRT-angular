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
import { StudentService } from '../student.service';

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
    MatNativeDateModule
  ],
  template: `
    <div class="card">
      <div class="card-body">
        <h2 class="heading-heading mb-4">
          <span class="heading-highlight">{{isEditMode ? 'Edit' : 'Add'}}</span> Student
        </h2>

        <form [formGroup]="studentForm" (ngSubmit)="onSubmit()">
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

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private studentService: StudentService
  ) {
    this.studentForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      dateOfBirth: ['', Validators.required],
      symbol: ['', Validators.required],
      height: ['', [Validators.required, Validators.min(0)]],
      weight: ['', [Validators.required, Validators.min(0)]],
      language: ['', Validators.required]
    });
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.studentId = +id;
      this.loadStudentData(this.studentId);
    }
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
      if (this.isEditMode && this.studentId) {
        this.studentService.updateStudent(this.studentId, studentData).subscribe(
          () => this.goBack(),
          error => console.error('Error updating student:', error)
        );
      } else {
        this.studentService.createStudent(studentData).subscribe(
          () => this.goBack(),
          error => console.error('Error creating student:', error)
        );
      }
    }
  }

  goBack() {
    this.router.navigate(['/students']);
  }
} 