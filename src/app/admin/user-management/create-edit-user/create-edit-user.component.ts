import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { User } from '../user.service';
import { ToastService } from '../../../services/toast.service';

interface AnganwadiCenter {
  id: number;
  name: string;
  address: string;
  aww_id?: number;
}

interface CreateUserRequest {
  name: string;
  email: string;
  password?: string;
  role: string;
  anganwadi_id?: number;
}

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
    MatSelectModule
  ],
  templateUrl: './create-edit-user.component.html',
  styleUrls: ['./create-edit-user.component.scss']
})
export class CreateEditUserComponent implements OnInit {
  
  userForm: FormGroup;
  isEditMode = false;
  userId: number | null = null;
  anganwadiCenters: AnganwadiCenter[] = [];
  isLoading = false;
  availableAnganwadiCenters: AnganwadiCenter[] = [];
  roles = [
    { value: 'admin', label: 'Admin' },
    { value: 'aww', label: 'Anganwadi Worker' },
    { value: 'supervisor', label: 'Supervisor' }
  ];

  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toastService = inject(ToastService);

  constructor() {
    this.userForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      role: ['', Validators.required],
      anganwadi_id: ['']
    });
  }

  ngOnInit() {
    this.loadAnganwadiCenters();
    
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.userId = parseInt(id, 10);
      this.userForm.get('password')?.clearValidators();
      this.userForm.get('password')?.updateValueAndValidity();
      this.loadUser();
    }

    // Watch role changes to manage anganwadi_id requirement
    this.userForm.get('role')?.valueChanges.subscribe(role => {
      const anganwadiControl = this.userForm.get('anganwadi_id');
      if (role === 'aww') {
        anganwadiControl?.setValidators([Validators.required]);
      } else {
        anganwadiControl?.clearValidators();
      }
      anganwadiControl?.updateValueAndValidity();
      this.updateAvailableAnganwadiCenters();
    });
  }

  private async loadAnganwadiCenters() {
    try {
      this.isLoading = true;
      // Replace with actual API call
      // const centers = await this.anganwadiService.getAnganwadiCenters().toPromise();
      // this.anganwadiCenters = centers || [];
      this.anganwadiCenters = []; // Placeholder
      this.updateAvailableAnganwadiCenters();
    } catch (error) {
      console.error('Error loading anganwadi centers:', error);
      this.toastService.error('Failed to load anganwadi centers.');
    } finally {
      this.isLoading = false;
    }
  }

  private updateAvailableAnganwadiCenters() {
    const selectedRole = this.userForm.get('role')?.value;
    if (selectedRole === 'aww') {
      // Show only centers without an assigned AWW
      this.availableAnganwadiCenters = this.anganwadiCenters.filter(center => 
        !center.aww_id || (this.isEditMode && center.aww_id === this.userId)
      );
    } else {
      this.availableAnganwadiCenters = [];
    }
  }

  private async loadUser() {
    if (!this.userId) return;
    
    try {
      this.isLoading = true;
      // Replace with actual API call
      // const user = await this.userService.getUserById(this.userId).toPromise();
      // if (user) {
      //   this.populateForm(user);
      // }
    } catch (error) {
      console.error('Error loading user:', error);
      this.toastService.error('Failed to load user data. Please try again.');
    } finally {
      this.isLoading = false;
    }
  }

  private populateForm(user: User) {
    this.userForm.patchValue({
      name: user.name,
      email: user.email,
      role: user.role,
      anganwadi_id: user.anganwadi_id
    });
  }

  async onSubmit() {
    if (this.userForm.valid) {
      try {
        this.isLoading = true;
        const formData = this.prepareFormData();
        
        if (this.isEditMode && this.userId) {
          // await this.userService.updateUser(this.userId, formData).toPromise();
          this.toastService.formSuccess('User updated successfully!');
        } else {
          // await this.userService.createUser(formData).toPromise();
          this.toastService.formSuccess('User created successfully!');
        }
        
        this.router.navigate(['/admin/users']);
        
      } catch (error) {
        console.error('Error saving user:', error);
        if (error instanceof Error && error.message.includes('email already exists')) {
          this.toastService.validationError('Email address is already in use. Please choose a different email.');
        } else {
          this.toastService.error(
            this.isEditMode ? 'Failed to update user. Please try again.' : 'Failed to create user. Please try again.'
          );
        }
      } finally {
        this.isLoading = false;
      }
    } else {
      this.markFormGroupTouched();
      this.toastService.validationError('Please fill in all required fields correctly.');
    }
  }

  private prepareFormData(): CreateUserRequest {
    const formValue = this.userForm.value;
    const data: CreateUserRequest = {
      name: formValue.name,
      email: formValue.email,
      role: formValue.role
    };

    if (!this.isEditMode && formValue.password) {
      data.password = formValue.password;
    }

    if (formValue.role === 'aww' && formValue.anganwadi_id) {
      data.anganwadi_id = formValue.anganwadi_id;
    }

    return data;
  }

  private markFormGroupTouched() {
    Object.keys(this.userForm.controls).forEach(key => {
      const control = this.userForm.get(key);
      control?.markAsTouched();
    });
  }

  onCancel() {
    this.router.navigate(['/admin/users']);
  }

  getErrorMessage(fieldName: string): string {
    const control = this.userForm.get(fieldName);
    if (control?.errors && control.touched) {
      if (control.errors['required']) {
        return `${this.getFieldDisplayName(fieldName)} is required`;
      }
      if (control.errors['minlength']) {
        const requiredLength = control.errors['minlength'].requiredLength;
        return `${this.getFieldDisplayName(fieldName)} must be at least ${requiredLength} characters`;
      }
      if (control.errors['email']) {
        return 'Please enter a valid email address';
      }
    }
    return '';
  }

  private getFieldDisplayName(fieldName: string): string {
    const displayNames: { [key: string]: string } = {
      name: 'Name',
      email: 'Email',
      password: 'Password',
      role: 'Role',
      anganwadi_id: 'Anganwadi Center'
    };
    return displayNames[fieldName] || fieldName;
  }

  shouldShowAnganwadiField(): boolean {
    return this.userForm.get('role')?.value === 'aww';
  }
}