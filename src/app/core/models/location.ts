export interface Country {
  id: number;
  name: string;
}

export interface State {
  id: number;
  name: string;
  country_id: number;
}

export interface District {
  id: number;
  name: string;
  state_id: number;
}

/** `{ id, name }` objects embedded in API responses. */
export interface NamedRef {
  id: number;
  name: string;
}
