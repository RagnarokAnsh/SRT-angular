import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  // imports: [RouterLink],
  template: `
    <footer class="footer-glass">
      <div class="footer-container">
        <!-- <div class="footer-grid-glass">
          <div class="footer-brand-glass">
            <span class="brand-text-glass">School Readiness Tool</span>
            <p class="footer-description-glass">Lorem ipsum dolor sit amet, consectetur adipisicing elit!</p>
          </div>
          <div class="footer-links-glass">
            <div class="footer-section-glass">
              <h4>Quick Links</h4>
              <a routerLink="/" class="footer-link-glass">Home</a>
              <a routerLink="/login" class="footer-link-glass">Login</a>
            </div>
            <div class="footer-section-glass">
              <h4>Resources</h4>
              <a href="#" class="footer-link-glass">Blog</a>
              <a href="#" class="footer-link-glass">Support</a>
              <a href="#" class="footer-link-glass">Contact</a>
            </div>
          </div>
          <div class="footer-contact-glass">
            <h4>Contact Us</h4>
            <div class="contact-info-glass">
              <span><svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path fill="#6366f1" d="M2 4.5A2.5 2.5 0 0 1 4.5 2h15A2.5 2.5 0 0 1 22 4.5v15a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 2 19.5v-15Zm2.5-.5a.5.5 0 0 0-.5.5v.217l8 5.333 8-5.333V4.5a.5.5 0 0 0-.5-.5h-15Zm15 17a.5.5 0 0 0 .5-.5V7.217l-7.5 5-7.5-5V19.5a.5.5 0 0 0 .5.5h15Z"/></svg> <a href="mailto:info@sritool.com">lorem</a></span>
              <span><svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path fill="#6366f1" d="M6.62 10.79a15.053 15.053 0 0 0 6.59 6.59l2.2-2.2a1.003 1.003 0 0 1 1.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C10.07 21 3 13.93 3 5a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.46.57 3.58a1 1 0 0 1-.24 1.01l-2.2 2.2Z"/></svg> <a href="tel:+1234567890">+1 234 567 890</a></span>
            </div>
          </div>
        </div>
        <div class="footer-divider-glass"></div> -->
        <div class="footer-bottom-glass">
          <p>&copy; {{currentYear}} SRI Tool. All rights reserved.</p>
        </div>
      </div>
    </footer>
  `,
  styles: [`
    .footer-glass {
      background: rgba(255,255,255,0.7);
      box-shadow: 0 -4px 32px rgba(80, 80, 180, 0.10);
      backdrop-filter: blur(16px);
      border-radius: 0;
      margin-top: auto;
      padding: 1.5rem 0 0.5rem;
      position: relative;
      overflow: hidden;
      width: 100%;
    }
    .footer-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 1.5rem;
    }
    .footer-grid-glass {
      display: grid;
      grid-template-columns: 2fr 2fr 2fr;
      gap: 2.5rem;
      align-items: flex-start;
      margin-bottom: 2rem;
    }
    .footer-brand-glass {
      display: flex;
      flex-direction: column;
      gap: 1.2rem;
    }
    .brand-text-glass {
      color: #6366f1;
      font-size: 1.7rem;
      font-weight: 800;
      letter-spacing: 0.01em;
      text-shadow: 0 2px 8px rgba(99,102,241,0.08);
    }
    .footer-description-glass {
      color: #373a47;
      font-size: 1.05rem;
      max-width: 320px;
      opacity: 0.85;
    }
    .footer-socials-glass {
      display: flex;
      gap: 1.2rem;
      margin-top: 0.5rem;
    }
    .footer-social-link-glass {
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(99,102,241,0.08);
      border-radius: 50%;
      width: 2.4rem;
      height: 2.4rem;
      box-shadow: 0 2px 8px rgba(80, 80, 180, 0.10);
      transition: background 0.2s, box-shadow 0.2s, transform 0.2s;
    }
    .footer-social-link-glass:hover {
      background: #6366f1;
      box-shadow: 0 4px 16px rgba(99, 102, 241, 0.18);
      transform: scale(1.13) rotate(-8deg);
    }
    .footer-social-link-glass:hover svg path {
      fill: #fff;
    }
    .footer-links-glass {
      display: flex;
      gap: 2.5rem;
    }
    .footer-section-glass h4 {
      color: #373a47;
      font-size: 1.08rem;
      font-weight: 700;
      margin-bottom: 1rem;
      letter-spacing: 0.01em;
    }
    .footer-link-glass {
      display: block;
      color: #373a47;
      text-decoration: none;
      margin-bottom: 0.5rem;
      font-size: 1rem;
      opacity: 0.92;
      transition: color 0.2s, opacity 0.2s, transform 0.2s;
    }
    .footer-link-glass:hover {
      color: #6366f1;
      opacity: 1;
      transform: translateX(4px) scale(1.05);
    }
    .footer-contact-glass {
      display: flex;
      flex-direction: column;
      gap: 1.1rem;
    }
    .footer-contact-glass h4 {
      color: #373a47;
      font-size: 1.08rem;
      font-weight: 700;
      margin-bottom: 0.7rem;
      letter-spacing: 0.01em;
    }
    .contact-info-glass {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .contact-info-glass span {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #6366f1;
      font-size: 1rem;
      opacity: 0.9;
    }
    .contact-info-glass a {
      color: #6366f1;
      text-decoration: none;
      font-weight: 500;
      transition: text-decoration 0.2s;
    }
    .contact-info-glass a:hover {
      text-decoration: underline;
    }
    .footer-divider-glass {
      width: 100%;
      height: 1px;
      background: linear-gradient(90deg, #e0e7ff 0%, #6366f1 100%);
      opacity: 0.18;
      margin-bottom: 1.2rem;
    }
    .footer-bottom-glass {
      text-align: center;
      padding-bottom: 0;
    }
    .footer-bottom-glass p {
      color: #373a47;
      font-size: 1rem;
      opacity: 0.85;
      letter-spacing: 0.01em;
    }
    @media (max-width: 900px) {
      .footer-grid-glass {
        grid-template-columns: 1fr 1fr;
        gap: 2rem;
      }
    }
    @media (max-width: 700px) {
      .footer-grid-glass {
        grid-template-columns: 1fr;
        gap: 1.5rem;
      }
      .footer-glass {
        padding: 1.5rem 0 0.5rem;
      }
      .footer-links-glass {
        flex-direction: column;
        gap: 1.5rem;
      }
    }
  `]
})
export class FooterComponent {
  currentYear = new Date().getFullYear();
} 