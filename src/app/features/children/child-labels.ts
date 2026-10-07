import { toChildGender } from '@core/models/child';

/** Translation key for a child's gender as stored by the API ("Boy", "Girl", "N/A"). */
export function genderKey(gender: string): string {
  switch (toChildGender(gender)) {
    case 'Boy':
      return 'children.gender.boy';
    case 'Girl':
      return 'children.gender.girl';
    default:
      return 'children.gender.other';
  }
}

/** Suggestions for the home language field (free text is still allowed). */
export const LANGUAGE_SUGGESTIONS = [
  'Hindi',
  'English',
  'Rajasthani',
  'Marwari',
  'Bhojpuri',
  'Urdu',
  'Punjabi',
  'Gujarati',
  'Marathi',
  'Bengali',
  'Odia',
  'Assamese',
  'Tamil',
  'Telugu',
  'Kannada',
  'Malayalam',
] as const;
