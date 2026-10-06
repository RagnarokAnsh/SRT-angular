import type { IsoDate } from '../util/dates';
import type { ApiCenter } from './center';

/** A child as the API sends it. Height and weight arrive as strings. */
export interface ApiChild {
  id: number;
  name: string;
  date_of_birth: string;
  symbol: string;
  height_cm: string | number | null;
  weight_kg: string | number | null;
  language: string;
  anganwadi_id: number | null;
  age?: number | null;
  gender: string;
  aww_id?: number | null;
  anganwadi?: ApiCenter | null;
  created_at?: string;
  updated_at?: string;
}

/** Gender values the API uses for children. */
export const CHILD_GENDERS = ['Boy', 'Girl', 'N/A'] as const;
export type ChildGender = (typeof CHILD_GENDERS)[number];

export interface Child {
  id: number;
  name: string;
  /** Null when the API sends no usable date (shown as missing, never replaced by today). */
  dateOfBirth: IsoDate | null;
  symbol: string;
  heightCm: number | null;
  weightKg: number | null;
  language: string;
  anganwadiId: number | null;
  centerName: string | null;
  gender: string;
  awwId: number | null;
}

/** What the child form produces. */
export interface ChildInput {
  name: string;
  dateOfBirth: IsoDate;
  gender: ChildGender;
  symbol: string;
  language: string;
  heightCm: number;
  weightKg: number;
  anganwadiId: number;
}

/** Validation limits (the same as the previous version's child form). */
export const CHILD_LIMITS = {
  nameMax: 100,
  symbolMax: 20,
  languageMax: 30,
  /** New children must be at least `ageMin` and younger than `ageMax` years. */
  ageMin: 2,
  ageMax: 6,
  heightCm: { min: 30, max: 200 },
  weightKg: { min: 5, max: 50 },
  decimals: 2,
} as const;
