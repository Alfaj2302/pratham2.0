// ============================================================
// FRAMEWORK CONFIG
// Pratham 2.0 — Workspace MFE
//
// Defines:
//   • Framework-specific metadata columns for Content / QS / Course sheets
//   • All dropdown lookup values used in the Excel template
//   • Column → API field name mapping (used by parser)
// ============================================================

export type FrameworkId = 'pos-framework' | 'scp-framework';

// ─── Lookup Values ────────────────────────────────────────────

export const LOOKUP = {
  // ── Shared ──────────────────────────────────────────────────
  // youtube uses mimeType video/x-youtube; URL goes in the File/Content URL column — no file download
  FILE_TYPES: ['pdf', 'zip', 'mp4', 'mp3', 'h5p', 'youtube'],
  QUESTION_TYPES: ['MCQ', 'Arrange', 'Match', 'Subjective'],
  // Parent = question belongs to this QS only (not independently searchable)
  // Public = question is publicly accessible / independently discoverable (API value: 'Default')
  VISIBILITY_TYPES: ['Parent', 'Public'],
  CHILD_TYPES: ['content', 'questionset'],
  FRAMEWORKS: ['pos-framework', 'scp-framework'],
  LICENSES: ['CC BY 4.0', 'CC BY-SA 4.0', 'CC BY-NC 4.0', 'All Rights Reserved'],
  AUDIENCES: ['Student', 'Teacher', 'Parent', 'Administrator'],
  BLOOMS_LEVELS: ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'],
  DIFFICULTY_LEVELS: ['Easy', 'Medium', 'Hard'],
  // Friendly labels shown in the Excel template; mapped to the raw API
  // values online / offline / ai via EVALUATION_TYPE_LABEL_TO_VALUE.
  EVALUATION_TYPES: ['Auto-Graded', 'Facilitator-Graded', 'AI-Assisted'],
  ASSESSMENT_TYPES: ['Pre Test', 'Post Test', 'Other', 'Unit Test', 'Mock Test', 'Eligibility Test'],

  // ── Languages ───────────────────────────────────────────────
  LANGUAGES: [
    'English', 'Hindi', 'Marathi', 'Tamil', 'Telugu', 'Kannada',
    'Bengali', 'Gujarati', 'Odia', 'Punjabi', 'Sanskrit', 'Urdu',
    'Assamese', 'Malayalam', 'Kashmiri',
  ],

  // Content Language — single-select string field (contentLanguage), from content form-read API
  CONTENT_LANGUAGES: [
    'English', 'Marathi', 'Hindi', 'Assamese', 'Bengali', 'Gujarati',
    'Kannada', 'Kashmiri', 'Khasi', 'Malayalam', 'Manipuri', 'Odia',
    'Punjabi', 'Rabha (Rongdani)', 'Sanskrit', 'Tamil', 'Telugu', 'Urdu',
  ],

  // ── POS Framework ───────────────────────────────────────────
  // Sourced from pos-framework taxonomy read API (Live terms only)

  // 3 top-level domains from pos-framework API
  POS_DOMAINS: [
    'Learning for School',
    'Learning for Work',
    'Learning for Life',
  ],

  // 12 sub-domain terms from pos-framework API (Live terms only)
  POS_SUB_DOMAINS: [
    'Academics',
    'Career Exploration',
    'Creative Arts',
    'Employee Training',
    'Environment Education',
    'General Training & Capacity Building',
    'Growth & Learning',
    'Health & Wellbeing',
    'Inclusive Education',
    'Inclusive Learning',
    'Media Moments',
    'New Age Skills',
    'Sports',
  ],

  // Full subject list from pos-framework API (Live terms only, sorted alphabetically)
  POS_SUBJECTS: [
    'Activity Videos',
    'Agriculture Education',
    'Apparel',
    'Art & Culture',
    'ASER',
    'Assamese',
    'Automotive',
    'Awareness & Advocacy',
    'Beauty',
    'Bengali',
    'Biodiversity & Conservation',
    'Career Awareness',
    'Climate Education',
    'Computational Thinking',
    'Construction',
    'Crafts & Design',
    'Daily-living & Independence',
    'Data Computing/Data Entry',
    'Data, Monitoring & Evaluation',
    'Digital Games',
    'Digital Skill Building',
    'Early Learning & School Readiness',
    'Electrical',
    'English',
    'Essential Awareness',
    'Everyday Skills',
    'Finance & Accounts',
    'Games',
    'General Health Awareness',
    'General Skills',
    'General/Other',
    'Good Contractor Program',
    'Gujarati',
    'HR',
    'Healthcare',
    'Hindi',
    'Holistic Development',
    'Home Science',
    'Hospitality & Tourism',
    'Indian Culture & History',
    'Individual Sports',
    'Innovative Strategies',
    'ITES',
    'Job Readiness',
    'Kannada',
    'Khasi',
    'Knowledge Videos',
    'Leadership',
    'Low Tech',
    'Malayalam',
    'Marathi',
    'Math',
    'Media & Graphics',
    'Mental Health',
    'Natural Resources',
    'Odia',
    'Operational Management',
    'Painting',
    'Partnerships & External Engagement',
    'Performing Arts',
    'Physical Health',
    'Planning & Strategy',
    'Podcasts',
    'Program & Pedagogy',
    'Program Communication',
    'Punjabi',
    'Rabha (Rongdani)',
    'Rhymes & Lullabies',
    'Riddles',
    'School Readiness',
    'Science',
    'Social Science',
    'Social Studies',
    'Spoken English',
    'Stories',
    'Subject Specific Learning',
    'Sustainable Living',
    'Tamil',
    'Team Games',
    'Technical Skills',
    'Tech for Environment',
    'Telugu',
    'Therapy & Rehabilitation',
    'Training & Capacity Building',
    'TV Episodes',
    'Urdu',
    'Visual Arts',
    'Waterworks Management & Sanitation',
    'Welding',
    'Yoga',
  ],

  POS_GRADE_LEVELS: [
    'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5',
    'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10',
    'Grade 11', 'Grade 12',
  ],

  // From content form-read API (range values for medium field)
  POS_MEDIUMS: ['English', 'Hindi', 'Marathi', 'Tamil', 'Telugu', 'Kannada', 'Bengali'],

  // From content form-read API (range values for targetAgeGroup field)
  POS_TARGET_AGE_GROUPS: [
    '0-3 yrs', '3-6 yrs', '6-8 yrs', '8-11 yrs', '11-14 yrs', '14-18 yrs', '18 yrs +',
  ],

  // From content form-read API (range values for primaryUser field)
  POS_PRIMARY_USERS: ['Parents/Care givers', 'Educators', 'Learners/Children'],

  POS_PRIMARY_CATEGORIES_CONTENT: [
    'Learning Resource',
    'Explanation Content',
    'Teacher Resource',
    'Story',
    'Activity',
    'Interactive',
    'eTextbook',
  ],

  POS_PRIMARY_CATEGORIES_QS: ['Practice Question Set', 'Course Assessment', 'Exam Question'],

  // From content form-read API (range values for program field)
  POS_PROGRAMS: [
    'Hamara Gaon',
    'Early Childhood Education',
    'Inclusive Education (ENABLE)',
    'Elementary',
    'Second Chance',
    'Digital Initiatives',
    'Vocational Training',
    'Pratham Council For Vulnerable Children',
    'Annual Status of Education Report',
    'Pragyanpath',
    'Open School',
    'Experimento India',
    'Camp to Club',
    'Creativity Club',
    'Education for Education',
  ],

  // ── SCP Framework ───────────────────────────────────────────
  // SCP board terms from scp-framework read API (Live terms only; Retired terms excluded)
  SCP_BOARDS: [
    'BBOSE',
    'Maharashtra State Education Board',
    'Bihar State Board',
    'Bihar Board',
    'Karnataka State Education Board',
    'Tamil Nadu State Board',
    'Telangana Open School Society',
    'Andhra Pradesh Open School Society',
    'Gujarat State Open School',
    'Rajasthan State Open School',
    'Chhattisgarh State Open Board',
    'MP State Open School',
    'Odisha Board of Secondary Education',
    'NIOS - UP',
    'NIOS - Bihar',
    'NIOS - MP',
    'NIOS - Gujarat',
    'Co-Curricular',
  ],

  // SCP medium terms from scp-framework read API (Live terms only; Bengali & English are NOT in SCP)
  SCP_MEDIUMS: ['Marathi', 'Telugu', 'Kannada', 'Odia', 'Tamil', 'Urdu', 'Hindi', 'Gujarati'],

  // SCP framework only has Grade 10 as a Live gradeLevel term
  SCP_GRADE_LEVELS: ['Grade 10'],

  // SCP subject terms from scp-framework read API (Live terms only)
  SCP_SUBJECTS: [
    'Telugu',
    'Painting',
    'General/Other',
    'Hindi',
    'English',
    'Yoga',
    'Home Science',
    'Beyond Classroom',
    'Odia',
    'Kannada',
    'Urdu',
    'Math',
    'Gujarati',
    'Tamil',
    'Data Computing/Data Entry',
    'Marathi',
    'Science',
    'Social Studies',
    'Social Science',
    'Indian Culture & History',
    'Sanskrit',
    'Business Studies',
  ],

  // SCP courseType terms from scp-framework read API (Live terms only)
  SCP_COURSE_TYPES: ['Foundation Course', 'Main Course', 'Exam Prep', 'Enablers'],

  SCP_PRIMARY_CATEGORIES_CONTENT: [
    'Learning Resource',
    'Explanation Content',
    'Teacher Resource',
    'Study Material',
  ],

  SCP_PRIMARY_CATEGORIES_QS: ['Practice Question Set', 'Course Assessment'],

  SCP_PROGRAMS: ['Second Chance', 'Open School'],
} as const;

// ─── Evaluation type label ↔ API value mapping ────────────────
// The Excel template shows friendly labels; the platform API expects
// the raw values online / offline / ai.

export const EVALUATION_TYPE_LABEL_TO_VALUE: Record<string, string> = {
  'Auto-Graded': 'online',
  'Facilitator-Graded': 'offline',
  'AI-Assisted': 'ai',
};

const EVALUATION_TYPE_VALUE_TO_LABEL: Record<string, string> = {
  online: 'Auto-Graded',
  offline: 'Facilitator-Graded',
  ai: 'AI-Assisted',
};

// Normalizes a parsed cell to the label form: raw API values from older
// templates ("online") become labels ("Auto-Graded"); labels pass through.
export const normalizeEvaluationType = (
  val: string | undefined
): string | undefined => {
  if (!val || String(val).trim() === '') return undefined;
  const str = String(val).trim();
  return EVALUATION_TYPE_VALUE_TO_LABEL[str.toLowerCase()] ?? str;
};

// ─── Multi-select value splitter ──────────────────────────────
// Multi-select cells accept pipe-separated (A|B) or comma-separated (A, B)
// values. A few option values themselves contain a comma (e.g.
// "Data, Monitoring & Evaluation"), so those are shielded with a placeholder
// before comma-splitting and restored afterwards.

const COMMA_OPTION_VALUES: string[] = (
  Object.values(LOOKUP) as readonly (readonly string[])[]
)
  .flat()
  .filter((v) => v.includes(','));

export const splitMultiValue = (val: string | undefined | null): string[] => {
  if (val === undefined || val === null) return [];
  const str = String(val).trim();
  if (!str) return [];

  if (str.includes('|')) {
    return str.split('|').map((s) => s.trim()).filter(Boolean);
  }

  let shielded = str;
  COMMA_OPTION_VALUES.forEach((option, i) => {
    shielded = shielded.split(option).join(`\u0000${i}\u0000`);
  });

  return shielded
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.replace(/\u0000(\d+)\u0000/g, (m, i) => COMMA_OPTION_VALUES[Number(i)] ?? m));
};

// ─── POS Identifier Maps ──────────────────────────────────────
// Maps display name (shown in Excel dropdown) → platform identifier
// Required because POS course form-read uses targetDomainIds / targetSubDomainIds /
// targetSubjectIds with output:"identifier" — same pattern as SCP.

export const POS_DOMAIN_NAME_TO_ID: Record<string, string> = {
  'Learning for School': 'pos-framework_domain_learningforschool',
  'Learning for Work':   'pos-framework_domain_learningforwork',
  'Learning for Life':   'pos-framework_domain_learningforlife',
};

export const POS_SUB_DOMAIN_NAME_TO_ID: Record<string, string> = {
  'Academics':             'pos-framework_subdomain_academics',
  'Career Exploration':    'pos-framework_subdomain_careerexploration',
  'Creative Arts':         'pos-framework_subdomain_creativearts',
  'Employee Training':     'pos-framework_subdomain_employeetraining',
  'Environment Education': 'pos-framework_subdomain_environmenteducation',
  'General Training & Capacity Building': 'pos-framework_subdomain_generaltrainingandcapacitybuilding',
  'Growth & Learning':     'pos-framework_subdomain_growthplayfullearning',
  'Health & Wellbeing':    'pos-framework_subdomain_healthwellbeing',
  'Inclusive Education':   'pos-framework_subdomain_inclusiveeducation',
  'Inclusive Learning':    'pos-framework_subdomain_inclusivelearning',
  'Media Moments':         'pos-framework_subdomain_mediamoments',
  'New Age Skills':        'pos-framework_subdomain_newageskills',
  'Sports':                'pos-framework_subdomain_sports',
};

export const POS_SUBJECT_NAME_TO_ID: Record<string, string> = {
  'Activity Videos':                    'pos-framework_subject_activityvideos',
  'Agriculture Education':              'pos-framework_subject_agricultureeducation',
  'Apparel':                            'pos-framework_subject_apparel',
  'Art & Culture':                      'pos-framework_subject_artandculture',
  'ASER':                               'pos-framework_subject_aser',
  'Assamese':                           'pos-framework_subject_assamese',
  'Automotive':                         'pos-framework_subject_automotive',
  'Awareness & Advocacy':               'pos-framework_subject_awarenessandadvocacy',
  'Beauty':                             'pos-framework_subject_beauty',
  'Bengali':                            'pos-framework_subject_bengali',
  'Biodiversity & Conservation':        'pos-framework_subject_biodiversityandconservation',
  'Career Awareness':                   'pos-framework_subject_careerawareness',
  'Climate Education':                  'pos-framework_subject_climateeducation',
  'Computational Thinking':             'pos-framework_subject_computationalthinking',
  'Construction':                       'pos-framework_subject_construction',
  'Crafts & Design':                    'pos-framework_subject_craftsanddesign',
  'Daily-living & Independence':        'pos-framework_subject_dailylivingandindependence',
  'Data Computing/Data Entry':          'pos-framework_subject_datacomputingdataentry',
  'Data, Monitoring & Evaluation':      'pos-framework_subject_datamonitoringevaluation',
  'Digital Games':                      'pos-framework_subject_digitalgames',
  'Digital Skill Building':             'pos-framework_subject_digitalskillbuilding',
  'Early Learning & School Readiness':  'pos-framework_subject_earlylearningandschoolreadiness',
  'Electrical':                         'pos-framework_subject_electrical',
  'English':                            'pos-framework_subject_english',
  'Essential Awareness':                'pos-framework_subject_essentialawareness',
  'Everyday Skills':                    'pos-framework_subject_everydayskills',
  'Finance & Accounts':                 'pos-framework_subject_financeandaccounts',
  'Games':                              'pos-framework_subject_games',
  'General Health Awareness':           'pos-framework_subject_generalhealthawareness',
  'General Skills':                     'pos-framework_subject_generalskills',
  'General/Other':                      'pos-framework_subject_generalother',
  'Good Contractor Program':            'pos-framework_subject_goodcontractorprogram',
  'Gujarati':                           'pos-framework_subject_gujarati',
  'HR':                                 'pos-framework_subject_hr',
  'Healthcare':                         'pos-framework_subject_healthcare',
  'Hindi':                              'pos-framework_subject_hindi',
  'Holistic Development':               'pos-framework_subject_holisticdevelopment',
  'Home Science':                       'pos-framework_subject_homescience',
  'Hospitality & Tourism':              'pos-framework_subject_hospitalityandtourism',
  'Indian Culture & History':           'pos-framework_subject_indiancultureandhistory',
  'Individual Sports':                  'pos-framework_subject_individualsports',
  'Innovative Strategies':              'pos-framework_subject_innovativestrategies',
  'ITES':                               'pos-framework_subject_ites',
  'Job Readiness':                      'pos-framework_subject_jobreadiness',
  'Kannada':                            'pos-framework_subject_kannada',
  'Khasi':                              'pos-framework_subject_khasi',
  'Knowledge Videos':                   'pos-framework_subject_knowledgevideos',
  'Leadership':                         'pos-framework_subject_leadership',
  'Low Tech':                           'pos-framework_subject_lowtech',
  'Malayalam':                          'pos-framework_subject_malayalam',
  'Marathi':                            'pos-framework_subject_marathi',
  'Math':                               'pos-framework_subject_math',
  'Media & Graphics':                   'pos-framework_subject_mediaandgraphics',
  'Mental Health':                      'pos-framework_subject_mentalhealth',
  'Natural Resources':                  'pos-framework_subject_naturalresources',
  'Odia':                               'pos-framework_subject_odia',
  'Operational Management':             'pos-framework_subject_operationalmanagement',
  'Painting':                           'pos-framework_subject_painting',
  'Partnerships & External Engagement': 'pos-framework_subject_partnershipsandexternalengagement',
  'Performing Arts':                    'pos-framework_subject_performingarts',
  'Physical Health':                    'pos-framework_subject_physicalhealth',
  'Planning & Strategy':                'pos-framework_subject_planningstrategy',
  'Podcasts':                           'pos-framework_subject_podcasts',
  'Program & Pedagogy':                 'pos-framework_subject_programandpedagogy',
  'Program Communication':              'pos-framework_subject_programcommunication',
  'Punjabi':                            'pos-framework_subject_punjabi',
  'Rabha (Rongdani)':                   'pos-framework_subject_rabha',
  'Rhymes & Lullabies':                 'pos-framework_subject_rhymesandlullabies',
  'Riddles':                            'pos-framework_subject_riddles',
  'School Readiness':                   'pos-framework_subject_schoolreadiness',
  'Science':                            'pos-framework_subject_science',
  'Social Science':                     'pos-framework_subject_socialscience',
  'Social Studies':                     'pos-framework_subject_socialstudies',
  'Spoken English':                     'pos-framework_subject_spokenenglish',
  'Stories':                            'pos-framework_subject_stories',
  'Subject Specific Learning':          'pos-framework_subject_subjectspecificlearning',
  'Sustainable Living':                 'pos-framework_subject_sustainableliving',
  'Tamil':                              'pos-framework_subject_tamil',
  'Team Games':                         'pos-framework_subject_teamgames',
  'Technical Skills':                   'pos-framework_subject_technicalskills',
  'Tech for Environment':               'pos-framework_subject_techforenvironment',
  'Telugu':                             'pos-framework_subject_telugu',
  'Therapy & Rehabilitation':           'pos-framework_subject_therapyandrehabilitation',
  'Training & Capacity Building':       'pos-framework_subject_trainingandcapacitybuilding',
  'TV Episodes':                        'pos-framework_subject_tvepisodes',
  'Urdu':                               'pos-framework_subject_urdu',
  'Visual Arts':                        'pos-framework_subject_visualarts',
  'Waterworks Management & Sanitation': 'pos-framework_subject_waterworksmanagementandsanitation',
  'Welding':                            'pos-framework_subject_welding',
  'Yoga':                               'pos-framework_subject_yoga',
};

// ─── SCP Identifier Maps ──────────────────────────────────────
// Maps display name (shown in Excel dropdown) → platform identifier
// Required because SCP course form-read uses target*Ids fields with output:"identifier"

export const SCP_BOARD_NAME_TO_ID: Record<string, string> = {
  'Andhra Pradesh Open School Society': 'scp-framework_board_andhrapradeshopenschoolsociety',
  'Chhattisgarh State Open Board':      'scp-framework_board_chattisgarhstateopenboard',
  'Karnataka State Education Board':    'scp-framework_board_karnatakastateeducationboard',
  'Maharashtra State Education Board':  'scp-framework_board_maharashtraeducationboard',
  'MP State Open School':               'scp-framework_board_mpstateopenschool',
  'Odisha Board of Secondary Education':'scp-framework_board_odishaboardofsecondaryeducation',
  'Rajasthan State Open School':        'scp-framework_board_rajasthanstateopenschool',
  'Tamil Nadu State Board':             'scp-framework_board_tamilnadustateboard',
  'Telangana Open School Society':      'scp-framework_board_telanganaopenschoolsociety',
  'NIOS - Bihar':                       'scp-framework_board_niosbihar',
  'NIOS - Gujarat':                     'scp-framework_board_niosgujarat',
  'NIOS - MP':                          'scp-framework_board_niosmp',
  'NIOS - UP':                          'scp-framework_board_niosup',
  'BBOSE':                              'scp-framework_board_bbose',
  'Bihar State Board':                  'scp-framework_board_biharstateboard',
  'Gujarat State Open School':          'scp-framework_board_gujaratsos',
  'Bihar Board':                        'scp-framework_board_bihar-board',
  'Co-Curricular':                      'scp-framework_board_cocurricular',
};

export const SCP_MEDIUM_NAME_TO_ID: Record<string, string> = {
  'Marathi':  'scp-framework_medium_marathi',
  'Telugu':   'scp-framework_medium_telugu',
  'Kannada':  'scp-framework_medium_kannada',
  'Odia':     'scp-framework_medium_odia',
  'Tamil':    'scp-framework_medium_tamil',
  'Urdu':     'scp-framework_medium_urdu',
  'Hindi':    'scp-framework_medium_hindi',
  'Gujarati': 'scp-framework_medium_gujarati',
};

export const SCP_GRADE_NAME_TO_ID: Record<string, string> = {
  'Grade 10': 'scp-framework_gradelevel_grade10',
};

export const SCP_SUBJECT_NAME_TO_ID: Record<string, string> = {
  'Telugu':                    'scp-framework_subject_telugu',
  'Painting':                  'scp-framework_subject_painting',
  'General/Other':             'scp-framework_subject_general-other',
  'Hindi':                     'scp-framework_subject_hindi',
  'English':                   'scp-framework_subject_english',
  'Yoga':                      'scp-framework_subject_yoga',
  'Home Science':              'scp-framework_subject_homescience',
  'Beyond Classroom':          'scp-framework_subject_beyond-classroom',
  'Odia':                      'scp-framework_subject_odia',
  'Kannada':                   'scp-framework_subject_kannada',
  'Urdu':                      'scp-framework_subject_urdu',
  'Math':                      'scp-framework_subject_math',
  'Gujarati':                  'scp-framework_subject_gujarati',
  'Tamil':                     'scp-framework_subject_tamil',
  'Data Computing/Data Entry': 'scp-framework_subject_data-computing-data-entry',
  'Marathi':                   'scp-framework_subject_marathi',
  'Science':                   'scp-framework_subject_science',
  'Social Studies':            'scp-framework_subject_socialstudies',
  'Social Science':            'scp-framework_subject_socialscience',
  'Indian Culture & History':  'scp-framework_subject_indiancultureandhistory',
  'Sanskrit':                  'scp-framework_subject_sanskrit',
  'Business Studies':          'scp-framework_subject_business-studies',
};

export const SCP_COURSE_TYPE_NAME_TO_ID: Record<string, string> = {
  'Foundation Course': 'scp-framework_coursetype_foundationcourse',
  'Main Course':       'scp-framework_coursetype_maincourse',
  'Exam Prep':         'scp-framework_coursetype_examprep',
  'Enablers':          'scp-framework_coursetype_enablers',
};

// ─── POS Domain → SubDomain → Subject association maps ────────
// Used by the validator to enforce framework taxonomy relationships.
// Data sourced from the POS framework read API (associations field).

export const POS_DOMAIN_TO_SUBDOMAINS: Record<string, string[]> = {
  'Learning for School': ['Academics', 'Growth & Learning', 'Media Moments', 'Inclusive Education'],
  'Learning for Work':   ['Career Exploration', 'Employee Training', 'General Training & Capacity Building', 'New Age Skills'],
  'Learning for Life':   ['Creative Arts', 'Health & Wellbeing', 'Sports', 'Inclusive Learning', 'Environment Education'],
};

export const POS_SUBDOMAIN_TO_SUBJECTS: Record<string, string[]> = {
  'Academics': [
    'Tamil', 'Social Studies', 'Bengali', 'Odia', 'Indian Culture & History', 'English',
    'Hindi', 'Gujarati', 'Telugu', 'General/Other', 'Yoga', 'Social Science', 'Malayalam',
    'Urdu', 'Punjabi', 'Rabha (Rongdani)', 'Math', 'Home Science', 'Painting', 'Khasi',
    'Data Computing/Data Entry', 'Science', 'Kannada', 'Marathi', 'Assamese',
  ],
  'Growth & Learning': [
    'Games', 'School Readiness', 'Riddles', 'Rhymes & Lullabies', 'Holistic Development',
    'Activity Videos', 'Knowledge Videos', 'Spoken English', 'Computational Thinking', 'Stories',
  ],
  'Media Moments': ['TV Episodes', 'Podcasts'],
  'Inclusive Education': ['Innovative Strategies', 'Subject Specific Learning', 'Early Learning & School Readiness', 'Low Tech'],
  'Career Exploration': [
    'Everyday Skills', 'ITES', 'Beauty', 'Healthcare', 'Waterworks Management & Sanitation',
    'Hospitality & Tourism', 'Media & Graphics', 'Agriculture Education', 'Good Contractor Program',
    'Apparel', 'Welding', 'Electrical', 'Career Awareness', 'Construction', 'Automotive',
  ],
  'Employee Training': [
    'General Skills', 'Program Communication', 'HR', 'Operational Management', 'Program & Pedagogy',
    'Data, Monitoring & Evaluation', 'Technical Skills', 'Partnerships & External Engagement',
    'Finance & Accounts', 'Leadership', 'Planning & Strategy',
  ],
  'New Age Skills': ['Essential Awareness', 'Digital Skill Building', 'Job Readiness'],
  'General Training & Capacity Building': ['ASER'],
  'Creative Arts': ['Crafts & Design', 'Visual Arts', 'Art & Culture', 'Performing Arts'],
  'Health & Wellbeing': ['Physical Health', 'Mental Health', 'General Health Awareness'],
  'Sports': ['Digital Games', 'Individual Sports', 'Team Games'],
  'Inclusive Learning': [
    'Therapy & Rehabilitation', 'Training & Capacity Building',
    'Awareness & Advocacy', 'Daily-living & Independence',
  ],
  'Environment Education': [
    'Climate Education', 'Natural Resources', 'Sustainable Living',
    'Tech for Environment', 'Biodiversity & Conservation',
  ],
};

// ─── Column Definitions ───────────────────────────────────────
// Each entry: { header, apiField, lookupKey (for dropdown), required, multiSelect }

export interface ColumnDef {
  header: string;        // Excel column header text (shown to user)
  apiField: string;      // Field name sent to the platform API
  lookupKey?: keyof typeof LOOKUP;  // If set → this column gets a dropdown
  required: boolean;
  multiSelect?: boolean; // true → user can enter comma- (A, B) or pipe-separated (A|B) values; sent as array to API
  note?: string;         // Hint text for the Instructions column
  aliases?: string[];    // Legacy header spellings still accepted by the parser
}

// ─── POS Framework Column Sets ────────────────────────────────

// Content form-read field order (index): appicon(1), name(2), description(3),
// keywords(4), domain(5,multiselect,required), subDomain(6,multiselect,required),
// subject(7,multiselect,required), targetAgeGroup(8,multiselect), primaryUser(9,multiselect),
// contentLanguage(10,select,required), program(11,multiselect,required).
// NOTE: license, copyright, copyrightYear are NOT in any content form-read — removed.
// NOTE: domain schema type is "string" in QS; for content the form shows it as multiselect
//       but the API accepts both string and array — we treat it as single-select for simplicity.
export const POS_CONTENT_COLUMNS: ColumnDef[] = [
  { header: 'Temp ID*',             apiField: 'tempId',          required: true,  note: 'Format: TEMP_CONTENT_N e.g. TEMP_CONTENT_1' },
  { header: 'Name*',                apiField: 'name',            required: true,  note: 'Title of the content (max 250 chars)' },
  { header: 'English Name',         apiField: 'englishName',     required: false, note: 'Title of the content in English (englishName field)' },
  { header: 'Description',          apiField: 'description',     required: false },
  { header: 'Primary Category*',    apiField: 'primaryCategory', required: true,  lookupKey: 'POS_PRIMARY_CATEGORIES_CONTENT' },
  { header: 'App Icon Drive URL',   apiField: 'appIconUrl',      required: false, note: 'Google Drive public share link for the thumbnail image (PNG/JPEG)' },
  { header: 'Domain*',              apiField: 'domain',          required: true,  lookupKey: 'POS_DOMAINS',          note: 'Single value — select one domain' },
  { header: 'Sub Domain*',          apiField: 'subDomain',       required: true,  lookupKey: 'POS_SUB_DOMAINS',      multiSelect: true, note: 'Comma or pipe-separated for multiple e.g. Academics, Sports' },
  { header: 'Subject*',             apiField: 'subject',         required: true,  lookupKey: 'POS_SUBJECTS',         multiSelect: true, note: 'Comma or pipe-separated for multiple e.g. Math, Science' },
  { header: 'Target Age Group',     apiField: 'targetAgeGroup',  required: false, lookupKey: 'POS_TARGET_AGE_GROUPS',multiSelect: true, note: 'Comma or pipe-separated for multiple e.g. 8-11 yrs, 11-14 yrs' },
  { header: 'Primary User',         apiField: 'primaryUser',     required: false, lookupKey: 'POS_PRIMARY_USERS',    multiSelect: true, note: 'Comma or pipe-separated for multiple' },
  { header: 'Content Language*',    apiField: 'contentLanguage', required: true,  lookupKey: 'CONTENT_LANGUAGES',    note: 'Single language' },
  { header: 'Program*',             apiField: 'program',         required: true,  lookupKey: 'POS_PROGRAMS',         multiSelect: true, note: 'Comma or pipe-separated for multiple' },
  { header: 'Keywords',             apiField: 'keywords',        required: false, note: 'Comma-separated keywords' },
  { header: 'Author',               apiField: 'author',          required: false },
  { header: 'Creator',              apiField: 'creator',         required: false, note: 'Name of the content creator' },
  { header: 'File/Content URL*',    apiField: 'driveUrl',        required: true,  note: 'Google Drive link OR YouTube URL (for youtube file type)' },
  { header: 'File Type*',           apiField: 'fileType',        required: true,  lookupKey: 'FILE_TYPES' },
];

// POS QS create form order: appIcon(required) → name(required) → description(required) →
// program → domain(required,select,string) → subDomain(required,select,array) →
// subject(required,nestedselect,array) → targetAgeGroup(nestedselect,array) →
// primaryUser(nestedselect,array) → contentLanguage(select,string) →
// assessmentType → evaluationType(required) → author
// Note: maxAttempts is NOT in the QS create form — removed.
// Note: domain schema type is "string" (single) per QS schema; subDomain/subject are arrays.
export const POS_QS_COLUMNS: ColumnDef[] = [
  { header: 'Temp ID*',           apiField: 'tempId',          required: true,  note: 'Format: TEMP_QS_N e.g. TEMP_QS_1' },
  { header: 'Name*',              apiField: 'name',            required: true },
  { header: 'English Name',       apiField: 'englishName',     required: false, note: 'Title in English (englishName field)' },
  { header: 'Description*',       apiField: 'description',     required: true },
  { header: 'Primary Category*',  apiField: 'primaryCategory', required: true,  lookupKey: 'POS_PRIMARY_CATEGORIES_QS' },
  { header: 'App Icon Drive URL', apiField: 'appIconUrl',      required: false, note: 'Optional — Google Drive public share link for thumbnail (PNG/JPEG)' },
  { header: 'Program',            apiField: 'program',         required: false, lookupKey: 'POS_PROGRAMS',         multiSelect: true, note: 'Comma or pipe-separated for multiple' },
  { header: 'Domain*',            apiField: 'domain',          required: true,  lookupKey: 'POS_DOMAINS',          note: 'Single value — select one domain' },
  { header: 'Sub Domain*',        apiField: 'subDomain',       required: true,  lookupKey: 'POS_SUB_DOMAINS',      multiSelect: true, note: 'Comma or pipe-separated for multiple' },
  { header: 'Subject*',           apiField: 'subject',         required: true,  lookupKey: 'POS_SUBJECTS',         multiSelect: true, note: 'Comma or pipe-separated for multiple' },
  { header: 'Target Age Group',   apiField: 'targetAgeGroup',  required: false, lookupKey: 'POS_TARGET_AGE_GROUPS',multiSelect: true, note: 'Comma or pipe-separated for multiple' },
  { header: 'Primary User',       apiField: 'primaryUser',     required: false, lookupKey: 'POS_PRIMARY_USERS',    multiSelect: true, note: 'Comma or pipe-separated for multiple' },
  { header: 'Content Language',   apiField: 'contentLanguage', required: false, lookupKey: 'CONTENT_LANGUAGES',    note: 'Single language' },
  { header: 'Assessment Type',    apiField: 'assessmentType',  required: false, lookupKey: 'ASSESSMENT_TYPES' },
  { header: 'Evaluation Type*',   apiField: 'evaluationType',  required: true,  lookupKey: 'EVALUATION_TYPES',     note: 'Auto-Graded, Facilitator-Graded or AI-Assisted' },
  { header: 'Show Feedback',      apiField: 'showFeedback',    required: false, note: 'true or false' },
  { header: 'Show Solutions',     apiField: 'showSolutions',   required: false, note: 'true or false' },
];

// POS Course create form order: appIcon(required) → name(required) → description →
// keywords → program(required,nestedselect,array) → targetDomainIds(required,select,identifier) →
// targetSubDomainIds(required,nestedselect,identifier) → targetSubjectIds(required,nestedselect,identifier) →
// targetAgeGroup(required,nestedselect,array) → primaryUser(nestedselect,array) →
// contentLanguage(select,string) → author
// Note: license, copyright, copyrightYear are NOT in the form-read — removed.
export const POS_COURSE_COLUMNS: ColumnDef[] = [
  { header: 'Temp ID*',           apiField: 'tempId',             required: true,  note: 'Format: TEMP_COURSE_N e.g. TEMP_COURSE_1' },
  { header: 'Name*',              apiField: 'name',               required: true },
  { header: 'English Name',       apiField: 'englishName',        required: false, note: 'Title in English (englishName field)' },
  { header: 'Description',        apiField: 'description',        required: false },
  { header: 'App Icon Drive URL', apiField: 'appIconUrl',         required: false, aliases: ['App Icon Drive URL*'], note: 'Optional — Google Drive public share link for thumbnail (PNG/JPEG)' },
  { header: 'Keywords',           apiField: 'keywords',           required: false, note: 'Comma-separated keywords' },
  { header: 'Program*',           apiField: 'program',            required: true,  lookupKey: 'POS_PROGRAMS',         multiSelect: true, note: 'Comma or pipe-separated for multiple' },
  { header: 'Domain*',            apiField: 'targetDomainIds',    required: true,  lookupKey: 'POS_DOMAINS',          note: 'Single value — sent as platform identifier' },
  { header: 'Sub Domain*',        apiField: 'targetSubDomainIds', required: true,  lookupKey: 'POS_SUB_DOMAINS',      multiSelect: true, note: 'Comma or pipe-separated for multiple — sent as identifiers' },
  { header: 'Subject*',           apiField: 'targetSubjectIds',   required: true,  lookupKey: 'POS_SUBJECTS',         multiSelect: true, note: 'Comma or pipe-separated for multiple — sent as identifiers' },
  { header: 'Target Age Group*',  apiField: 'targetAgeGroup',     required: true,  lookupKey: 'POS_TARGET_AGE_GROUPS',multiSelect: true, note: 'Comma or pipe-separated for multiple' },
  { header: 'Primary User',       apiField: 'primaryUser',        required: false, lookupKey: 'POS_PRIMARY_USERS',    multiSelect: true, note: 'Comma or pipe-separated for multiple' },
  { header: 'Content Language',   apiField: 'contentLanguage',    required: false, lookupKey: 'CONTENT_LANGUAGES',    note: 'Single language' },
  { header: 'Author',             apiField: 'author',             required: false },
];

// ─── SCP Framework Column Sets ────────────────────────────────

// NOTE: Content always uses pos-framework regardless of logged-in user framework.
// SCP_CONTENT_COLUMNS is intentionally the same as POS_CONTENT_COLUMNS because
// the platform form-read for content uses pos-framework for all users.
// courseType is NOT a valid content field — it only applies to QS/Courses.
export const SCP_CONTENT_COLUMNS: ColumnDef[] = POS_CONTENT_COLUMNS;

// SCP QS create form order: name(required) → description(required) →
// program(nestedselect,range:["Second Chance"]) → board(required,select) →
// medium(required,nestedselect,array) → gradeLevel(required,nestedselect,array) →
// subject(required,nestedselect,array) → courseType(required,nestedselect,array) →
// contentLanguage(select,string,"Assessment Language" label) →
// assessmentType → evaluationType(required) → author
// Note: maxAttempts is NOT in the QS create form — removed.
// Note: SCP QS has NO appIcon in the create form (only in update form) — not added.
// Note: "Language" field renamed to "Content Language", apiField changed to 'contentLanguage'.
export const SCP_QS_COLUMNS: ColumnDef[] = [
  { header: 'Temp ID*',           apiField: 'tempId',          required: true,  note: 'Format: TEMP_QS_N e.g. TEMP_QS_1' },
  { header: 'Name*',              apiField: 'name',            required: true },
  { header: 'English Name',       apiField: 'englishName',     required: false, note: 'Title in English (englishName field)' },
  { header: 'Description*',       apiField: 'description',     required: true },
  { header: 'Primary Category*',  apiField: 'primaryCategory', required: true,  lookupKey: 'SCP_PRIMARY_CATEGORIES_QS' },
  { header: 'Program',            apiField: 'program',         required: false, lookupKey: 'SCP_PROGRAMS',             multiSelect: true, note: 'Default: Second Chance' },
  { header: 'Board*',             apiField: 'board',           required: true,  lookupKey: 'SCP_BOARDS',               note: 'Single value' },
  { header: 'Medium*',            apiField: 'medium',          required: true,  lookupKey: 'SCP_MEDIUMS',              multiSelect: true, note: 'Comma or pipe-separated for multiple' },
  { header: 'Grade Level*',       apiField: 'gradeLevel',      required: true,  lookupKey: 'SCP_GRADE_LEVELS',         multiSelect: true, note: 'Comma or pipe-separated for multiple' },
  { header: 'Subject*',           apiField: 'subject',         required: true,  lookupKey: 'SCP_SUBJECTS',             multiSelect: true, note: 'Comma or pipe-separated for multiple' },
  { header: 'Course Type*',       apiField: 'courseType',      required: true,  lookupKey: 'SCP_COURSE_TYPES',         multiSelect: true, note: 'Comma or pipe-separated for multiple' },
  { header: 'Content Language',   apiField: 'contentLanguage', required: false, lookupKey: 'CONTENT_LANGUAGES',        note: 'Assessment language — single value' },
  { header: 'Assessment Type',    apiField: 'assessmentType',  required: false, lookupKey: 'ASSESSMENT_TYPES' },
  { header: 'Evaluation Type*',   apiField: 'evaluationType',  required: true,  lookupKey: 'EVALUATION_TYPES',         note: 'Auto-Graded, Facilitator-Graded or AI-Assisted' },
  { header: 'Show Feedback',      apiField: 'showFeedback',    required: false, note: 'true or false' },
  { header: 'Show Solutions',     apiField: 'showSolutions',   required: false, note: 'true or false' },
];

// SCP Course create form order: appIcon(required) → name(required) → description →
// keywords → program(required,nestedselect,range:["Second Chance"]) →
// targetBoardIds(required,select,identifier) → targetMediumIds(required,nestedselect,identifier) →
// targetGradeLevelIds(required,nestedselect,identifier) → targetSubjectIds(required,nestedselect,identifier) →
// targetCourseTypeIds(required,nestedselect,identifier) → contentLanguage(select,string) → author
// Note: license, copyright, copyrightYear are NOT in the form-read — removed.
export const SCP_COURSE_COLUMNS: ColumnDef[] = [
  { header: 'Temp ID*',              apiField: 'tempId',          required: true,  note: 'Format: TEMP_COURSE_N e.g. TEMP_COURSE_1' },
  { header: 'Name*',                 apiField: 'name',            required: true },
  { header: 'English Name',          apiField: 'englishName',     required: false, note: 'Title in English (englishName field)' },
  { header: 'Description',           apiField: 'description',     required: false },
  { header: 'App Icon Drive URL',    apiField: 'appIconUrl',      required: false, aliases: ['App Icon Drive URL*'], note: 'Optional — Google Drive public share link for thumbnail (PNG/JPEG)' },
  { header: 'Keywords',              apiField: 'keywords',        required: false, note: 'Comma-separated keywords' },
  { header: 'Program*',              apiField: 'program',         required: true,  lookupKey: 'SCP_PROGRAMS',     note: 'Default: Second Chance' },
  { header: 'Board*',                apiField: 'board',           required: true,  lookupKey: 'SCP_BOARDS',       note: 'Single value — sent as platform identifier' },
  { header: 'Medium*',               apiField: 'medium',          required: true,  lookupKey: 'SCP_MEDIUMS',      multiSelect: true, note: 'Comma or pipe-separated for multiple — sent as identifiers' },
  { header: 'Grade Level*',          apiField: 'gradeLevel',      required: true,  lookupKey: 'SCP_GRADE_LEVELS', multiSelect: true, note: 'Comma or pipe-separated for multiple — sent as identifiers' },
  { header: 'Subject*',              apiField: 'subject',         required: true,  lookupKey: 'SCP_SUBJECTS',     multiSelect: true, note: 'Comma or pipe-separated for multiple — sent as identifiers' },
  { header: 'Course Type*',          apiField: 'courseType',      required: true,  lookupKey: 'SCP_COURSE_TYPES', multiSelect: true, note: 'Comma or pipe-separated for multiple — sent as identifiers' },
  { header: 'Content Language',      apiField: 'contentLanguage', required: false, lookupKey: 'CONTENT_LANGUAGES', note: 'Single language' },
  { header: 'Author',                apiField: 'author',          required: false },
];

// ─── Shared sheets (same for both frameworks) ─────────────────

export const QUESTION_COLUMNS: ColumnDef[] = [
  { header: 'QuestionSet Temp ID*',  apiField: 'questionSetTempId',    required: true,  note: 'Must match a Temp ID from QuestionSets sheet' },
  { header: 'Section Name',          apiField: 'sectionName',          required: false, note: 'e.g. Section 1 — groups questions under a section' },
  { header: 'Section Description*',  apiField: 'sectionDescription',   required: true,  aliases: ['Section Description'],  note: 'Required — describes this section (fill on at least one row of each section)' },
  { header: 'Section Instructions*', apiField: 'sectionInstructions',  required: true,  aliases: ['Section Instructions'], note: 'Required — shown at the start of this section (fill on at least one row of each section)' },
  { header: 'Question Type*',        apiField: 'questionType',         required: true,  lookupKey: 'QUESTION_TYPES' },
  { header: 'Visibility',            apiField: 'visibility',           required: false, lookupKey: 'VISIBILITY_TYPES', note: 'Parent = belongs to this QS only; Public = publicly discoverable' },
  { header: 'Question Text*',        apiField: 'questionText',         required: true },
  { header: 'Options',               apiField: 'options',              required: false, note: 'MCQ/Arrange: pipe-separated (A|B|C|D). Match: Key:Value|Key:Value' },
  { header: 'Correct Answer',        apiField: 'correctAnswer',        required: false, note: 'MCQ: exact option text. Arrange: correct order. Match: Key:Value pairs' },
  { header: 'Max Score',             apiField: 'maxScore',             required: false, note: 'Positive number e.g. 1' },
  // Blooms Level and Difficulty removed — platform API rejects them as invalid props
  { header: 'Hint',                  apiField: 'hint',                 required: false },
  { header: 'Solution',              apiField: 'solution',             required: false },
];

// Units nest up to 4 levels deep (the platform's limit). Fill Unit Level 1 for
// a top-level unit and add deeper levels to nest; leave deeper levels blank to
// attach the child higher up. Rows sharing the same path land in the same unit.
export const MAX_UNIT_DEPTH = 4;

export const COURSE_MAPPING_COLUMNS: ColumnDef[] = [
  { header: 'Course Temp ID*',      apiField: 'courseTempId',     required: true,  note: 'Must match a Temp ID from Courses sheet' },
  // 'Unit Name*' is the pre-nesting header — kept as an alias so previously
  // downloaded templates keep working.
  { header: 'Unit Level 1*',        apiField: 'unitLevel1',       required: true,  aliases: ['Unit Name*', 'Unit Name'], note: 'Top-level unit, e.g. Unit 1: Introduction' },
  { header: 'Unit Level 2',         apiField: 'unitLevel2',       required: false, note: 'Optional sub-unit inside Level 1' },
  { header: 'Unit Level 3',         apiField: 'unitLevel3',       required: false, note: 'Optional sub-unit inside Level 2' },
  { header: 'Unit Level 4',         apiField: 'unitLevel4',       required: false, note: 'Optional sub-unit inside Level 3 (deepest level allowed)' },
  // Unit-level metadata — applies to the DEEPEST filled level on this row.
  // Fill on any one row for that unit; blank on the rest.
  { header: 'Unit Description',     apiField: 'unitDescription',  required: false, note: 'Optional description for the deepest unit on this row. Fill on one row per unit.' },
  { header: 'Unit Icon Drive URL',  apiField: 'unitAppIconUrl',   required: false, note: 'Optional Google Drive public share URL for that unit\'s icon. Fill on one row per unit.' },
  { header: 'Child Ref*',           apiField: 'childRef',         required: true,  note: 'Temp ID (TEMP_CONTENT_1, TEMP_QS_1) OR real do_xxxx identifier' },
  { header: 'Child Type*',          apiField: 'childType',        required: true,  lookupKey: 'CHILD_TYPES' },
  { header: 'Sequence*',            apiField: 'sequence',         required: true,  note: 'Order within the unit e.g. 1, 2, 3' },
];

/**
 * Resolve a mapping row into its unit path, e.g. ['Unit 1', 'Basics'].
 * Falls back to the legacy single `unitName` field for older workbooks.
 */
export const getUnitPath = (row: Record<string, any>): string[] => {
  const levels = [row?.unitLevel1, row?.unitLevel2, row?.unitLevel3, row?.unitLevel4]
    .slice(0, MAX_UNIT_DEPTH)
    .map((v) => String(v ?? '').trim());

  // Legacy workbooks only had a single Unit Name column.
  if (!levels[0] && row?.unitName) levels[0] = String(row.unitName).trim();

  // Stop at the first blank so a gap can never silently re-parent a child.
  const path: string[] = [];
  for (const level of levels) {
    if (!level) break;
    path.push(level);
  }
  return path;
};

// ExistingContentMapping: reference existing platform content by its do_xxx identifier.
// Fill Course Temp ID + Unit Name + Sequence to add it directly to a course unit
// (no CourseChildrenMapping row needed for existing content).
// Leave Course Temp ID blank if only using as a reference for QS sections.
export const EXISTING_MAPPING_COLUMNS: ColumnDef[] = [
  { header: 'Temp ID*',             apiField: 'tempId',             required: true,  note: 'e.g. TEMP_EXISTING_1 — used as a reference ID in this sheet' },
  { header: 'Existing Identifier*', apiField: 'existingIdentifier', required: true,  note: 'Real platform identifier e.g. do_abc123' },
  { header: 'Entity Type*',         apiField: 'entityType',         required: true,  lookupKey: 'CHILD_TYPES' },
  { header: 'Course Temp ID',       apiField: 'courseTempId',       required: false, note: 'e.g. TEMP_COURSE_1 — which course to add this content to' },
  // Same 4-level unit addressing as CourseChildrenMapping, so existing content
  // can be attached to a nested sub-unit rather than only a top-level one.
  { header: 'Unit Level 1',         apiField: 'unitLevel1',         required: false, aliases: ['Unit Name'], note: 'Top-level unit within the course' },
  { header: 'Unit Level 2',         apiField: 'unitLevel2',         required: false, note: 'Optional sub-unit inside Level 1' },
  { header: 'Unit Level 3',         apiField: 'unitLevel3',         required: false, note: 'Optional sub-unit inside Level 2' },
  { header: 'Unit Level 4',         apiField: 'unitLevel4',         required: false, note: 'Optional sub-unit inside Level 3' },
  { header: 'Sequence',             apiField: 'sequence',           required: false, note: 'Order within the unit e.g. 1, 2, 3' },
];

// ─── Framework selector ───────────────────────────────────────

export const getFrameworkColumns = (fw: FrameworkId) => ({
  // Content ALWAYS uses POS columns — pos-framework is used for all users
  // regardless of collectionFramework (confirmed by platform form-read API).
  contentColumns:  POS_CONTENT_COLUMNS,
  qsColumns:       fw === 'scp-framework' ? SCP_QS_COLUMNS     : POS_QS_COLUMNS,
  courseColumns:   fw === 'scp-framework' ? SCP_COURSE_COLUMNS : POS_COURSE_COLUMNS,
  questionColumns: QUESTION_COLUMNS,
  mappingColumns:  COURSE_MAPPING_COLUMNS,
  existingColumns: EXISTING_MAPPING_COLUMNS,
});

// ─── Build header → apiField reverse map (used by parser) ────

export const buildHeaderToApiFieldMap = (
  cols: ColumnDef[]
): Record<string, string> => {
  const map: Record<string, string> = {};
  cols.forEach((c) => {
    map[c.header] = c.apiField;
    c.aliases?.forEach((alias) => {
      map[alias] = c.apiField;
    });
  });
  return map;
};

// ─── Lookup sheet column definitions ─────────────────────────
// Each entry: column header in LookupData sheet → LOOKUP key → column letter

export interface LookupColumn {
  header: string;
  lookupKey: keyof typeof LOOKUP;
}

/**
 * Returns the set of lookup columns to include in the LookupData sheet.
 *
 * templateType controls which columns are relevant:
 *   'all'         → full template (Content + QS + Courses)
 *   'content'     → Content sheet only
 *   'questionset' → QuestionSets + Questions only
 */
export const getLookupColumns = (
  fw: FrameworkId,
  templateType: 'all' | 'content' | 'questionset' = 'all'
): LookupColumn[] => {
  const includeContent     = templateType === 'all' || templateType === 'content';
  const includeQS          = templateType === 'all' || templateType === 'questionset';
  const includeCourseChild = templateType === 'all';

  // ── Lookups only relevant to Content sheet ───────────────────
  const contentOnly: LookupColumn[] = includeContent ? [
    { header: 'File Types',                   lookupKey: 'FILE_TYPES' },
    { header: 'Content Primary Categories',   lookupKey: 'POS_PRIMARY_CATEGORIES_CONTENT' },
  ] : [];

  // ── Lookups only relevant to Questions sheet ─────────────────
  const questionOnly: LookupColumn[] = includeQS ? [
    { header: 'Question Types',   lookupKey: 'QUESTION_TYPES' },
    { header: 'Visibility Types', lookupKey: 'VISIBILITY_TYPES' },
    { header: 'Evaluation Types', lookupKey: 'EVALUATION_TYPES' },
    { header: 'Assessment Types', lookupKey: 'ASSESSMENT_TYPES' },
  ] : [];

  // ── Lookup only relevant to CourseChildrenMapping ────────────
  const courseChildOnly: LookupColumn[] = includeCourseChild ? [
    { header: 'Child Types', lookupKey: 'CHILD_TYPES' },
  ] : [];

  // ── Always-included shared lookups ──────────────────────────
  const shared: LookupColumn[] = [
    { header: 'Content Languages', lookupKey: 'CONTENT_LANGUAGES' },
  ];

  // ── POS taxonomy lookups (used by both Content and QS sheets) ─
  const posTaxonomy: LookupColumn[] = [
    { header: 'Domains',          lookupKey: 'POS_DOMAINS' },
    { header: 'Sub Domains',      lookupKey: 'POS_SUB_DOMAINS' },
    { header: 'Subjects',         lookupKey: 'POS_SUBJECTS' },
    { header: 'Target Age Groups',lookupKey: 'POS_TARGET_AGE_GROUPS' },
    { header: 'Primary Users',    lookupKey: 'POS_PRIMARY_USERS' },
    { header: 'Programs',         lookupKey: 'POS_PROGRAMS' },
  ];

  if (fw === 'scp-framework') {
    return [
      ...contentOnly,
      ...questionOnly,
      ...courseChildOnly,
      ...shared,
      ...posTaxonomy,
      { header: 'Primary Categories (QS)', lookupKey: 'SCP_PRIMARY_CATEGORIES_QS' },
      { header: 'Boards',                  lookupKey: 'SCP_BOARDS' },
      { header: 'Mediums',                 lookupKey: 'SCP_MEDIUMS' },
      { header: 'Grade Levels',            lookupKey: 'SCP_GRADE_LEVELS' },
      { header: 'Subjects (SCP)',          lookupKey: 'SCP_SUBJECTS' },
      { header: 'Course Types',            lookupKey: 'SCP_COURSE_TYPES' },
      { header: 'Programs (SCP)',          lookupKey: 'SCP_PROGRAMS' },
    ];
  }

  return [
    ...contentOnly,
    ...questionOnly,
    ...courseChildOnly,
    ...shared,
    ...posTaxonomy,
    { header: 'Primary Categories (QS)', lookupKey: 'POS_PRIMARY_CATEGORIES_QS' },
  ];
};