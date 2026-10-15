/**
 * Préfixe des URL quand le site est servi dans un sous-dossier
 * (ex. https://souleymane2022.github.io/Langue_Marba/). Vide en hébergement classique.
 * Les <Link> de Next l'ajoutent automatiquement ; il faut l'ajouter à la main pour fetch, service worker, manifeste.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const withBase = (path: string) => `${BASE_PATH}${path}`;
