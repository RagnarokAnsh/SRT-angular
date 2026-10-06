import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import { AuthService } from '@core/auth/auth';
import { SessionStore } from '@core/auth/session';
import { scrollToElement } from '@shared/scroll';

import { ReadinessWheel } from './readiness-wheel';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink, MatButtonModule, MatIconModule, TranslocoPipe, ReadinessWheel],
  template: `
    <section class="hero">
      <div class="page hero__inner">
        <h1 class="hero__title">
          {{ 'home.titleBefore' | transloco }}
          <span class="title-highlight">{{ 'home.titleHighlight' | transloco }}</span>
          {{ 'home.titleAfter' | transloco }}
        </h1>
        <p class="hero__lead">{{ 'home.lead' | transloco }}</p>
        <div class="hero__actions">
          @if (session.isAuthenticated()) {
            <a mat-flat-button [routerLink]="homeUrl()">
              {{ 'home.continue' | transloco }}
              <mat-icon svgIcon="arrow-right" iconPositionEnd aria-hidden="true" />
            </a>
          } @else {
            <a mat-flat-button routerLink="/login">
              <mat-icon svgIcon="login" aria-hidden="true" />
              {{ 'home.signIn' | transloco }}
            </a>
          }
          <a mat-stroked-button href="#framework" (click)="scrollTo($event, 'framework')">
            {{ 'home.explore' | transloco }}
            <mat-icon svgIcon="arrow-down" iconPositionEnd aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>

    <section class="page about" aria-labelledby="about-title">
      <h2 id="about-title">{{ 'home.aboutTitle' | transloco }}</h2>
      <div class="about__grid">
        <p>{{ 'home.aboutSkills' | transloco }}</p>
        <p>{{ 'home.aboutChild' | transloco }}</p>
      </div>
    </section>

    <section id="framework" class="page framework" aria-labelledby="framework-title" tabindex="-1">
      <h2 id="framework-title">{{ 'home.frameworkTitle' | transloco }}</h2>
      <p class="framework__intro">{{ 'home.frameworkIntro' | transloco }}</p>
      <app-readiness-wheel />
    </section>

    <section class="page closing">
      <div class="closing__card">
        <mat-icon svgIcon="school" aria-hidden="true" />
        <div>
          <p>{{ 'home.closingFoundation' | transloco }}</p>
          <p>{{ 'home.closingTool' | transloco }}</p>
        </div>
      </div>
    </section>
  `,
  styles: `
    @use 'mixins' as *;

    :host {
      display: block;
    }

    .hero {
      background:
        radial-gradient(120% 90% at 100% 0%, var(--color-primary-softer) 0%, transparent 60%),
        radial-gradient(90% 80% at 0% 100%, var(--color-secondary-soft) 0%, transparent 55%);
    }

    .hero__inner {
      padding-block: var(--space-8) var(--space-10);

      @include up(md) {
        padding-block: var(--space-12);
      }
    }

    .hero__title {
      max-width: 18ch;
      margin-bottom: var(--space-4);
      font-size: clamp(2rem, 1.4rem + 3vw, 3.25rem);
      line-height: 1.15;
    }

    .hero__lead {
      max-width: 62ch;
      margin-bottom: var(--space-6);
      font-size: var(--text-lg);
    }

    .hero__actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3);

      a {
        min-height: var(--touch-target);
      }
    }

    .about {
      padding-top: var(--space-6);
    }

    .about__grid {
      display: grid;
      gap: var(--space-2) var(--space-8);

      @include up(md) {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      p {
        max-width: 65ch;
      }
    }

    .framework {
      padding-top: var(--space-6);
      outline: none;
      scroll-margin-top: calc(var(--top-bar-height) + var(--space-4));
    }

    .framework__intro {
      max-width: 62ch;
      margin-bottom: var(--space-6);
      color: var(--color-text-muted);
    }

    .closing__card {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
      padding: var(--space-6);
      border-radius: var(--radius-xl);
      background: var(--color-secondary-soft);
      color: #1e1b4b;

      @include up(sm) {
        flex-direction: row;
        padding: var(--space-8);
      }

      mat-icon {
        flex: none;
        width: 40px;
        height: 40px;
        color: var(--color-secondary-strong);
      }

      p {
        max-width: 70ch;
      }

      p:last-child {
        margin-bottom: 0;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
  protected readonly session = inject(SessionStore);
  private readonly auth = inject(AuthService);
  private readonly document = inject(DOCUMENT);
  protected readonly homeUrl = computed(() => this.auth.homeUrl());

  /** In-page link (a plain `#id` href would resolve against `<base href>`). */
  protected scrollTo(event: Event, id: string): void {
    event.preventDefault();
    const target = this.document.getElementById(id);
    if (!target) return;
    scrollToElement(target);
    target.focus({ preventScroll: true });
  }
}
