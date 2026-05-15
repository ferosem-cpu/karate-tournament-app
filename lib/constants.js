export const BELTS = [
  'White', 'Yellow', 'Orange', 'Green', 'Blue', 'Purple', 'Brown',
  'Black - 1st Dan', 'Black - 2nd Dan', 'Black - 3rd Dan',
  'Black - 4th Dan', 'Black - 5th Dan', 'Black - 6th Dan',
  'Black - 7th Dan', 'Black - 8th Dan',
];

export const GENDERS = ['Male', 'Female', 'Other'];

export const EVENT_TYPES = ['Kata', 'Kumite'];

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
  if (b.startsWith('Black')) return 'bg-zinc-950 text-zinc-100 ring-1 ring-amber-500/40';
  return BELT_COLOR[b] || 'bg-zinc-700 text-zinc-200';
}
