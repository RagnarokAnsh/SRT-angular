/**
 * Sample data for demo mode. Shapes match what the real API returns, so the app runs
 * end to end without the backend. Every demo account uses the password below.
 */
export const DEMO_PASSWORD = 'demo1234';

export interface DemoAccount {
  email: string;
  roleKey: string;
}

export interface DbUser {
  id: number;
  name: string;
  email: string;
  password: string;
  role: string;
  gender: string;
  country_id: number | null;
  state_id: number | null;
  district_id: number | null;
  project: string | null;
  sector: string | null;
  anganwadi_id: number | null;
}

export interface DbCenter {
  id: number;
  name: string;
  code: string;
  project: string;
  sector: string;
  country_id: number;
  state_id: number;
  district_id: number;
}

export interface DbChild {
  id: number;
  name: string;
  date_of_birth: string;
  symbol: string;
  height_cm: string;
  weight_kg: string;
  language: string;
  anganwadi_id: number;
  gender: string;
  aww_id: number | null;
}

export interface DbCompetency {
  id: number;
  name: string;
  description: string;
  domain_id: number;
}

export interface DbAssessment {
  id: number;
  child_id: number;
  competency_id: number;
  anganwadi_id: number;
  attempt_number: number;
  observation: string;
  assessment_date: string;
  created_at: string;
  remarks: string;
  age: string;
  height: string;
  weight: string;
}

export interface DemoData {
  users: DbUser[];
  centers: DbCenter[];
  children: DbChild[];
  domains: { id: number; domain_name: string }[];
  competencies: DbCompetency[];
  assessments: DbAssessment[];
  countries: { id: number; name: string }[];
  states: { id: number; name: string; country_id: number }[];
  districts: { id: number; name: string; state_id: number }[];
  projects: Record<string, string[]>;
  sectors: Record<string, string[]>;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  { email: 'aww@demo.in', roleKey: 'roles.aww' },
  { email: 'admin@demo.in', roleKey: 'roles.admin' },
  { email: 'supervisor@demo.in', roleKey: 'roles.supervisor' },
];

function user(
  id: number,
  name: string,
  email: string,
  role: string,
  gender: string,
  location: Partial<DbUser> = {},
): DbUser {
  return {
    id,
    name,
    email,
    password: DEMO_PASSWORD,
    role,
    gender,
    country_id: null,
    state_id: null,
    district_id: null,
    project: null,
    sector: null,
    anganwadi_id: null,
    ...location,
  };
}

function child(
  id: number,
  name: string,
  dob: string,
  gender: string,
  symbol: string,
  height: number,
  weight: number,
  center: number,
  aww: number | null,
  language = 'Hindi',
): DbChild {
  return {
    id,
    name,
    date_of_birth: dob,
    symbol,
    height_cm: String(height),
    weight_kg: String(weight),
    language,
    anganwadi_id: center,
    gender,
    aww_id: aww,
  };
}

const LEVELS = ['Beginning', 'Progressing', 'Advancing', 'School Ready'];

function seedAssessments(children: DbChild[]): DbAssessment[] {
  const result: DbAssessment[] = [];
  let id = 1;
  const sessionDates = ['2026-07-14', '2026-08-18', '2026-09-15', '2026-09-29'];
  const plan: { competency: number; sessions: number }[] = [
    { competency: 1, sessions: 2 },
    { competency: 2, sessions: 1 },
    { competency: 5, sessions: 2 },
    { competency: 10, sessions: 1 },
    { competency: 12, sessions: 1 },
  ];
  for (const c of children.filter((ch) => ch.anganwadi_id === 1)) {
    for (const { competency, sessions } of plan) {
      const count = c.id === 3 && competency === 1 ? 4 : c.id % 4 === 0 ? sessions - 1 : sessions;
      for (let attempt = 1; attempt <= count; attempt++) {
        const levelIndex = Math.min(3, (c.id + competency + attempt) % 4);
        result.push({
          id: id++,
          child_id: c.id,
          competency_id: competency,
          anganwadi_id: c.anganwadi_id,
          attempt_number: attempt,
          observation: LEVELS[levelIndex],
          assessment_date: sessionDates[attempt - 1],
          created_at: `${sessionDates[attempt - 1]}T05:30:00.000000Z`,
          remarks: attempt === 1 && c.id % 3 === 0 ? 'Needed some encouragement to begin.' : '',
          age: '',
          height: competency === 10 ? String(Number(c.height_cm) + attempt - 1) : '',
          weight: competency === 10 ? c.weight_kg : '',
        });
      }
    }
  }
  return result;
}

export function createDemoData(): DemoData {
  const children: DbChild[] = [
    child(1, 'Aarav Kumar', '2021-03-14', 'Boy', 'Sun', 99, 15, 1, 2),
    child(2, 'Diya Sharma', '2020-11-02', 'Girl', 'Moon', 103, 15.5, 1, 2),
    child(3, 'Kabir Singh', '2021-07-21', 'Boy', 'Star', 97, 14, 1, 2),
    child(4, 'Meera Patel', '2020-05-30', 'Girl', 'Tree', 106, 16.5, 1, 2, 'Gujarati'),
    child(5, 'Ramesh Kumar', '2021-01-09', 'Boy', 'Kite', 100, 15, 1, 2),
    child(6, 'Ram Singh', '2020-09-17', 'Boy', 'Fish', 104, 16, 1, 2),
    child(7, 'अनन्या यादव', '2021-04-25', 'Girl', 'Bird', 98, 14.5, 1, 2),
    child(8, 'Ishaan Verma', '2022-02-11', 'Boy', 'Ball', 92, 13, 1, 2),
    child(9, 'Saanvi Gupta', '2021-06-03', 'Girl', 'Flower', 98, 14, 2, 3),
    child(10, 'Vihaan Yadav', '2020-12-19', 'Boy', 'Car', 102, 15.5, 2, 3),
    child(11, 'Pari Meena', '2021-10-08', 'Girl', 'Leaf', 95, 13.5, 2, 3),
    child(12, 'Arjun Rathore', '2021-02-27', 'Boy', 'Drum', 100, 15, 2, 3),
    child(13, 'Kavya Joshi', '2020-08-14', 'Girl', 'Butterfly', 105, 16, 3, null),
  ];

  return {
    users: [
      user(1, 'Asha Verma', 'admin@demo.in', 'admin', 'female'),
      user(2, 'Sunita Devi', 'aww@demo.in', 'aww', 'female', {
        country_id: 1,
        state_id: 1,
        district_id: 1,
        project: 'Jaipur Urban',
        sector: 'Sector 4',
        anganwadi_id: 1,
      }),
      user(3, 'Kamla Meena', 'aww2@demo.in', 'aww', 'female', {
        country_id: 1,
        state_id: 1,
        district_id: 1,
        project: 'Jaipur Urban',
        sector: 'Sector 1',
        anganwadi_id: 2,
      }),
      user(4, 'Rakesh Sharma', 'supervisor@demo.in', 'supervisor', 'male', {
        country_id: 1,
        state_id: 1,
        district_id: 1,
        project: 'Jaipur Urban',
        sector: 'Sector 4',
      }),
      user(5, 'Pooja Singh', 'cdpo@demo.in', 'cdpo', 'female', {
        country_id: 1,
        state_id: 1,
        district_id: 1,
        project: 'Jaipur Urban',
      }),
      user(6, 'Vikram Rathore', 'dpo@demo.in', 'dpo', 'male', {
        country_id: 1,
        state_id: 1,
        district_id: 1,
      }),
      user(7, 'Meenakshi Gupta', 'state@demo.in', 'stateofficial', 'female', {
        country_id: 1,
        state_id: 1,
      }),
    ],
    centers: [
      {
        id: 1,
        name: 'Shivaji Nagar AWC',
        code: 'AWC-JP-001',
        project: 'Jaipur Urban',
        sector: 'Sector 4',
        country_id: 1,
        state_id: 1,
        district_id: 1,
      },
      {
        id: 2,
        name: 'Gandhi Colony AWC',
        code: 'AWC-JP-014',
        project: 'Jaipur Urban',
        sector: 'Sector 1',
        country_id: 1,
        state_id: 1,
        district_id: 1,
      },
      {
        id: 3,
        name: 'Sanganer Gaon AWC',
        code: 'AWC-SG-003',
        project: 'Sanganer',
        sector: 'Sector 2',
        country_id: 1,
        state_id: 1,
        district_id: 1,
      },
    ],
    children,
    domains: [
      { id: 1, domain_name: 'Cognitive Development' },
      { id: 2, domain_name: 'Language & Literacy Development' },
      { id: 3, domain_name: 'Physical & Motor Development' },
      { id: 4, domain_name: 'Socio-Emotional Development' },
      { id: 5, domain_name: 'Approaches towards Learning' },
      { id: 6, domain_name: 'Creativity Development' },
    ],
    competencies: [
      { id: 1, domain_id: 1, name: 'Classification', description: 'Sorting and grouping objects by shared features such as colour, shape and size.' },
      { id: 2, domain_id: 1, name: 'Patterns', description: 'Noticing, copying and continuing repeating patterns in objects, sounds and movements.' },
      { id: 3, domain_id: 1, name: 'Number Concept', description: 'Understanding quantity, counting with meaning and recognising numerals.' },
      { id: 4, domain_id: 1, name: 'Seriation', description: 'Comparing and arranging objects in order of size, length or quantity.' },
      { id: 5, domain_id: 2, name: 'Vocabulary and Expression', description: 'Using a growing range of words and sentences to share ideas and describe events.' },
      { id: 6, domain_id: 2, name: 'Listening Comprehension', description: 'Listening with attention and understanding stories and conversations.' },
      { id: 7, domain_id: 2, name: 'Emergent Reading & Book Handling', description: 'Exploring books, telling pictures from text and following print in the right direction.' },
      { id: 8, domain_id: 2, name: 'Emergent Writing', description: 'Moving from scribbles and drawings towards writing letters and words to express ideas.' },
      { id: 10, domain_id: 3, name: 'Gross Motor Development', description: 'Balance, coordination and control of the large muscles while running, jumping and throwing.' },
      { id: 11, domain_id: 3, name: 'Fine Motor Development', description: 'Control and coordination of the small muscles of the hands and fingers.' },
      { id: 12, domain_id: 4, name: 'Interaction', description: 'Playing and working together with other children and adults.' },
      { id: 13, domain_id: 4, name: 'Sharing with Others', description: 'Willingly sharing materials, space and attention with peers.' },
      { id: 14, domain_id: 4, name: 'Emotional Expression and Regulation', description: 'Recognising feelings and responding to them in appropriate ways.' },
      { id: 15, domain_id: 5, name: 'Initiative', description: 'Starting activities and trying new things without being asked.' },
      { id: 16, domain_id: 5, name: 'Task Persistence', description: 'Staying focused on an activity until it is finished, even with distractions.' },
      { id: 17, domain_id: 6, name: 'Creative Expression', description: 'Expressing ideas through art, craft, music, dance and play.' },
      { id: 18, domain_id: 6, name: 'Imagination', description: 'Pretend play, storytelling and thinking about what could happen next.' },
    ],
    assessments: seedAssessments(children),
    countries: [{ id: 1, name: 'India' }],
    states: [
      { id: 1, name: 'Rajasthan', country_id: 1 },
      { id: 2, name: 'Uttar Pradesh', country_id: 1 },
    ],
    districts: [
      { id: 1, name: 'Jaipur', state_id: 1 },
      { id: 2, name: 'Ajmer', state_id: 1 },
      { id: 3, name: 'Lucknow', state_id: 2 },
    ],
    projects: {
      '1': ['Jaipur Urban', 'Sanganer'],
      '2': ['Ajmer City'],
      '3': ['Lucknow Central'],
    },
    sectors: {
      '1|Jaipur Urban': ['Sector 1', 'Sector 4'],
      '1|Sanganer': ['Sector 2'],
      '2|Ajmer City': ['Sector 1'],
      '3|Lucknow Central': ['Sector 3'],
    },
  };
}
