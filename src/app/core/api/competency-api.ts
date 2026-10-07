import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, shareReplay, throwError } from 'rxjs';

import type { ApiCompetency, ApiDomain, Competency, Domain } from '../models/competency';
import { slugify } from '../util/slug';
import { API_BASE_URL } from './api-base-url';
import { text, toId, unwrapList } from './parse';

/** A competency from the API (ids as numbers, text trimmed); null without a usable id. */
export function toCompetency(value: unknown): Competency | null {
  if (!value || typeof value !== 'object') return null;
  const api = value as Partial<Record<keyof ApiCompetency, unknown>>;
  const id = toId(api.id);
  if (id === null) return null;
  const domain = (api.domain && typeof api.domain === 'object' ? api.domain : {}) as Partial<
    Record<keyof ApiDomain, unknown>
  >;
  const name = text(api.name);
  return {
    id,
    name,
    description: text(api.description),
    domainId: toId(api.domain_id) ?? toId(domain.id) ?? 0,
    domainName: text(domain.domain_name),
    slug: slugify(name),
  };
}

/** Groups competencies by domain, keeping the order the API returns them in. */
export function groupByDomain(competencies: Competency[]): Domain[] {
  const domains = new Map<number, Domain>();
  for (const competency of competencies) {
    let domain = domains.get(competency.domainId);
    if (!domain) {
      domain = {
        id: competency.domainId,
        name: competency.domainName,
        slug: slugify(competency.domainName),
        competencies: [],
      };
      domains.set(competency.domainId, domain);
    }
    domain.competencies.push(competency);
  }
  return [...domains.values()];
}

@Injectable({ providedIn: 'root' })
export class CompetencyApi {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);
  private cache$?: Observable<Domain[]>;

  /** GET /competencies, grouped by domain. Cached for the session; a failure is retried next time. */
  domains(): Observable<Domain[]> {
    this.cache$ ??= this.http.get<unknown>(`${this.base}/competencies`).pipe(
      map((body) =>
        groupByDomain(
          unwrapList<unknown>(body)
            .map(toCompetency)
            .filter((competency): competency is Competency => competency !== null),
        ),
      ),
      catchError((error: unknown) => {
        this.cache$ = undefined;
        return throwError(() => error);
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.cache$;
  }

  competency(id: number): Observable<Competency | undefined> {
    return this.domains().pipe(
      map((domains) => domains.flatMap((d) => d.competencies).find((c) => c.id === id)),
    );
  }

  clearCache(): void {
    this.cache$ = undefined;
  }
}
