import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { DOCUMENT } from '@angular/common';
import {
  type ApplicationConfig,
  inject,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { MAT_DIALOG_DEFAULT_OPTIONS, MatDialogConfig } from '@angular/material/dialog';
import {
  MAT_FORM_FIELD_DEFAULT_OPTIONS,
  type MatFormFieldDefaultOptions,
} from '@angular/material/form-field';
import {
  TitleStrategy,
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
  withNavigationErrorHandler,
} from '@angular/router';
import { provideTransloco } from '@jsverse/transloco';

import { SessionWatcher } from '@core/auth/session-watcher';
import { demoInterceptors } from '@core/demo/demo-providers';
import { LanguageService } from '@core/i18n/language';
import { LANGUAGES, DEFAULT_LANGUAGE } from '@core/i18n/languages';
import { TranslatedTitleStrategy } from '@core/i18n/title-strategy';
import { TranslationLoader } from '@core/i18n/translation-loader';
import { provideAppIcons } from '@core/icons/icons';
import { isChunkLoadError, reloadOnceForNewVersion } from '@core/network/chunk-reload';
import {
  apiRequestInterceptor,
  loadingInterceptor,
  unauthorizedInterceptor,
} from '@core/network/interceptors';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
      // A page's code file may be gone after a new version is deployed: reload once.
      withNavigationErrorHandler((navError) => {
        if (isChunkLoadError(navError.error)) {
          reloadOnceForNewVersion(inject(DOCUMENT).defaultView, navError.url);
        }
      }),
    ),
    { provide: TitleStrategy, useClass: TranslatedTitleStrategy },
    provideHttpClient(
      withFetch(),
      // Order matters: the demo backend (mock builds only) must run last, like a server.
      withInterceptors([
        apiRequestInterceptor,
        loadingInterceptor,
        unauthorizedInterceptor,
        ...demoInterceptors,
      ]),
    ),
    provideTransloco({
      config: {
        availableLangs: LANGUAGES.map((language) => language.code),
        defaultLang: DEFAULT_LANGUAGE,
        fallbackLang: DEFAULT_LANGUAGE,
        missingHandler: { useFallbackTranslation: true, logMissingKey: true },
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
      },
      loader: TranslationLoader,
    }),
    // The first screen renders only after its translations are loaded.
    provideAppInitializer(() => inject(LanguageService).init()),
    provideAppInitializer(() => inject(SessionWatcher).start()),
    provideAppIcons(),
    {
      provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
      useValue: {
        appearance: 'outline',
        subscriptSizing: 'dynamic',
      } satisfies MatFormFieldDefaultOptions,
    },
    {
      provide: MAT_DIALOG_DEFAULT_OPTIONS,
      // Replaces Material's defaults wholesale, so start from them.
      useValue: {
        ...new MatDialogConfig(),
        autoFocus: 'first-tabbable',
        restoreFocus: true,
        maxWidth: 'calc(100vw - 32px)',
      } satisfies MatDialogConfig,
    },
  ],
};
