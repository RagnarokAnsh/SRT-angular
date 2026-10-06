export interface ApiDomain {
  id: number;
  domain_name: string;
  created_at?: string;
  updated_at?: string;
}

export interface ApiCompetency {
  id: number;
  name: string;
  description: string;
  domain_id: number;
  created_at?: string;
  updated_at?: string;
  domain: ApiDomain;
}

/** GET /competencies wraps the list: `{ status: true, data: [...] }`. */
export interface ApiCompetencyResponse {
  status: boolean;
  data: ApiCompetency[];
}

export interface Competency {
  id: number;
  name: string;
  description: string;
  domainId: number;
  domainName: string;
  /** Key for translations and images, derived from the English name. */
  slug: string;
}

export interface Domain {
  id: number;
  name: string;
  slug: string;
  competencies: Competency[];
}
