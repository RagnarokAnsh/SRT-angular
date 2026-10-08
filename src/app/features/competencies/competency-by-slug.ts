import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { CompetencyApi } from '@core/api/competency-api';

/**
 * `/competencies/find/:slug` → the competency's own page. The home page's wheel knows
 * competencies by name only; the ids come from the API. Unknown names (or no connection)
 * open the list of domains instead.
 */
export const competencyBySlug: CanActivateFn = (route) => {
  const router = inject(Router);
  const slug = route.paramMap.get('slug') ?? '';
  return inject(CompetencyApi)
    .domains()
    .pipe(
      map((domains) => {
        const found = domains.flatMap((d) => d.competencies).find((c) => c.slug === slug);
        return router.createUrlTree(found ? ['/competencies', found.id] : ['/competencies']);
      }),
      catchError(() => of(router.createUrlTree(['/competencies']))),
    );
};
