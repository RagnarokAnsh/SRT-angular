import { Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  standalone: true,
  template: `
    <footer class="footer">
      <div class="footer-content">
        <p>© 2025 School Ready Children. All rights reserved.</p>
      </div>
    </footer>
  `,
  styles: [`
    .footer {
      background: rgba(255, 255, 255, 0.85);
      box-shadow: 0 -4px 24px rgba(80, 80, 180, 0.08);
      backdrop-filter: blur(2px);
      margin-top: auto;
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 32px;
      padding: 0.25rem 0.5rem;
      @media (min-width: 480px) {
        min-height: 36px;
        padding: 0.5rem 1rem;
      }
      @media (min-width: 768px) {
        min-height: 40px;
        padding: 0.5rem 2rem;
      }
    }
    
    .footer-content {
      width: 100%;
      max-width: 1200px;
      display: flex;
      justify-content: center;
      align-items: center;
      // padding: 0.25rem;
      @media (min-width: 480px) {
        // padding: 0.5rem;
      }
    }
    
    .footer-content p {
      color: #6366f1;
      font-size: 0.8rem;
      font-weight: 500;
      margin: 0;
      @media (min-width: 480px) {
        font-size: 0.9rem;
      }
      @media (min-width: 768px) {
        font-size: 1rem;
      }
    }
    
    @media (max-width: 700px) {
      .footer {
        min-height: 36px;
      }
      
      .footer-content p {
        font-size: 0.65rem;
      }
    }
  `]
})
export class FooterComponent {
}