import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { UserManagementService } from './user-management.service';
import { User } from './user.interface';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule
  ],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss'
})
export class UsersComponent implements OnInit {
  users: User[] = [];
  userForm: FormGroup;
  isEditing = false;
  selectedUserId: number | null = null;

  constructor(
    private userManagementService: UserManagementService,
    private fb: FormBuilder
  ) {
    this.userForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      role: ['user', Validators.required]
    });
  }

  ngOnInit(): void {
    console.log('UsersComponent initialized');
    this.loadUsers();
  }

  loadUsers(): void {
    // This will be implemented when the API is ready
    // For now, using mock data
    this.users = [
      {
        id: 1,
        name: 'Admin User',
        email: 'admin@example.com',
        role: 'admin',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
  }

  onSubmit(): void {
    if (this.userForm.valid) {
      if (this.isEditing && this.selectedUserId) {
        // Update user
        this.userManagementService.updateUser(this.selectedUserId, this.userForm.value)
          .subscribe({
            next: () => {
              alert('User updated successfully');
              this.resetForm();
              this.loadUsers();
            },
            error: (error: unknown) => {
              console.error('Error updating user:', error);
              alert('Error updating user');
            }
          });
      } else {
        // Create new user
        this.userManagementService.createUser(this.userForm.value)
          .subscribe({
            next: () => {
              alert('User created successfully');
              this.resetForm();
              this.loadUsers();
            },
            error: (error: unknown) => {
              console.error('Error creating user:', error);
              alert('Error creating user');
            }
          });
      }
    }
  }

  editUser(user: User): void {
    this.isEditing = true;
    this.selectedUserId = user.id;
    this.userForm.patchValue({
      name: user.name,
      email: user.email,
      role: user.role
    });
  }

  deleteUser(id: number): void {
    if (confirm('Are you sure you want to delete this user?')) {
      this.userManagementService.deleteUser(id)
        .subscribe({
          next: () => {
            alert('User deleted successfully');
            this.loadUsers();
          },
          error: (error: unknown) => {
            console.error('Error deleting user:', error);
            alert('Error deleting user');
          }
        });
    }
  }

  resetForm(): void {
    this.isEditing = false;
    this.selectedUserId = null;
    this.userForm.reset({ role: 'user' });
  }
}
