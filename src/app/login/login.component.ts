import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UserService } from '../services/user.service';

interface User {
  email: string;
  name: string;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  showPassword: boolean = false;
  email: string = '';
  password: string = '';
  error: string = '';
  success: string = '';
  isLoading: boolean = false;

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  constructor(
    private userService: UserService,
    private router: Router
  ) {}

  onLogin() {
    this.error = '';
    this.success = '';
    this.isLoading = true;

    if (!this.email || !this.password) {
      this.error = 'Please enter both email and password';
      this.isLoading = false;
      return;
    }

    console.log('Attempting login with:', { email: this.email }); // Debug log

    this.userService.login(this.email, this.password).subscribe({
      next: (user: User) => {
        console.log('Login response received:', user); // Debug log
        if (user) {
          this.success = 'Login successful!';
          // Navigation is handled by the UserService
        } else {
          this.error = 'Invalid credentials';
          this.isLoading = false;
        }
      },
      error: (err: Error) => {
        console.error('Login error details:', err); // Debug log
        this.error = err.message || 'Login failed. Please try again.';
        this.isLoading = false;
      },
      complete: () => {
        console.log('Login process completed'); // Debug log
        this.isLoading = false;
      }
    });
  }
}