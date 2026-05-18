export const BELTS = [
  'White', 'Yellow', 'Orange', 'Green', 'Blue', 'Purple', 'Brown',
  'Black 1st Dan', 'Black 2nd Dan', 'Black 3rd Dan',
  'Black 4th Dan', 'Black 5th Dan', 'Black 6th Dan',
  'Black 7th Dan', 'Black 8th Dan',
];

export const GENDERS = ['Male', 'Female', 'Other'];

export const EVENT_TYPES = [
  'Kata',
  'Kumite',
  'Both (Kata + Kumite)',
  'Team Kata',
  'Team Kumite',
];

export const BELT_COLOR = {
  White: 'bg-zinc-200 text-zinc-900',
  Yellow: 'bg-yellow-400 text-yellow-950',
  Orange: 'bg-orange-500 text-white',
  Green: 'bg-emerald-500 text-white',
  Blue: 'bg-blue-500 text-white',
  Purple: 'bg-purple-500 text-white',
  Brown: 'bg-amber-800 text-white',
};

export function beltClass(b) {
  if (!b) return 'bg-zinc-700 text-zinc-200';
  if (b.startsWith('Black')) return 'bg-black text-amber-300 ring-1 ring-amber-500/60 font-semibold';
  return BELT_COLOR[b] || 'bg-zinc-700 text-zinc-200';
}

export const MATCH_STATUSES = ['queued', 'called', 'on_tatami', 'active', 'paused', 'completed', 'verified', 'archived'];

export const MATCH_STATUS_META = {
  queued:    { label: 'Queued',     cls: 'bg-zinc-700 text-zinc-200 border-zinc-600',                       dot: 'bg-zinc-500' },
  called:    { label: 'Called',     cls: 'bg-blue-500/15 text-blue-300 border-blue-500/40',                 dot: 'bg-blue-400' },
  on_tatami: { label: 'On Tatami',  cls: 'bg-purple-500/15 text-purple-300 border-purple-500/40',           dot: 'bg-purple-400' },
  active:    { label: 'LIVE',       cls: 'bg-red-500/20 text-red-300 border-red-500/50 animate-pulse',      dot: 'bg-red-500 animate-pulse' },
  paused:    { label: 'Paused',     cls: 'bg-amber-500/15 text-amber-300 border-amber-500/40',              dot: 'bg-amber-400' },
  completed: { label: 'Completed',  cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',        dot: 'bg-emerald-400' },
  verified:  { label: 'Verified',   cls: 'bg-emerald-600/25 text-emerald-200 border-emerald-500/60',        dot: 'bg-emerald-500' },
  archived:  { label: 'Archived',   cls: 'bg-zinc-800 text-zinc-400 border-zinc-700',                       dot: 'bg-zinc-600' },
};

export const TATAMI_STATUSES = ['active', 'paused', 'closed', 'delayed'];

// Full readable foul names (no abbreviations)
export const KUMITE_PENALTIES = [
  { code: 'C1', label: 'Chukoku 1',          desc: 'Minor warning', tier: 1, points: 0 },
  { code: 'C2', label: 'Chukoku 2',          desc: 'Second minor warning', tier: 1, points: 0 },
  { code: 'K1', label: 'Keikoku',            desc: 'Warning · opponent +1', tier: 2, points: 1 },
  { code: 'HC', label: 'Hansoku-Chui',       desc: 'Serious warning · opponent +2', tier: 3, points: 2 },
  { code: 'H',  label: 'Hansoku',            desc: 'Disqualification', tier: 4, points: 0, disqualifies: true },
  { code: 'S',  label: 'Shikkaku',           desc: 'Severe disqualification', tier: 5, points: 0, disqualifies: true },
];

export const KUMITE_POINTS = [
  { value: 1, label: 'Yuko',    desc: 'Hand technique' },
  { value: 2, label: 'Wazari',  desc: 'Mid-level kick / body throw' },
  { value: 3, label: 'Ippon',   desc: 'Head kick / clean throw' },
];

export const KUMITE_DEFAULT_DURATION = 180;
export const KATA_JUDGE_COUNT = 5;

export const CERT_TYPES = [
  { value: 'winner',           label: 'Winner (1st Place)',          accent: 'gold'    },
  { value: 'runner_up',        label: 'Runner-Up (2nd Place)',       accent: 'silver'  },
  { value: 'second_runner_up', label: 'Second Runner-Up (3rd Place)', accent: 'bronze' },
  { value: 'participation',    label: 'Participation',                accent: 'navy'   },
];

export const RETENTION_OPTIONS = [
  { value: '15d',       label: '15 days',  days: 15  },
  { value: '45d',       label: '45 days',  days: 45  },
  { value: '60d',       label: '60 days',  days: 60  },
  { value: '90d',       label: '90 days',  days: 90  },
  { value: 'permanent', label: 'Permanent Archive', days: null },
];

export const MEDIA_TYPES = [
  'tournament_logo', 'tournament_banner', 'tournament_brochure',
  'dojo_logo', 'kohai_photo', 'kohai_proof_of_age', 'weigh_in_photo',
  'protest_video', 'match_recording', 'certificate_export',
];

export const NOTIFICATION_TYPES = [
  { value: 'tournament_announcement',    label: 'Tournament Announcement' },
  { value: 'registration_confirmation',  label: 'Registration Confirmation' },
  { value: 'registration_approval',      label: 'Registration Approval' },
  { value: 'match_completion',           label: 'Match Completion Alert' },
];

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  TOURNAMENT_ORGANIZER: 'tournament_organizer',
  DOJO_ADMIN: 'dojo_admin',
  COACH: 'coach',
  REFEREE: 'referee',
  KOHAI: 'kohai',
  SPECTATOR: 'spectator',
};

export function isAdminOrOrganizer(role) {
  return role === ROLES.SUPER_ADMIN || role === ROLES.TOURNAMENT_ORGANIZER;
}
export function isSuperAdmin(role) {
  return role === ROLES.SUPER_ADMIN;
}

// Standard age divisions used by Auto Create Categories
export const STANDARD_AGE_DIVISIONS = [
  { code: 'U8',   label: 'Under 8',    min: 5,  max: 7  },
  { code: 'U10',  label: 'Under 10',   min: 8,  max: 9  },
  { code: 'U12',  label: 'Under 12',   min: 10, max: 11 },
  { code: 'U14',  label: 'Under 14',   min: 12, max: 13 },
  { code: 'U16',  label: 'Cadet',      min: 14, max: 15 },
  { code: 'U18',  label: 'Junior',     min: 16, max: 17 },
  { code: 'U21',  label: 'Under 21',   min: 18, max: 20 },
  { code: 'SR',   label: 'Senior',     min: 21, max: 99 },
];

export function computeAge(dob) {
  if (!dob) return null;
  const d = new Date(dob); if (isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}
