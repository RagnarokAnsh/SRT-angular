import type { ApiCenter } from './center';
import type { NamedRef } from './location';
import type { RoleName } from './role';

export interface ApiRole {
  id: number;
  name: string;
  guard_name?: string;
  created_at?: string;
  updated_at?: string;
  pivot?: { model_type: string; model_id: number; role_id: number };
}

/** A user as the API sends it (also what is stored as the signed-in user). */
export interface ApiUser {
  id: number;
  name: string;
  email: string;
  email_verified_at?: string | null;
  created_at?: string;
  updated_at?: string;
  roles: ApiRole[];
  gender?: string | null;
  country_id?: number | null;
  state_id?: number | null;
  district_id?: number | null;
  project?: string | null;
  sector?: string | null;
  anganwadi_id?: number | null;
  country?: NamedRef | null;
  state?: NamedRef | null;
  district?: NamedRef | null;
  anganwadi?: ApiCenter | null;
}

/** Gender values the API uses for users (children use Boy/Girl, see child.ts). */
export const USER_GENDERS = ['male', 'female', 'N/A'] as const;
export type UserGender = (typeof USER_GENDERS)[number];

/** Body for POST/PUT /users. Location fields are only sent when the role needs them. */
export interface UserInput {
  name: string;
  email: string;
  password?: string;
  role: RoleName;
  gender: string;
  country_id?: number;
  state_id?: number;
  district_id?: number;
  project?: string;
  sector?: string;
  anganwadi_id?: number;
}

export interface LoginResponse {
  token: string;
  user: ApiUser;
  roles?: string[];
  message?: string;
}
