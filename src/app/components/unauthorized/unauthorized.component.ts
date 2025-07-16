import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UserService, User } from '../../services/user.service';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="unauthorized-container">
      <div class="unauthorized-content">
        <div class="error-icon">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM13 17h-2v-2h2v2zm0-4h-2V7h2v6z" fill="#dc3545"/>
          </svg>
        </div>
        
        <h1 class="error-title">Access Denied</h1>
        <p class="error-message">
          You don't have permission to access this page. Please contact your administrator if you believe this is an error.
        </p>
        
        <div class="user-info" *ngIf="currentUser">
          <p><strong>Current User:</strong> {{ currentUser.name }}</p>
          <p><strong>Role:</strong> {{ getUserRoleDisplay() }}</p>
        </div>
        
        <div class="action-buttons">
          <button class="btn btn-primary" (click)="goToDashboard()">
            Go to My Dashboard
          </button>
          <button class="btn btn-secondary" (click)="goBack()">
            Go Back
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .unauthorized-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      padding: 20px;
    }

    .unauthorized-content {
      background: white;
      border-radius: 12px;
      padding: 40px;
      text-align: center;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
      max-width: 500px;
      width: 100%;
    }

    .error-icon {
      margin-bottom: 24px;
    }

    .error-title {
      color: #dc3545;
      font-size: 2.5rem;
      font-weight: 600;
      margin-bottom: 16px;
    }

    .error-message {
      color: #6c757d;
      font-size: 1.1rem;
      line-height: 1.6;
      margin-bottom: 32px;
    }

    .user-info {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 32px;
      text-align: left;
    }

    .user-info p {
      margin: 4px 0;
      color: #495057;
    }

    .action-buttons {
      display: flex;
      gap: 12px;
      justify-content: center;
      flex-wrap: wrap;
    }

    .btn {
      padding: 12px 24px;
      border: none;
      border-radius: 6px;
      font-weight: 500;
      text-decoration: none;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .btn-primary {
      background-color: #007bff;
      color: white;
    }

    .btn-primary:hover {
      background-color: #0056b3;
      transform: translateY(-2px);
    }

    .btn-secondary {
      background-color: #6c757d;
      color: white;
    }

    .btn-secondary:hover {
      background-color: #545b62;
      transform: translateY(-2px);
    }

    @media (max-width: 768px) {
      .unauthorized-content {
        padding: 24px;
      }

      .error-title {
        font-size: 2rem;
      }

      .action-buttons {
        flex-direction: column;
      }

      .btn {
        width: 100%;
      }
    }
  `]
})
export class UnauthorizedComponent implements OnInit {
  currentUser: User | null = null;

  constructor(
    private router: Router,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.userService.getCurrentUser();
  }

  getUserRoleDisplay(): string {
    const roles = this.userService.getUserRoles();
    return roles.map(role => role.charAt(0).toUpperCase() + role.slice(1)).join(', ');
  }

  goToDashboard(): void {
    this.userService.redirectToUserDashboard();
  }

  goBack(): void {
    window.history.back();
  }
} 