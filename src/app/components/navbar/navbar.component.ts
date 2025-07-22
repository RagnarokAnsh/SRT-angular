import { Component, HostListener, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { UserService, User } from '../../services/user.service';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../../AWW/assessments/confirm-dialog/confirm-dialog.component';
import { Inject } from '@angular/core';
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'logout-confirm-dialog',
  template: `
    <h2 mat-dialog-title>Logout</h2>
    <mat-dialog-content>
      Are you sure you want to logout?
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button type="button" class="btn btn-outline-secondary me-2" mat-dialog-close>Cancel</button>
      <button type="button" class="btn btn-danger" [mat-dialog-close]="true">Logout</button>
    </mat-dialog-actions>
  `,
  standalone: true,
  imports: [MatDialogModule, MatButtonModule]
})
export class LogoutConfirmDialog {
  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {}
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, CommonModule, MatIconModule],
  template: `
    <nav class="navbar">
      <div class="navbar-container">
        <a routerLink="/" class="navbar-brand">
          <img src="assets/images/sri_logo.png" alt="School Readiness Instrument Logo" class="navbar-logo" style="height: 56px; width: auto; display: block;" />
        </a>
        <button class="navbar-toggle" (click)="toggleMenu()" aria-label="Toggle navigation">
          <span [class.open]="menuOpen"></span>
          <span [class.open]="menuOpen"></span>
          <span [class.open]="menuOpen"></span>
        </button>
        <div class="navbar-links" [class.open]="menuOpen">
          <!-- Show Home when not authenticated, Dashboard when authenticated -->
          <a *ngIf="!isAuthenticated" routerLink="/home" class="nav-link" routerLinkActive="active" (click)="closeMenu()">
            <mat-icon class="nav-icon">home</mat-icon>
            Home
          </a>
          <a *ngIf="isAuthenticated" routerLink="/dashboard" class="nav-link" routerLinkActive="active" (click)="closeMenu()">
            <mat-icon class="nav-icon">dashboard</mat-icon>
            Dashboard
          </a>
          
          <!-- Show these links only when authenticated -->
          <ng-container *ngIf="isAuthenticated">
            <div class="nav-dropdown" *ngIf="isAdminUser()">
              <a class="nav-link" (click)="toggleDropdown()">
                <mat-icon class="nav-icon">admin_panel_settings</mat-icon>
                Manage
                <mat-icon class="dropdown-arrow">arrow_drop_down</mat-icon>
              </a>
              <div class="dropdown-menu" [class.show]="isDropdownOpen">
                <a class="dropdown-item" routerLink="/admin/users" (click)="closeMenu()">
                  <mat-icon class="nav-icon">people</mat-icon>
                  Users 
                </a>
                <a class="dropdown-item" routerLink="/admin/anganwadi" (click)="closeMenu()">
                  <mat-icon class="nav-icon">business</mat-icon>
                  Anganwadi 
                </a>
                <a class="dropdown-item" routerLink="/students" (click)="closeMenu()">
                  <mat-icon class="nav-icon">school</mat-icon>
                  Students
                </a>
              </div>
            </div>
            
            <a *ngIf="!isAdminUser()" routerLink="/students" class="nav-link" routerLinkActive="active" (click)="closeMenu()">
              <mat-icon class="nav-icon">group</mat-icon>
              Students
            </a>
            
            <a routerLink="/select-competency" class="nav-link" routerLinkActive="active" (click)="closeMenu()">
              <mat-icon class="nav-icon">school</mat-icon>
              Domains of Development
            </a>
            <a (click)="logout()" class="nav-link" style="cursor: pointer;">
              <mat-icon class="nav-icon">logout</mat-icon>
              Logout
            </a>
          </ng-container>

          <!-- Show login link only when not authenticated -->
          <a *ngIf="!isAuthenticated" routerLink="/login" class="nav-link" routerLinkActive="active" (click)="closeMenu()">
            <mat-icon class="nav-icon">login</mat-icon>
            Login
          </a>
        </div>
      </div>
    </nav>
  `,
  styles: [`
    .navbar {
      background: rgba(255, 255, 255, 0.85);
      box-shadow: 0 4px 24px rgba(80, 80, 180, 0.08);
      backdrop-filter: blur(2px);
      border-radius: 1.5rem;
      margin: 0 auto 0;
      padding: 0.25rem 0.5rem;
      position: sticky;
      top: 0.5rem;
      z-index: 100;
      transition: box-shadow 0.2s;
      min-height: 48px;
      
      @media (min-width: 480px) {
        padding: 0.5rem 1rem;
        top: 1rem;
        min-height: 56px;
      }
      
      @media (min-width: 768px) {
        padding: 0.5rem 1.5rem;
        min-height: 64px;
      }
    }
    .navbar-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      min-height: 48px;
      
      @media (min-width: 480px) {
        min-height: 56px;
      }
      @media (min-width: 768px) {
        min-height: 64px;
      }
    }
    .navbar-brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      text-decoration: none;
    }
    .navbar-logo {
      height: 36px;
      width: auto;
      display: block;
      @media (min-width: 480px) {
        height: 48px;
      }
      @media (min-width: 768px) {
        height: 56px;
      }
    }
    .navbar-heading {
      font-weight: 700;
      font-size: 1.25rem;
      color: #22223b;
      letter-spacing: 0.01em;
    }
    .navbar-highlight {
      background: linear-gradient(90deg, #6366f1 0%, #818cf8 100%);
      color: #fff;
      padding: 0 0.5rem;
      border-radius: 0.375rem;
      margin-left: 0.25rem;
    }
    .navbar-links {
      display: flex;
      gap: 0.5rem;
      align-items: center;
      transition: right 0.3s;
      font-size: 0.9rem;
      
      @media (min-width: 480px) {
        gap: 1rem;
        font-size: 1rem;
      }
    }
    .nav-link {
      color: #373a47;
      text-decoration: none;
      font-weight: 500;
      font-size: 14px;
      padding: 0.4rem 0.75rem;
      border-radius: 0.5rem;
      transition: background 0.2s, color 0.2s;
      min-height: 44px;
      display: flex;
      align-items: center;
      gap: 0.25rem;
      @media (min-width: 480px) {
        font-size: 1rem;
        padding: 0.5rem 1rem;
        gap: 0.5rem;
      }
    }
    .nav-link:hover, .nav-link.active {
      background: #6366f1;
      color: #fff;
    }
    .navbar-toggle {
      display: none;
      flex-direction: column;
      justify-content: center;
      gap: 0.2rem;
      width: 2rem;
      height: 2rem;
      background: none;
      border: none;
      cursor: pointer;
      z-index: 110;
      @media (max-width: 700px) {
        display: flex;
      }
    }
    .navbar-toggle span {
      display: block;
      height: 3px;
      width: 22px;
      background: #6366f1;
      border-radius: 2px;
      transition: 0.3s;
      @media (min-width: 480px) {
        width: 28px;
      }
    }
    .navbar-toggle span.open:nth-child(1) {
      transform: translateY(7px) rotate(45deg);
    }
    .navbar-toggle span.open:nth-child(2) {
      opacity: 0;
    }
    .navbar-toggle span.open:nth-child(3) {
      transform: translateY(-7px) rotate(-45deg);
    }
    @media (max-width: 900px) {
      .navbar {
        padding: 0.25rem 0.25rem;
      }
      .navbar-links {
        gap: 0.5rem;
      }
    }
    @media (max-width: 700px) {
      .navbar-container {
        flex-wrap: wrap;
      }
      .navbar-links {
        position: fixed;
        top: 4.5rem;
        right: 0;
        background: rgba(255, 255, 255, 0.98);
        box-shadow: 0 8px 32px rgba(80, 80, 180, 0.1);
        border-radius: 1rem;
        flex-direction: column;
        align-items: flex-start;
        width: 40vw;
        max-width: 320px;
        padding: 1rem 0.5rem;
        z-index: 99;
        display: none;
        font-size: 1rem;
    
      }
      .navbar-links.open {
        display: flex;
      }
    }
    .nav-icon {
      margin-right: 0.25rem;
      color: #373a47;
      transition: color 0.2s;
      vertical-align: middle;
      font-size: 18px;
      height: 18px;
      width: 18px;
      line-height: 18px;
      @media (min-width: 480px) {
        font-size: 20px;
        height: 20px;
        width: 20px;
        line-height: 20px;
      }
    }
    .nav-link:hover .nav-icon {
      color: #fff;
    }

    .nav-dropdown {
      position: relative;
      display: inline-block;
    }

    .dropdown-arrow {
      margin-left: 4px;
      vertical-align: middle;
      width: 20px;
      height: 20px;
      font-size: 20px;
      line-height: 1;
    }

    .dropdown-menu {
      display: none;
      position: absolute;
      top: 100%;
      left: 0;
      background: rgba(255, 255, 255, 0.95);
      min-width: 240px;
      box-shadow: 0 4px 24px rgba(80, 80, 180, 0.15);
      border-radius: 0.75rem;
      padding: 0.5rem 0;
      z-index: 1000;
      margin-top: 0.5rem;
      backdrop-filter: blur(4px);
      border: 1px solid rgba(0, 0, 0, 0.05);
    }

    .dropdown-menu.show {
      display: block;
    }

    .dropdown-item {
      display: flex;
      align-items: center;
      padding: 0.65rem 1.5rem;
      color: #373a47;
      text-decoration: none;
      font-size: 0.95rem;
      font-weight: 500;
      transition: all 0.2s ease;
      border-radius: 0.5rem;
      margin: 0 0.5rem;
    }

    .dropdown-item:hover, .dropdown-item:focus, .dropdown-item:active {
      background: #6366f1;
      color: #fff;
    }

    .dropdown-item:hover .nav-icon,
    .dropdown-item:focus .nav-icon,
    .dropdown-item:active .nav-icon {
      color: #fff !important;
    }

    .dropdown-item .nav-icon {
      margin-right: 12px;
      font-size: 20px;
      width: 20px;
      height: 20px;
      transition: color 0.2s ease;
    }

    @media (max-width: 900px) {
      .dropdown-menu {
        position: static;
        box-shadow: none;
        padding: 0;
        background: transparent;
        // margin: 0.5rem 0 0 1.5rem;
        border: none;
        backdrop-filter: none;
      }

      .dropdown-item {
        padding: 0.75rem 1rem;
        margin: 0.25rem 0.5rem;
        border-radius: 0.5rem;
        color: #373a47;
      }

      .dropdown-item:hover,
      .dropdown-item:focus,
      .dropdown-item:active {
        background: #6366f1;
        color: #fff;
      }
      
      .dropdown-item:hover .nav-icon,
      .dropdown-item:focus .nav-icon,
      .dropdown-item:active .nav-icon {
        color: #fff !important;
      }
    }
  `]
})
export class NavbarComponent implements OnInit {
  menuOpen = false;
  isDropdownOpen = false;
  isAuthenticated = false;
  currentUser: User | null = null;

  constructor(private userService: UserService, private dialog: MatDialog) {}

  ngOnInit() {
    this.userService.isAuthenticated$.subscribe(
      isAuthenticated => this.isAuthenticated = isAuthenticated
    );
    this.userService.currentUser$.subscribe(
      user => this.currentUser = user
    );
  }

  isAdminUser(): boolean {
    if (!this.currentUser?.roles) return false;
    return this.currentUser.roles.some(role => role.name === 'admin');
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  @HostListener('document:click', ['$event'])
  onClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.nav-dropdown')) {
      this.isDropdownOpen = false;
    }
  }

  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  closeMenu() {
    this.menuOpen = false;
    this.isDropdownOpen = false;
  }

  async logout() {
    const dialogRef = this.dialog.open(LogoutConfirmDialog, {
      width: '300px'
    });
    const confirmed = await dialogRef.afterClosed().toPromise();
    if (confirmed) {
      this.userService.logout();
      this.closeMenu();
    }
  }
} 