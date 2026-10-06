import { DOCUMENT, NgComponentOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { filter, map } from 'rxjs';

import { AuthService } from '@core/auth/auth';
import { ROLE_NAV } from '@core/auth/roles';
import { SessionStore } from '@core/auth/session';
import { demoBanner } from '@core/demo/demo-providers';
import { clearChunkReloadFlag } from '@core/network/chunk-reload';
import { Connectivity } from '@core/network/connectivity';
import { LoadingTracker } from '@core/network/loading-tracker';

import { AccountMenu } from './layout/account-menu';
import { LanguageSwitcher } from './layout/language-switcher';

function pathOf(url: string): string {
  return url.split(/[?#]/, 1)[0];
}

/** App shell: top bar, role navigation (bottom bar on phones), page content, footer. */
@Component({
  selector: 'app-root',
  imports: [
    NgComponentOutlet,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    TranslocoPipe,
    LanguageSwitcher,
    AccountMenu,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.with-bottom-nav]': 'showBottomNav()' },
})
export class App {
  protected readonly session = inject(SessionStore);
  protected readonly loading = inject(LoadingTracker);
  protected readonly connectivity = inject(Connectivity);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly main = viewChild.required<ElementRef<HTMLElement>>('main');

  protected readonly demoBanner = demoBanner;
  protected readonly year = new Date().getFullYear();

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  protected readonly onLoginPage = computed(() => pathOf(this.url()) === '/login');
  protected readonly nav = computed(() => {
    const role = this.session.primaryRole();
    return role ? ROLE_NAV[role] : [];
  });
  protected readonly showBottomNav = computed(
    () => this.session.isAuthenticated() && this.nav().length > 1,
  );
  protected readonly homeLink = computed(() =>
    this.session.isAuthenticated() ? this.auth.homeUrl() : '/home',
  );

  constructor() {
    // Lets global styles (snack bars, sticky action bars) clear the bottom navigation.
    effect(() => this.document.body.classList.toggle('has-bottom-nav', this.showBottomNav()));

    // After moving to another page, put focus on the new content so screen readers and
    // keyboard users start there (query-only changes, like filters, keep focus).
    let lastPath: string | null = null;
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((event) => {
        const path = pathOf(event.urlAfterRedirects);
        if (lastPath === null) clearChunkReloadFlag(this.document.defaultView);
        if (lastPath !== null && path !== lastPath) {
          afterNextRender({ read: () => this.focusMain() }, { injector: this.injector });
        }
        lastPath = path;
      });
  }

  /** Skip link: a plain `#main-content` href would resolve against `<base href>`. */
  protected skipToContent(event: Event): void {
    event.preventDefault();
    this.focusMain();
  }

  private focusMain(): void {
    this.main().nativeElement.focus({ preventScroll: true });
  }
}
