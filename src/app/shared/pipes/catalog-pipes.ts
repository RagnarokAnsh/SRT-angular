import { Pipe, type PipeTransform, inject } from '@angular/core';

import { CatalogText } from '@core/catalog/catalog-text';

// Impure so they follow language changes (CatalogText reads the language signal).

/** `{{ domain | domainName }}` */
@Pipe({ name: 'domainName', pure: false })
export class DomainNamePipe implements PipeTransform {
  private readonly text = inject(CatalogText);

  transform(domain: { slug: string; name: string } | null | undefined): string {
    return domain ? this.text.domainName(domain) : '';
  }
}

/** `{{ competency | competencyName }}` */
@Pipe({ name: 'competencyName', pure: false })
export class CompetencyNamePipe implements PipeTransform {
  private readonly text = inject(CatalogText);

  transform(competency: { slug: string; name: string } | null | undefined): string {
    return competency ? this.text.competencyName(competency) : '';
  }
}

/** `{{ competency | competencyDescription }}` */
@Pipe({ name: 'competencyDescription', pure: false })
export class CompetencyDescriptionPipe implements PipeTransform {
  private readonly text = inject(CatalogText);

  transform(competency: { slug: string; description: string } | null | undefined): string {
    return competency ? this.text.competencyDescription(competency) : '';
  }
}
