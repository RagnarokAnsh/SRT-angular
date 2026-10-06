import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { type RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';

/** Route `title`s are translation keys; the document title follows the active language. */
@Injectable({ providedIn: 'root' })
export class TranslatedTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly transloco = inject(TranslocoService);
  private key: string | undefined;

  constructor() {
    super();
    this.transloco.selectTranslation().subscribe(() => this.apply());
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.key = this.buildTitle(snapshot);
    this.apply();
  }

  private apply(): void {
    const app = this.transloco.translate('app.name');
    this.title.setTitle(this.key ? `${this.transloco.translate(this.key)} · ${app}` : app);
  }
}
