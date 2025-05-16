import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink],
  template: `
    <nav class="navbar">
      <div class="navbar-container">
        <a routerLink="/" class="navbar-brand">
        <h2 class="navbar-heading">
        School <span class="navbar-highlight">Readiness</span> Tool
      </h2>
        </a>
        <div class="navbar-links">
          <a routerLink="/landing" class="nav-link">Home</a>
          <a routerLink="/login" class="nav-link">Login</a>
        </div>
      </div>
    </nav>
  `,
  styles: [`
    .navbar {
      background-color: white;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      padding: 1rem 0;
    }

    .navbar-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .navbar-brand {
      text-decoration: none;
      font-size: 1rem;
      font-weight: 700;
    }
    .navbar-heading {
  font-weight: 700;
  font-size: 1.5rem;
  
  .navbar-highlight {
    background-color: var(--primary-color);
    color: white;
    padding: 0 0.5rem;
    border-radius: 0.375rem;
  }
}

    .brand-text {
      color: var(--primary-color);
    }

    .navbar-links {
      display: flex;
      gap: 1.5rem;
    }

    .nav-link {
      color: var(--text-color);
      text-decoration: none;
      font-weight: 500;
      transition: color 0.2s;

      &:hover {
        color: var(--primary-color);
      }
    }
  `]
})
export class NavbarComponent {} 