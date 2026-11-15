// Engine C · Physiological twin. Projects bone density and radiation dose over a mission using NASA published rates.
//   Bone: −1 to −1.5 %/month without countermeasures; −0.3 to −0.5 %/month with resistance exercise and diet
//         (NASA HRP Evidence Report, Risk of Early Onset Osteoporosis).
//   Radiation: 1.3–1.5 mSv/day in free space (HRP radiation reports); ~0.5 mSv/day on a planetary surface
//         (NASA-STD-3001 Vol. 1 Rev C, §4.8 rationale). Career limit: 600 mSv (NASA-STD-3001).
export interface TwinProfile {
  id: string; name: string; segments: { name: string; days: number; mSvPerDay: number; gravity: number }[];
}

export const PROFILES: TwinProfile[] = [
  { id: "mars", name: "Mars mission (conjunction class, ~2.4 years)", segments: [
    { name: "Transit to Mars", days: 180, mSvPerDay: 1.4, gravity: 0 },
    { name: "Mars surface", days: 500, mSvPerDay: 0.5, gravity: 0.38 },
    { name: "Return to Earth", days: 180, mSvPerDay: 1.4, gravity: 0 },
  ] },
  { id: "transit", name: "Deep-space transit only (6 months)", segments: [
    { name: "Free space", days: 180, mSvPerDay: 1.4, gravity: 0 },
  ] },
];

export const BONE_LOSS_NO_EXERCISE = 1.25; // % per month (midpoint of 1–1.5)
export const BONE_LOSS_FULL_EXERCISE = 0.4; // % per month (midpoint of 0.3–0.5)
export const PARTIAL_GRAVITY_FACTOR = 0.5; // ASSUMPTION: partial gravity halves the loss (no NASA rate in our sources)
export const CAREER_LIMIT_MSV = 600;

export interface TwinPoint { day: number; segment: string; boneNone: number; boneChosen: number; boneFull: number; dose: number; spe: number }

/** adherence 0..1 = fraction of the 2 h/day exercise prescription done. shelterUse 0..1 = how often the crew
 *  goes to the storm shelter during a solar particle event. */
export function project(profile: TwinProfile, adherence: number, shelterUse: number): TwinPoint[] {
  const pts: TwinPoint[] = [];
  let day = 0, none = 100, chosen = 100, full = 100, dose = 0;
  const chosenRate = BONE_LOSS_NO_EXERCISE - (BONE_LOSS_NO_EXERCISE - BONE_LOSS_FULL_EXERCISE) * adherence;
  for (const seg of profile.segments) {
    const g = seg.gravity > 0 ? PARTIAL_GRAVITY_FACTOR : 1;
    for (let i = 0; i < seg.days; i++) {
      none -= (BONE_LOSS_NO_EXERCISE * g) / 30;
      chosen -= (chosenRate * g) / 30;
      full -= (BONE_LOSS_FULL_EXERCISE * g) / 30;
      dose += seg.mSvPerDay;
      // ASSUMPTION for the demo: one solar particle event every ~120 days in free space adds 20 mSv,
      // reduced by using the storm shelter.
      const spe = seg.gravity === 0 && day % 120 === 95 ? 20 * (1 - 0.7 * shelterUse) : 0;
      dose += spe;
      if (day % 5 === 0) pts.push({ day, segment: seg.name, boneNone: round(none), boneChosen: round(chosen), boneFull: round(full), dose: round(dose), spe });
      day++;
    }
  }
  pts.push({ day, segment: profile.segments[profile.segments.length - 1].name, boneNone: round(none), boneChosen: round(chosen), boneFull: round(full), dose: round(dose), spe: 0 });
  return pts;
}

const round = (x: number) => Math.round(x * 100) / 100;
