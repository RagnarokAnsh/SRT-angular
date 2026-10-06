import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';

import { TEST_API, setupHttpTesting } from '../../../testing/http';
import type { ApiCompetency } from '../models/competency';
import { CompetencyApi } from './competency-api';

function apiCompetency(
  id: number,
  name: string,
  domainId: number,
  domainName: string,
): ApiCompetency {
  return {
    id,
    name,
    description: `About ${name}`,
    domain_id: domainId,
    domain: { id: domainId, domain_name: domainName },
  };
}

const response = {
  status: true,
  data: [
    apiCompetency(1, 'Classification', 1, 'Cognitive Development'),
    apiCompetency(5, 'Vocabulary and Expression', 2, 'Language & Literacy Development'),
    apiCompetency(2, 'Patterns', 1, 'Cognitive Development'),
  ],
};

describe('CompetencyApi', () => {
  let http: HttpTestingController;
  let api: CompetencyApi;

  beforeEach(() => {
    http = setupHttpTesting();
    api = TestBed.inject(CompetencyApi);
  });

  afterEach(() => http.verify());

  it('groups GET /competencies by domain in API order', async () => {
    const result = firstValueFrom(api.domains());
    const req = http.expectOne(`${TEST_API}/competencies`);
    expect(req.request.method).toBe('GET');
    req.flush(response);
    const domains = await result;
    expect(domains.map((d) => d.slug)).toEqual([
      'cognitive-development',
      'language--literacy-development',
    ]);
    expect(domains[0].competencies.map((c) => c.slug)).toEqual(['classification', 'patterns']);
  });

  it('caches the list for the session', async () => {
    const first = firstValueFrom(api.domains());
    http.expectOne(`${TEST_API}/competencies`).flush(response);
    await first;
    await firstValueFrom(api.domains());
    http.expectNone(`${TEST_API}/competencies`);
  });

  it('retries after a failure instead of caching the error', async () => {
    const failed = firstValueFrom(api.domains());
    http.expectOne(`${TEST_API}/competencies`).flush('down', { status: 503, statusText: 'Down' });
    await expect(failed).rejects.toBeTruthy();
    const retry = firstValueFrom(api.domains());
    http.expectOne(`${TEST_API}/competencies`).flush(response);
    expect((await retry).length).toBe(2);
  });

  it('finds a competency by id', async () => {
    const result = firstValueFrom(api.competency(5));
    http.expectOne(`${TEST_API}/competencies`).flush(response);
    expect((await result)?.name).toBe('Vocabulary and Expression');
  });
});
