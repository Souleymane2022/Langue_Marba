import { SECTORS, sectorEntries, type Sector } from "./sectors.ts";
import type { Entry } from "./types.ts";

export const LESSON_SIZE = 8;

export interface Lesson {
  id: string;
  sectorId: string;
  index: number;
  title: string;
  entryIds: string[];
}

export interface Course {
  sector: Sector;
  lessons: Lesson[];
}

/** Découpe le vocabulaire de chaque secteur en leçons de 8 mots, des plus simples aux plus rares. */
export function buildCourses(entries: Entry[], maxLessonsPerSector = 12): Course[] {
  return SECTORS.map((sector) => {
    const words = sectorEntries(entries, sector);
    const lessons: Lesson[] = [];
    for (let i = 0; i < words.length && lessons.length < maxLessonsPerSector; i += LESSON_SIZE) {
      const chunk = words.slice(i, i + LESSON_SIZE);
      if (chunk.length < 4) break;
      const n = lessons.length + 1;
      lessons.push({
        id: `${sector.id}-${n}`,
        sectorId: sector.id,
        index: n,
        title: `${sector.name} — leçon ${n}`,
        entryIds: chunk.map((e) => e.id),
      });
    }
    return { sector, lessons };
  });
}
