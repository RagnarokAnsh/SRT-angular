import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
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
  isLoading: boolean = false;
  returnUrl: string = '';

  constructor(
    private userService: UserService,
    private router: Router,
    private route: ActivatedRoute,
    private messageService: MessageService
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
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Please enter both email and password',
        life: 3000
      });
      return;
    }

    this.isLoading = true;

    this.userService.login(this.email, this.password).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Login Successful',
          detail: `Welcome, ${response.user.name}!`,
          life: 2000
        });
        
        // Redirect after successful login
        setTimeout(() => {
          this.redirectAfterLogin();
        }, 1000);
      },
      error: (error) => {
        this.isLoading = false;
        let errorMessage = 'Login failed. Please try again.';
        
        if (error.status === 401) {
          errorMessage = 'Invalid email or password';
        } else if (error.status === 422) {
          errorMessage = 'Please check your email and password format';
        } else if (error.status === 0) {
          errorMessage = 'Unable to connect to server. Please check your internet connection.';
        } else {
          errorMessage = error.error?.message || 'Login failed. Please try again.';
        }
        
        this.messageService.add({
          severity: 'error',
          summary: 'Login Failed',
          detail: errorMessage,
          life: 5000
        });
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
}