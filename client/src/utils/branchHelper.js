// ─── Branch Helper & Normalizer ───────────────────────────────────────────────
// Ensures any full branch name (e.g. "Computer Science and Engineering",
// "Electronics and Communication Technology", "Mechanical", "mech", "ai")
// is instantly converted into its canonical short form (CSE, ECE, MEC, CST, etc.).

export const BRANCHES = [
  'CSE', 'CST', 'AIML', 'CAI', 'DS', 'ECE', 'ECT', 'EEE', 'MEC', 'CIVIL', 'IT'
];

export const BRANCH_NAMES = {
  CSE: 'Computer Science & Engineering',
  CST: 'Computer Science & Technology',
  AIML: 'Artificial Intelligence & Machine Learning',
  CAI: 'Computer & Artificial Intelligence',
  DS: 'Data Science & Engineering',
  ECE: 'Electronics & Communication Engineering',
  ECT: 'Electronics & Communication Technology',
  EEE: 'Electrical & Electronics Engineering',
  MEC: 'Mechanical Engineering',
  CIVIL: 'Civil Engineering',
  IT: 'Information Technology',
};

export const BRANCH_OPTIONS = [
  { code: 'CSE', label: 'CSE — Computer Science & Engineering' },
  { code: 'CST', label: 'CST — Computer Science & Technology' },
  { code: 'AIML', label: 'AIML — Artificial Intelligence & Machine Learning' },
  { code: 'CAI', label: 'CAI — Computer & Artificial Intelligence' },
  { code: 'DS', label: 'DS — Data Science & Engineering' },
  { code: 'ECE', label: 'ECE — Electronics & Communication Engineering' },
  { code: 'ECT', label: 'ECT — Electronics & Communication Technology' },
  { code: 'EEE', label: 'EEE — Electrical & Electronics Engineering' },
  { code: 'MEC', label: 'MEC — Mechanical Engineering' },
  { code: 'CIVIL', label: 'CIVIL — Civil Engineering' },
  { code: 'IT', label: 'IT — Information Technology' },
];

export function normalizeBranch(raw) {
  if (!raw) return '';
  const b = String(raw).trim().toUpperCase()
    .replace(/\s+/g, ' ')
    .replace(/[^A-Z0-9 &]/g, '');

  if (BRANCHES.includes(b)) return b;

  const MAP = [
    ['COMPUTER SCIENCE AND ENGINEERING', 'CSE'],
    ['COMPUTER SCIENCE & ENGINEERING', 'CSE'],
    ['COMPUTER SCIENCE ENGINEERING', 'CSE'],
    // CST — BEFORE generic 'COMPUTER SCIENCE'
    ['COMPUTER SCIENCE AND TECHNOLOGY', 'CST'],
    ['COMPUTER SCIENCE & TECHNOLOGY', 'CST'],
    ['COMPUTER SCIENCE TECHNOLOGY', 'CST'],
    // Generic CSE — after CST
    ['COMPUTER SCIENCE', 'CSE'],
    ['BTECH CSE', 'CSE'],
    ['B TECH CSE', 'CSE'],
    ['B.TECH CSE', 'CSE'],
    ['ARTIFICIAL INTELLIGENCE AND MACHINE LEARNING', 'AIML'],
    ['ARTIFICIAL INTELLIGENCE & MACHINE LEARNING', 'AIML'],
    ['ARTIFICIAL INTELLIGENCE MACHINE LEARNING', 'AIML'],
    ['ARTIFICIAL INTELLIGENCE', 'AIML'],
    ['AI AND ML', 'AIML'],
    ['AI & ML', 'AIML'],
    ['AIML', 'AIML'],
    ['COMPUTER AND ARTIFICIAL INTELLIGENCE', 'CAI'],
    ['COMPUTER & ARTIFICIAL INTELLIGENCE', 'CAI'],
    ['COMPUTER ARTIFICIAL INTELLIGENCE', 'CAI'],
    ['DATA SCIENCE AND ENGINEERING', 'DS'],
    ['DATA SCIENCE & ENGINEERING', 'DS'],
    ['DATA SCIENCE', 'DS'],
    ['DATA SCI', 'DS'],
    // ── CRITICAL: ECT BEFORE generic ECE ──
    ['ELECTRONICS AND COMMUNICATION TECHNOLOGY', 'ECT'],
    ['ELECTRONICS & COMMUNICATION TECHNOLOGY', 'ECT'],
    ['ELECTRONICS COMMUNICATION TECHNOLOGY', 'ECT'],
    // ECE full names
    ['ELECTRONICS AND COMMUNICATION ENGINEERING', 'ECE'],
    ['ELECTRONICS & COMMUNICATION ENGINEERING', 'ECE'],
    ['ELECTRONICS COMMUNICATION ENGINEERING', 'ECE'],
    // Generic ECE — AFTER ECT
    ['ELECTRONICS AND COMMUNICATION', 'ECE'],
    ['ELECTRONICS & COMMUNICATION', 'ECE'],
    ['ELECTRICAL AND ELECTRONICS ENGINEERING', 'EEE'],
    ['ELECTRICAL & ELECTRONICS ENGINEERING', 'EEE'],
    ['ELECTRICAL ELECTRONICS ENGINEERING', 'EEE'],
    ['ELECTRICAL AND ELECTRONICS', 'EEE'],
    ['ELECTRICAL & ELECTRONICS', 'EEE'],
    ['MECHANICAL ENGINEERING', 'MEC'],
    ['MECH', 'MEC'],
    ['MECHANICAL', 'MEC'],
    ['CIVIL ENGINEERING', 'CIVIL'],
    ['CIVIL ENGG', 'CIVIL'],
    ['CIVIL', 'CIVIL'],
    ['INFORMATION TECHNOLOGY', 'IT'],
    ['INFORMATION TECH', 'IT'],
    ['INFO TECH', 'IT'],
    ['AI', 'AIML'],
    ['CSD', 'DS'],
    ['DS', 'DS'],
    ['IT', 'IT'],
  ];

  for (const [pattern, abbr] of MAP) {
    if (b === pattern || b.includes(pattern)) return abbr;
  }

  const stripped = b.replace(/\s+/g, '');
  if (BRANCHES.includes(stripped)) return stripped;

  return stripped.slice(0, 10) || b.slice(0, 10);
}
