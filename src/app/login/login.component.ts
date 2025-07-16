import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UserService } from '../services/user.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  showPassword: boolean = false;
  email: string = '';
  password: string = '';
  error: string = '';
  success: string = '';
  isLoading: boolean = false;
  returnUrl: string = '';

  constructor(
    private userService: UserService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Get return URL from route parameters or default to appropriate dashboard
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '';
    
    // Redirect if already authenticated
    if (this.userService.isAuthenticated()) {
      this.redirectAfterLogin();
    }
  }

  onSubmit(): void {
    if (!this.email || !this.password) {
      this.error = 'Please enter both email and password';
      return;
    }

    this.isLoading = true;
    this.error = '';
    this.success = '';

    this.userService.login(this.email, this.password).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.success = 'Login successful! Redirecting...';
        
        // Redirect after successful login
        setTimeout(() => {
          this.redirectAfterLogin();
        }, 1000);
      },
      error: (error) => {
        this.isLoading = false;
        if (error.status === 401) {
          this.error = 'Invalid email or password';
        } else if (error.status === 422) {
          this.error = 'Please check your email and password format';
        } else if (error.status === 0) {
          this.error = 'Unable to connect to server. Please check your internet connection.';
        } else {
          this.error = error.error?.message || 'Login failed. Please try again.';
        }
      }
    });
  }

  private redirectAfterLogin(): void {
    if (this.returnUrl && this.returnUrl !== '/login') {
      // Redirect to the original requested URL
      this.router.navigateByUrl(this.returnUrl);
    } else {
      // Redirect based on user role
      this.userService.redirectToUserDashboard();
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  clearError(): void {
    this.error = '';
  }

  clearSuccess(): void {
    this.success = '';
  }
}