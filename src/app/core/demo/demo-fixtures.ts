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
const SESSION_DATES = ['2026-07-14', '2026-08-18', '2026-09-15', '2026-09-29'];

/** Competencies assessed so far at each centre, and in how many sessions. */
const SEED_PLAN: Record<number, [competency: number, sessions: number][]> = {
  // Shivaji Nagar is well into the year. Number concept (4) and Emergent writing (9) haven't
  // started (the e2e tests record the first Number concept results).
  1: [
    [2, 3],
    [3, 2],
    [5, 1],
    [6, 2],
    [7, 2],
    [8, 1],
    [10, 2],
    [11, 2],
    [12, 2],
    [13, 1],
    [14, 2],
    [15, 2],
    [16, 1],
    [17, 2],
    [18, 1],
  ],
  // Gandhi Colony has just begun; Sanganer Gaon hasn't yet.
  2: [
    [2, 2],
    [3, 1],
    [6, 2],
    [12, 1],
  ],
};

interface SeedProfile {
  /** The first session's level (0 Beginning … 3 School Ready), give or take one. */
  start: number;
  /** Chances out of 10, for each later session, of going up or staying the same (else down). */
  up: number;
  same: number;
  /** Competencies whose latest session this student missed. */
  misses?: number[];
  /** Missed the latest session in about one competency in this many. */
  missEvery?: number;
}

/**
 * How each student's results move, so the dashboard has something to show: most improve, a
 * few stay at the same level, slip back or miss sessions.
 */
const SEED_PROFILES: Record<number, SeedProfile> = {
  1: { start: 1, up: 10, same: 0 },
  2: { start: 2, up: 10, same: 0 },
  3: { start: 1, up: 10, same: 0 },
  4: { start: 1, up: 10, same: 0, misses: [5] },
  5: { start: 0, up: 4, same: 5 },
  6: { start: 2, up: 4, same: 2 },
  7: { start: 1, up: 8, same: 1 },
  8: { start: 0, up: 5, same: 4, missEvery: 2 },
  9: { start: 1, up: 7, same: 2 },
  10: { start: 2, up: 8, same: 2 },
  11: { start: 0, up: 6, same: 3 },
  12: { start: 1, up: 7, same: 2 },
};

/** A fixed spread of numbers, so the sample data is the same on every visit. */
function spread(...values: number[]): number {
  let hash = 2166136261;
  for (const value of values) hash = Math.imul(hash ^ value, 16777619);
  hash ^= hash >>> 15;
  hash = Math.imul(hash, 0x2c1b3c6d);
  hash ^= hash >>> 12;
  return hash >>> 0;
}

function clampLevel(level: number): number {
  return Math.max(0, Math.min(LEVELS.length - 1, level));
}

function seedAssessments(children: DbChild[]): DbAssessment[] {
  const result: DbAssessment[] = [];
  let id = 1;
  for (const c of children) {
    const profile = SEED_PROFILES[c.id];
    if (!profile) continue;
    for (const [competency, sessions] of SEED_PLAN[c.anganwadi_id] ?? []) {
      const missed =
        profile.misses?.includes(competency) ||
        (!!profile.missEvery && spread(c.id, competency, 99) % profile.missEvery === 0);
      // Ishaan has no gross motor results yet (the e2e tests record his first).
      const count = c.id === 8 && competency === 10 ? 0 : missed ? sessions - 1 : sessions;
      let level = clampLevel(profile.start + (spread(c.id, competency) % 3) - 1);
      for (let attempt = 1; attempt <= count; attempt++) {
        let remarks = attempt === 1 && c.id % 3 === 0 ? 'Needed some encouragement to begin.' : '';
        if (attempt > 1) {
          const roll = spread(c.id, competency, attempt) % 10;
          const step = roll < profile.up ? 1 : roll < profile.up + profile.same ? 0 : -1;
          if (step < 0 && level > 0) remarks = 'Seemed tired and distracted today.';
          level = clampLevel(level + step);
        }
        const date = SESSION_DATES[attempt - 1];
        result.push({
          id: id++,
          child_id: c.id,
          competency_id: competency,
          anganwadi_id: c.anganwadi_id,
          attempt_number: attempt,
          observation: LEVELS[level],
          assessment_date: date,
          created_at: `${date}T05:30:00.000000Z`,
          remarks,
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
      // A worker whose account was never linked to a centre (sees no students).
      user(8, 'Neha Kumari', 'aww3@demo.in', 'aww', 'female', {
        country_id: 1,
        state_id: 1,
        district_id: 1,
        project: 'Sanganer',
        sector: 'Sector 2',
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
      { id: 2, domain_name: 'Language and Literacy Development' },
      { id: 3, domain_name: 'Physical and Motor Development' },
      { id: 4, domain_name: 'Socio-Emotional Development' },
      { id: 5, domain_name: 'Approaches towards Learning' },
      { id: 6, domain_name: 'Creativity Development' },
    ],
    // Names and descriptions exactly as the real API returns them.
    competencies: [
      {
        id: 2,
        domain_id: 1,
        name: 'Classification',
        description:
          'Classification is an important concept related to identifying different characteristics of things and categorizing them according to these characteristics. Children develop these skills by observing and examining different aspects of objects and identifying how these are alike or different.',
      },
      {
        id: 3,
        domain_id: 1,
        name: 'Patterns',
        description:
          'Understanding patterns is a foundational math skill upon which many mathematical concepts are based. For example, multiplication and counting both require an understanding of patterns. Patterns help children make logical connections between things, events, etc., by using their reasoning and problem-solving skills. Patterns can be found everywhere in our lives (e.g., the daily routine that we follow).',
      },
      {
        id: 4,
        domain_id: 1,
        name: 'Number concept',
        description:
          'Learning number concepts is one of the most important competencies and sets the foundation for understanding numbers. Number concepts involve a child’s ability to recognize numerals, one-to-one correspondence, counting and simple operations.',
      },
      {
        id: 5,
        domain_id: 1,
        name: 'Seriation',
        description:
          'Seriation is an important concept related to measuring objects and categorizing them accordingly. At preschool age, children develop these skills for sequencing and putting objects in order, such as from smallest to largest, lightest to heaviest or least to most.',
      },
      {
        id: 6,
        domain_id: 2,
        name: 'Vocabulary and expression',
        description:
          'Early vocabulary development is an important predictor of success in reading. A strong vocabulary enables a child to understand and communicate more effectively.',
      },
      {
        id: 7,
        domain_id: 2,
        name: 'Listening comprehension',
        description:
          'Listening comprehension is important for a child to understand what is being said. It includes a child’s receptive language skills as well as interpretation of what he/she hears.',
      },
      {
        id: 8,
        domain_id: 2,
        name: 'Emergent reading – book handling',
        description:
          'Book handling is a predictor of successful reading skills. It helps children to develop bonds with books, understand books, letters, words, and directionality, and to understand that print has meaning.',
      },
      {
        id: 9,
        domain_id: 2,
        name: 'Emergent writing',
        description:
          'Writing is an important skill. Between the ages of 3 to 6 years, children begin to learn to write, and by the time they are 6 years old, they should be able to write some simple words and/or their names.',
      },
      {
        id: 10,
        domain_id: 3,
        name: 'Gross motor development',
        description:
          'Gross motor development involves large muscle movements in arms, legs and the torso, and includes skills, such as walking, running, climbing, throwing, kicking, and catching. A child needs considerable practice to develop gross motor skills.',
      },
      {
        id: 11,
        domain_id: 3,
        name: 'Fine motor development',
        description:
          'Fine motor development includes the development of small finger muscles and skills such as picking up things, threading beads, tying shoelaces, colouring within the boundary and stacking objects of different sizes.',
      },
      {
        id: 12,
        domain_id: 4,
        name: 'Interaction',
        description:
          'Interaction between young children and their peers and adults is important during the early years. Through interactions, children learn a language and social skills. Children who are given enough opportunities to interact and communicate through play-based activities tend to have a stronger social relationship with others.',
      },
      {
        id: 13,
        domain_id: 4,
        name: 'Sharing with others',
        description:
          'Sharing is an important social skill. Children at an early age build these skills through observation.',
      },
      {
        id: 14,
        domain_id: 4,
        name: 'Emotional expression and regulation',
        description:
          'Emotional regulation determines a child’s ability to express feelings and manage her/his emotions. Emotional regulation is a crucial skill for the well-being of the child. It is important that parents, caregivers and teachers provide support for the child’s emotional stability to help her/him grow and develop optimally.',
      },
      {
        id: 15,
        domain_id: 5,
        name: 'Initiative',
        description:
          'Learning to take initiative is a behaviour that helps children navigate their lives with confidence. By taking initiative, children become more proactive and look for different ways to grow, study, excel and practice leadership skills.',
      },
      {
        id: 16,
        domain_id: 5,
        name: 'Task persistence',
        description:
          'Task persistence is a skill that is important for children in classroom activities as well as in personal endeavours. It is important that children are encouraged to undertake challenging activities and tasks. This will help them learn to persevere, complete tasks and activities, and not give up.',
      },
      {
        id: 17,
        domain_id: 6,
        name: 'Creative expression',
        description:
          'One of the best ways for children to learn about new concepts is to ignite their interest through hands- on experience. Besides giving young children the chance to explore different concepts through their senses, the experience helps develop other useful skills, including problem-solving and perseverance.',
      },
      {
        id: 18,
        domain_id: 6,
        name: 'Imagination',
        description:
          'Imagination is the door to possibilities. It is where creativity and thinking outside the box begin in child development. Imaginative and creative play is how children learn about the world. During imaginative play, children manipulate materials, express themselves verbally and non-verbally, plan (intentionally or unintentionally), act, interact, react, and try different roles.',
      },
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
