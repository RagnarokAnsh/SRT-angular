import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
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
  
  // Date picker constraints
  minDate: Date = new Date();
  maxDate: Date = new Date();
  defaultDate: Date = new Date();


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
      firstName: ['', [
        Validators.required,
        this.createNameValidator('First name')
      ]],
      lastName: ['', [
        Validators.required,
        this.createNameValidator('Last name')
      ]],
      dateOfBirth: ['', [
        Validators.required,
        this.createDateRangeValidator()
      ]],
      symbol: ['', [
        Validators.required,
        this.createSymbolValidator()
      ]],
      height: ['', [
        Validators.required,
        this.createHeightValidator()
      ]],
      weight: ['', [
        Validators.required,
        this.createWeightValidator()
      ]],
      language: ['', [
        Validators.required,
        this.createLanguageValidator()
      ]],
      gender: ['', Validators.required],
      anganwadiId: ['', Validators.required],
      awwId: [''] // This will be set to the current user's ID
    });
    
    // Initialize date constraints
    this.initializeDateConstraints();
    
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

  // Reactive Validators with detailed error messages
  
  private createNameValidator(fieldName: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      
      const value = control.value.toString().trim();
      
      if (value.length < 2) {
        return { minLength: { message: `${fieldName} must be at least 2 characters long` } };
      }
      
      if (value.length > 50) {
        return { maxLength: { message: `${fieldName} cannot exceed 50 characters` } };
      }
      
      if (!/^[a-zA-Z\s]+$/.test(value)) {
        return { pattern: { message: `${fieldName} should contain only letters and spaces` } };
      }
      
      if (/^\s+$/.test(value)) {
        return { whitespace: { message: `${fieldName} cannot be only spaces` } };
      }
      
      return null;
    };
  }
  
  private createDateRangeValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;

      const selectedDate = new Date(control.value);
      const today = new Date();
      const minDate = new Date();
      const maxDate = new Date();
      
      // Set age range: 2-6 years old
      minDate.setFullYear(today.getFullYear() - 6);
      maxDate.setFullYear(today.getFullYear() - 2);
      
      if (isNaN(selectedDate.getTime())) {
        return { invalidDate: { message: 'Please enter a valid date' } };
      }
      
      if (selectedDate > today) {
        return { futureDate: { message: 'Birth date cannot be in the future' } };
      }
      
      if (selectedDate < minDate) {
        return { tooOld: { message: 'Child must be younger than 6 years old' } };
      }
      
      if (selectedDate > maxDate) {
        return { tooYoung: { message: 'Child must be at least 2 years old' } };
      }
      
      return null;
    };
  }
  
  private createSymbolValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      
      const value = control.value.toString().trim();
      
      if (value.length < 1) {
        return { minLength: { message: 'Symbol is required' } };
      }
      
      if (value.length > 10) {
        return { maxLength: { message: 'Symbol cannot exceed 10 characters' } };
      }
      
      if (/^\s+$/.test(value)) {
        return { whitespace: { message: 'Symbol cannot be only spaces' } };
      }
      
      return null;
    };
  }
  
  private createHeightValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      
      const value = parseFloat(control.value);
      
      if (isNaN(value)) {
        return { pattern: { message: 'Height must be a valid number' } };
      }
      
      if (value < 30) {
        return { min: { message: 'Height must be at least 30 cm' } };
      }
      
      if (value > 200) {
        return { max: { message: 'Height cannot exceed 200 cm' } };
      }
      
      if (!/^\d+(\.\d{1,2})?$/.test(control.value.toString())) {
        return { pattern: { message: 'Height can have maximum 2 decimal places' } };
      }
      
      return null;
    };
  }
  
  private createWeightValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      
      const value = parseFloat(control.value);
      
      if (isNaN(value)) {
        return { pattern: { message: 'Weight must be a valid number' } };
      }
      
      if (value < 5) {
        return { min: { message: 'Weight must be at least 5 kg' } };
      }
      
      if (value > 50) {
        return { max: { message: 'Weight cannot exceed 50 kg' } };
      }
      
      if (!/^\d+(\.\d{1,2})?$/.test(control.value.toString())) {
        return { pattern: { message: 'Weight can have maximum 2 decimal places' } };
      }
      
      return null;
    };
  }
  
  private createLanguageValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      
      const value = control.value.toString().trim();
      
      if (value.length < 2) {
        return { minLength: { message: 'Home language must be at least 2 characters long' } };
      }
      
      if (value.length > 30) {
        return { maxLength: { message: 'Home language cannot exceed 30 characters' } };
      }
      
      if (!/^[a-zA-Z\s]+$/.test(value)) {
        return { pattern: { message: 'Home language should contain only letters and spaces' } };
      }
      
      if (/^\s+$/.test(value)) {
        return { whitespace: { message: 'Home language cannot be only spaces' } };
      }
      
      return null;
    };
  }

  // Enhanced method to get readable error messages from reactive validators
  getFieldError(fieldName: string): string | null {
    const field = this.studentForm.get(fieldName);
    if (field?.errors && (field.touched || field.dirty)) {
      const errors = field.errors;
      
      // Handle required validation first
      if (errors['required']) {
        return `${this.getFieldDisplayName(fieldName)} is required`;
      }
      
      // Handle all possible error types systematically
      const errorKeys = Object.keys(errors);
      
      for (const errorKey of errorKeys) {
        const errorValue = errors[errorKey];
        
        // First check if it's our custom error with message property
        if (errorValue && typeof errorValue === 'object' && errorValue.message) {
          return errorValue.message;
        }
        
        // Handle built-in Angular validators
        if (errorKey === 'min' && errorValue && typeof errorValue === 'object') {
          if (fieldName === 'height') return 'Height must be at least 30 cm';
          if (fieldName === 'weight') return 'Weight must be at least 5 kg';
          return `Minimum value is ${errorValue.min}`;
        }
        
        if (errorKey === 'max' && errorValue && typeof errorValue === 'object') {
          if (fieldName === 'height') return 'Height cannot exceed 200 cm';
          if (fieldName === 'weight') return 'Weight cannot exceed 50 kg';
          return `Maximum value is ${errorValue.max}`;
        }
        
        if (errorKey === 'minlength' && errorValue && typeof errorValue === 'object') {
          return `${this.getFieldDisplayName(fieldName)} must be at least ${errorValue.requiredLength} characters`;
        }
        
        if (errorKey === 'maxlength' && errorValue && typeof errorValue === 'object') {
          return `${this.getFieldDisplayName(fieldName)} cannot exceed ${errorValue.requiredLength} characters`;
        }
        
        if (errorKey === 'pattern') {
          if (fieldName === 'firstName' || fieldName === 'lastName') {
            return `${this.getFieldDisplayName(fieldName)} should contain only letters and spaces`;
          }
          if (fieldName === 'language') {
            return 'Home language should contain only letters and spaces';
          }
          if (fieldName === 'height' || fieldName === 'weight') {
            return `${this.getFieldDisplayName(fieldName)} must be a valid number`;
          }
          return 'Invalid format';
        }
        
        // Handle our custom error types
        switch (errorKey) {
          case 'futureDate':
            return 'Birth date cannot be in the future';
          case 'tooOld':
            return 'Child must be younger than 6 years old';
          case 'tooYoung':
            return 'Child must be at least 2 years old';
          case 'invalidDate':
            return 'Please enter a valid date';
          case 'whitespace':
            return `${this.getFieldDisplayName(fieldName)} cannot be only spaces`;
          case 'email':
            return 'Please enter a valid email address';
        }
      }
      
      // Final fallback
      console.warn(`Unhandled validation error for ${fieldName}:`, errors);
      return `Please check ${this.getFieldDisplayName(fieldName).toLowerCase()}`;
    }
    return null;
  }
  
  // Check if a field has errors
  hasFieldError(fieldName: string): boolean {
    const field = this.studentForm.get(fieldName);
    return !!(field?.errors && (field.touched || field.dirty));
  }
  
  // Check if a field is valid
  isFieldValid(fieldName: string): boolean {
    const field = this.studentForm.get(fieldName);
    return !!(field?.valid && (field.touched || field.dirty) && field.value);
  }

  // Helper method to get display names for fields
  private getFieldDisplayName(fieldName: string): string {
    const displayNames: { [key: string]: string } = {
      firstName: 'First name',
      lastName: 'Last name',
      dateOfBirth: 'Date of birth',
      symbol: 'Symbol',
      height: 'Height',
      weight: 'Weight',
      language: 'Home language',
      gender: 'Gender',
      anganwadiId: 'Anganwadi Center',
      awwId: 'Assigned Worker'
    };
    return displayNames[fieldName] || fieldName;
  }

  // Initialize date picker constraints
  private initializeDateConstraints(): void {
    const today = new Date();
    
    // Set minimum date (6 years ago)
    this.minDate = new Date();
    this.minDate.setFullYear(today.getFullYear() - 6);
    
    // Set maximum date (2 years ago)
    this.maxDate = new Date();
    this.maxDate.setFullYear(today.getFullYear() - 2);
    
    // Set default date (4 years ago - middle of the range)
    this.defaultDate = new Date();
    this.defaultDate.setFullYear(today.getFullYear() - 4);
  }

  // Handle text input to allow only letters and spaces
  onTextInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    const filteredValue = value.replace(/[^a-zA-Z\s]/g, '');
    
    if (value !== filteredValue) {
      input.value = filteredValue;
      // Update the form control with the filtered value
      const controlName = input.getAttribute('formControlName');
      if (controlName) {
        this.studentForm.get(controlName)?.setValue(filteredValue);
      }
    }
  }

  // Handle number input to ensure valid numeric values
  onNumberInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    
    // Allow numbers with up to 2 decimal places
    const numericValue = value.replace(/[^0-9.]/g, '');
    const parts = numericValue.split('.');
    
    let filteredValue = parts[0];
    if (parts.length > 1) {
      filteredValue += '.' + parts[1].substring(0, 2);
    }
    
    if (value !== filteredValue) {
      input.value = filteredValue;
      // Update the form control with the filtered value
      const controlName = input.getAttribute('formControlName');
      if (controlName) {
        this.studentForm.get(controlName)?.setValue(parseFloat(filteredValue) || '');
      }
    }
  }

  goBack() {
    this.router.navigate(['/students']);
  }
} 