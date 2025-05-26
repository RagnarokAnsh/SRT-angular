import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UserService } from '../services/user.service';

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

  constructor(
    private userService: UserService,
    private router: Router
  ) {
    // Redirect if already authenticated
    if (this.userService.isAuthenticated()) {
      const user = this.userService.getCurrentUser();
      if (user) {
        this.redirectBasedOnRole();
      }
    }
  }

  private redirectBasedOnRole(): void {
    if (this.userService.isAdmin()) {
      this.router.navigate(['/admin/dashboard']);
    } else if (this.userService.isStateOfficial()) {
      this.router.navigate(['/state/dashboard']);
    } else if (this.userService.isDPO()) {
      this.router.navigate(['/dpo/dashboard']);
    } else if (this.userService.isCDPO()) {
      this.router.navigate(['/cdpo/dashboard']);
    } else if (this.userService.isSupervisor()) {
      this.router.navigate(['/supervisor/dashboard']);
    } else if (this.userService.isAWW()) {
      this.router.navigate(['/dashboard']);
    } else {
      this.router.navigate(['/home']);
    }
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  onLogin() {
    this.error = '';
    this.success = '';
    this.isLoading = true;

    if (!this.email || !this.password) {
      this.error = 'Please enter both email and password';
      this.isLoading = false;
      return;
    }

    this.userService.login(this.email, this.password).subscribe({
      next: (response: any) => {
        if (response.token && response.user) {
          this.success = 'Login successful! Redirecting...';
          // UserService handles the routing based on role automatically
          this.isLoading = false;
        } else {
          this.error = 'Invalid response from server';
          this.isLoading = false;
        }
      },
      error: (err: any) => {
        console.error('Login error:', err);
        this.error = err.error?.message || 'Login failed. Please check your credentials and try again.';
        this.isLoading = false;
      }
    });
  }
}