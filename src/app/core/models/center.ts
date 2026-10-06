/** An Anganwadi centre as the API sends it. */
export interface ApiCenter {
  id: number;
  name: string;
  code: string;
  project: string;
  sector: string;
  country_id: number;
  state_id: number;
  district_id: number;
  created_at?: string;
  updated_at?: string;
}

/** Body for POST/PUT /anganwadi-centers. */
export type CenterInput = Omit<ApiCenter, 'id' | 'created_at' | 'updated_at'>;

/** A centre with its location names resolved, for lists. */
export interface CenterWithLocation extends ApiCenter {
  countryName: string | null;
  stateName: string | null;
  districtName: string | null;
}
