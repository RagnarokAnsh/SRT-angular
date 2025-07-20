import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { Student, StudentService } from '../student.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-create-edit-student',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCardModule,
    MatIconModule
  ],
  templateUrl: './create-edit-student.component.html',
  styleUrls: ['./create-edit-student.component.scss']
})
export class CreateEditStudentComponent implements OnInit {
  
  studentForm: FormGroup;
  isEditMode = false;
  studentId: number | null = null;
  isLoading = false;

  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private studentService = inject(StudentService);
  private toastService = inject(ToastService);

  constructor() {
    this.studentForm = this.fb.group({
      first_name: ['', [Validators.required, Validators.minLength(2)]],
      last_name: ['', [Validators.required, Validators.minLength(2)]],
      date_of_birth: ['', Validators.required],
      gender: ['', Validators.required],
      father_name: ['', Validators.required],
      mother_name: ['', Validators.required],
      address: ['', Validators.required],
      phone_number: ['', [Validators.pattern(/^\d{10}$/)]],
      email: ['', [Validators.email]],
      emergency_contact: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      medical_conditions: [''],
      allergies: [''],
      enrollment_date: ['', Validators.required],
      anganwadi_id: ['', Validators.required]
    });
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.studentId = parseInt(id, 10);
      this.loadStudent();
    }
  }

  private async loadStudent() {
    if (!this.studentId) return;
    
    try {
      this.isLoading = true;
      const student = await this.studentService.getStudentById(this.studentId).toPromise();
      if (student) {
        this.populateForm(student);
      }
    } catch (error) {
      console.error('Error loading student:', error);
      this.toastService.error('Failed to load student data. Please try again.');
    } finally {
      this.isLoading = false;
    }
  }

  private populateForm(student: Student) {
    this.studentForm.patchValue({
      first_name: student.first_name,
      last_name: student.last_name,
      date_of_birth: new Date(student.date_of_birth),
      gender: student.gender,
      father_name: student.father_name,
      mother_name: student.mother_name,
      address: student.address,
      phone_number: student.phone_number,
      email: student.email,
      emergency_contact: student.emergency_contact,
      medical_conditions: student.medical_conditions,
      allergies: student.allergies,
      enrollment_date: new Date(student.enrollment_date),
      anganwadi_id: student.anganwadi_id
    });
  }

  async onSubmit() {
    if (this.studentForm.valid) {
      try {
        this.isLoading = true;
        const formData = this.prepareFormData();
        
        if (this.isEditMode && this.studentId) {
          await this.studentService.updateStudent(this.studentId, formData).toPromise();
          this.toastService.formSuccess('Student updated successfully!');
        } else {
          await this.studentService.createStudent(formData).toPromise();
          this.toastService.formSuccess('Student created successfully!');
        }
        
        this.router.navigate(['/students']);
        
      } catch (error) {
        console.error('Error saving student:', error);
        this.toastService.error(
          this.isEditMode ? 'Failed to update student. Please try again.' : 'Failed to create student. Please try again.'
        );
      } finally {
        this.isLoading = false;
      }
    } else {
      this.markFormGroupTouched();
      this.toastService.validationError('Please fill in all required fields correctly.');
    }
  }

  private prepareFormData(): Partial<Student> {
    const formValue = this.studentForm.value;
    return {
      ...formValue,
      date_of_birth: formValue.date_of_birth?.toISOString?.() || formValue.date_of_birth,
      enrollment_date: formValue.enrollment_date?.toISOString?.() || formValue.enrollment_date
    };
  }

  private markFormGroupTouched() {
    Object.keys(this.studentForm.controls).forEach(key => {
      const control = this.studentForm.get(key);
      control?.markAsTouched();
    });
  }

  onCancel() {
    this.router.navigate(['/students']);
  }

  getErrorMessage(fieldName: string): string {
    const control = this.studentForm.get(fieldName);
    if (control?.errors && control.touched) {
      if (control.errors['required']) {
        return `${this.getFieldDisplayName(fieldName)} is required`;
      }
      if (control.errors['minlength']) {
        return `${this.getFieldDisplayName(fieldName)} must be at least ${control.errors['minlength'].requiredLength} characters`;
      }
      if (control.errors['pattern']) {
        if (fieldName === 'phone_number' || fieldName === 'emergency_contact') {
          return 'Please enter a valid 10-digit phone number';
        }
        return 'Please enter a valid format';
      }
      if (control.errors['email']) {
        return 'Please enter a valid email address';
      }
    }
    return '';
  }

  private getFieldDisplayName(fieldName: string): string {
    const displayNames: { [key: string]: string } = {
      first_name: 'First Name',
      last_name: 'Last Name',
      date_of_birth: 'Date of Birth',
      gender: 'Gender',
      father_name: 'Father\'s Name',
      mother_name: 'Mother\'s Name',
      address: 'Address',
      phone_number: 'Phone Number',
      email: 'Email',
      emergency_contact: 'Emergency Contact',
      enrollment_date: 'Enrollment Date',
      anganwadi_id: 'Anganwadi'
    };
    return displayNames[fieldName] || fieldName;
  }
} 