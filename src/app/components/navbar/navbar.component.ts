import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, CommonModule, MatIconModule],
  template: `
    <nav class="navbar">
      <div class="navbar-container">
        <a routerLink="/" class="navbar-brand">
          <span class="navbar-heading">School <span class="navbar-highlight">Readiness</span> Tool</span>
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
            <a routerLink="/students" class="nav-link" routerLinkActive="active" (click)="closeMenu()">
              <mat-icon class="nav-icon">group</mat-icon>
              Manage Students
            </a>
            <a routerLink="/select-competency" class="nav-link" routerLinkActive="active" (click)="closeMenu()">
              <mat-icon class="nav-icon">school</mat-icon>
              Competency
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
      // max-width: 1200px;
      padding: 0.5rem 1.5rem;
      position: sticky;
      top: 1rem;
      z-index: 100;
      transition: box-shadow 0.2s;
    }
    .navbar-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
    }
    .navbar-brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      text-decoration: none;
    }
    .navbar-logo {
      border-radius: 0.5rem;
      box-shadow: 0 2px 8px rgba(80, 80, 180, 0.10);
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
      gap: 2rem;
      align-items: center;
      transition: right 0.3s;
    }
    .nav-link {
      color: #373a47;
      text-decoration: none;
      font-weight: 500;
      font-size: 1rem;
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      transition: background 0.2s, color 0.2s;
    }
    .nav-link:hover, .nav-link.active {
      background: #6366f1;
      color: #fff;
    }
    .navbar-toggle {
      display: none;
      flex-direction: column;
      justify-content: center;
      gap: 0.3rem;
      width: 2.2rem;
      height: 2.2rem;
      background: none;
      border: none;
      cursor: pointer;
      z-index: 110;
    }
    .navbar-toggle span {
      display: block;
      height: 3px;
      width: 28px;
      background: #6366f1;
      border-radius: 2px;
      transition: 0.3s;
    }
    .navbar-toggle span.open:nth-child(1) {
      transform: translateY(8px) rotate(45deg);
    }
    .navbar-toggle span.open:nth-child(2) {
      opacity: 0;
    }
    .navbar-toggle span.open:nth-child(3) {
      transform: translateY(-8px) rotate(-45deg);
    }
    @media (max-width: 900px) {
      .navbar {
        padding: 0.5rem 0.5rem;
      }
      .navbar-links {
        gap: 1rem;
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
        background: rgba(255,255,255,0.98);
        box-shadow: 0 8px 32px rgba(80, 80, 180, 0.10);
        border-radius: 1rem;
        flex-direction: column;
        align-items: flex-start;
        width: 80vw;
        max-width: 320px;
        padding: 1.5rem 1rem;
        z-index: 99;
        display: none;
      }
      .navbar-links.open {
        display: flex;
      }
      .navbar-toggle {
        display: flex;
      }
    }
    .nav-icon {
      margin-right: 0.5rem;
      color: #373a47;
      transition: color 0.2s;
      vertical-align: middle;
      font-size: 20px;
      height: 20px;
      width: 20px;
      line-height: 20px;
    }
    .nav-link:hover .nav-icon {
      color: #fff;
    }
  `]
})
export class NavbarComponent implements OnInit {
  menuOpen = false;
  isAuthenticated = false;

  constructor(private userService: UserService) {}

  ngOnInit() {
    this.userService.isAuthenticated$.subscribe(
      isAuthenticated => this.isAuthenticated = isAuthenticated
    );
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu() {
    this.menuOpen = false;
  }

  logout() {
    this.userService.logout();
    this.closeMenu();
  }
} 