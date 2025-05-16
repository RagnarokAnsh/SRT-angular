import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  template: `
    <footer class="footer">
      <div class="footer-container">
        <div class="footer-content">
          <div class="footer-brand">
            <span class="brand-text">School Readiness Tool</span>
            <p class="footer-description">Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quos.</p>
          </div>
          <div class="footer-links">
            <div class="footer-section">
              <h4>Quick Links</h4>
              <a routerLink="/" class="footer-link">Home</a>
              <a routerLink="/login" class="footer-link">Login</a>
            </div>
          </div>
        </div>
        <div class="footer-bottom">
          <p>&copy; {{currentYear}} SRI Tool. All rights reserved.</p>
        </div>
      </div>
    </footer>
  `,
  styles: [`
    .footer {
      background-color: white;
      padding: 3rem 0 1rem;
      margin-top: 4rem;
      box-shadow: 0 -2px 4px rgba(0, 0, 0, 0.1);
    }

    .footer-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 1rem;
    }

    .footer-content {
      display: flex;
      justify-content: space-between;
      margin-bottom: 2rem;
    }

    .footer-brand {
      .brand-text {
        color: var(--primary-color);
        font-size: 1.5rem;
        font-weight: 700;
      }

      .footer-description {
        color: var(--text-color);
        margin-top: 0.5rem;
        font-size: 0.875rem;
      }
    }

    .footer-links {
      display: flex;
      gap: 3rem;
    }

    .footer-section {
      h4 {
        color: var(--text-color);
        font-size: 1rem;
        font-weight: 600;
        margin-bottom: 1rem;
      }
    }

    .footer-link {
      display: block;
      color: var(--text-color);
      text-decoration: none;
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
      transition: color 0.2s;

      &:hover {
        color: var(--primary-color);
      }
    }

    .footer-bottom {
      border-top: 1px solid #e5e7eb;
      padding-top: 1rem;
      text-align: center;
      
      p {
        color: var(--text-color);
        font-size: 0.875rem;
      }
    }
  `]
})
export class FooterComponent {
  currentYear = new Date().getFullYear();
} 