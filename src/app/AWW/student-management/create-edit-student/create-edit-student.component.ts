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

import { MessageService } from 'primeng/api';
import { ErrorHandlerService } from '../../../core/error/error-handler.service';
import { SkeletonLoaderComponent } from '../../../components/skeleton-loader';
import { LoggerService } from '../../../core/logger.service';

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
    MatSelectModule,
    SkeletonLoaderComponent
  ],
  templateUrl: './create-edit-student.component.html',
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
    private userService: UserService,
    private messageService: MessageService,
    private errorHandler: ErrorHandlerService,
    private logger: LoggerService
  ) {
    this.studentForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      dateOfBirth: ['', Validators.required],
      symbol: ['', Validators.required],
      height: ['', [Validators.required, Validators.min(0)]],
      weight: ['', [Validators.required, Validators.min(0)]],
      language: ['', Validators.required],
      gender: ['', Validators.required],
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

    // currentAnganwadiId and currentAnganwadiName are primarily set in the constructor.
    if (this.userService.isAWW()) {
      if (this.currentAnganwadiId) {
        this.studentForm.patchValue({ anganwadiId: this.currentAnganwadiId });
        this.studentForm.get('anganwadiId')?.disable();
        // If currentAnganwadiName is already set from constructor, great.
        // loadAnganwadiCenters will still run to populate the list for other roles
        // or if the name wasn't on the currentUser object.anganwadi.name.
      } else {
        // This means an AWW user does not have an anganwadi_id from the constructor.
        this.logger.error("CreateEditStudentComponent (ngOnInit): AWW user's anganwadi center ID is missing. This is a data issue.");
        this.messageService.add({
          severity: 'error',
          summary: 'Configuration Error',
          detail: 'Your anganwadi center information is missing. This is required to manage students. Please contact support.',
          life: 5000
        });
        this.studentForm.get('anganwadiId')?.disable(); // Disable to prevent interaction
      }
    }

    // Load all anganwadi centers. For non-AWWs, this populates the dropdown.
    // For AWWs, it can help confirm the name if not available on currentUser.anganwadi.name.
    // loadAnganwadiCenters handles setting isLoading to false on its own.
    this.loadAnganwadiCenters(); 

    // Check if we are in edit mode
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.isEditMode = true;
      this.studentId = +idParam;
      this.loadStudentData(this.studentId); 
    } else {
      // In create mode. If not loading centers (e.g., if loadAnganwadiCenters completed very fast or errored before setting isLoading = false),
      // ensure isLoading is false. However, loadAnganwadiCenters should robustly handle this.
      // If not loading anything else, and not in edit mode, then isLoading should be false.
      // This explicit set is a safeguard if loadAnganwadiCenters hasn't set it.
      // However, it's better if loadAnganwadiCenters always finalizes isLoading.
      // For now, we rely on loadAnganwadiCenters to set isLoading = false.
      // If we reach here and isLoading is still true, it implies loadAnganwadiCenters is still running or errored without setting it.
    }
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
          this.logger.error('Error loading anganwadi centers:', error);
          this.isLoading = false;
        }
      });
  }

  loadStudentData(id: number) {
    this.studentService.getStudent(id).subscribe({
      next: (student) => {
        this.studentForm.patchValue(student);
        this.messageService.add({
          severity: 'info',
          summary: 'Student Loaded',
          detail: `Successfully loaded student data`,
          life: 3000
        });
      },
      error: (error) => {
        this.logger.error('Error loading student:', error);
        // Error toast is already handled in the service, do not call errorHandler here
        this.goBack();
      }
    });
  }

  onSubmit() {
    if (this.studentForm.valid) {
      const studentData = this.studentForm.value;
      this.logger.log('Form data being submitted:', studentData);
      
      // Make sure anganwadiId is a number
      if (studentData.anganwadiId && typeof studentData.anganwadiId === 'string') {
        studentData.anganwadiId = parseInt(studentData.anganwadiId, 10);
      }
      
      if (this.isEditMode && this.studentId) {
        this.studentService.updateStudent(this.studentId, studentData).subscribe({
          next: (response) => {
            this.logger.log('Update successful:', response);
            this.messageService.add({
              severity: 'success',
              summary: 'Student Updated',
              detail: `Student ${response.firstName} ${response.lastName}'s information has been successfully updated`,
              life: 3000
            });
            this.goBack();
          },
          error: (error) => {
            this.logger.error('Error updating student:', error);
            // Error toast is already handled in the service, do not call errorHandler here
          }
        });
      } else {
        this.logger.log('Creating new student with data:', studentData);
        this.studentService.createStudent(studentData).subscribe({
          next: (response) => {
            this.logger.log('Create successful:', response);
            this.messageService.add({
              severity: 'success',
              summary: 'Student Created',
              detail: `Student ${response.firstName} ${response.lastName} has been successfully created`,
              life: 3000
            });
            this.goBack();
          },
          error: (error) => {
            this.logger.error('Error creating student:', error);
            // Error toast is already handled in the service, do not call errorHandler here
          }
        });
      }
    } else {
      this.logger.error('Form is invalid:', this.studentForm.errors);
      // Mark all form controls as touched to show validation errors
      Object.keys(this.studentForm.controls).forEach(key => {
        const control = this.studentForm.get(key);
        control?.markAsTouched();
        this.logger.log(`Form control ${key} errors:`, control?.errors);
      });
      
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation Error',
        detail: 'Please fill in all required fields correctly',
        life: 5000
      });
    }
  }

  goBack() {
    this.router.navigate(['/students']);
  }
} 