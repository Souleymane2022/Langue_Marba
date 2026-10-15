/**
 * Répétition espacée (algorithme SM-2 simplifié).
 * Chaque mot appris revient au moment où l'on risque de l'oublier.
 */
export interface CardState {
  /** facteur de facilité (≥ 1.3) */
  ef: number;
  /** intervalle en jours */
  interval: number;
  /** nombre de réussites consécutives */
  reps: number;
  /** prochaine révision (timestamp ms) */
  due: number;
  /** nombre total de révisions */
  seen: number;
  lapses: number;
}

/** Qualité de la réponse : 0 = oubli total, 3 = difficile, 4 = bien, 5 = facile. */
export type Grade = 0 | 3 | 4 | 5;

const DAY = 24 * 60 * 60 * 1000;

export function newCard(now = Date.now()): CardState {
  return { ef: 2.5, interval: 0, reps: 0, due: now, seen: 0, lapses: 0 };
}

export function review(card: CardState, grade: Grade, now = Date.now()): CardState {
  const next = { ...card, seen: card.seen + 1 };
  if (grade < 3) {
    next.reps = 0;
    next.interval = 0;
    next.lapses += 1;
    next.due = now + 10 * 60 * 1000; // revoir dans 10 minutes
  } else {
    next.reps += 1;
    if (next.reps === 1) next.interval = 1;
    else if (next.reps === 2) next.interval = 3;
    else next.interval = Math.round(card.interval * card.ef);
    if (grade === 5) next.interval = Math.round(next.interval * 1.3);
    next.due = now + next.interval * DAY;
  }
  next.ef = Math.max(1.3, card.ef + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02)));
  return next;
}

export function isDue(card: CardState, now = Date.now()): boolean {
  return card.due <= now;
}

/** Un mot est « maîtrisé » quand il a été réussi au moins 3 fois d'affilée. */
export function isMastered(card: CardState): boolean {
  return card.reps >= 3 && card.interval >= 7;
}
