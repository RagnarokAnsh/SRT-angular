/** Translation key for a child's gender as stored by the API ("Boy", "Girl", "N/A"). */
export function genderKey(gender: string): string {
  switch (gender.trim().toLowerCase()) {
    case 'boy':
    case 'male':
      return 'children.gender.boy';
    case 'girl':
    case 'female':
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
