import { fold } from "./normalize.ts";
import type { Entry, Example } from "./types.ts";

/**
 * Secteurs de base où la langue Marba doit pouvoir être utilisée.
 * Le vocabulaire de chaque secteur est extrait automatiquement du dictionnaire
 * (catégories grammaticales + racines de mots français dans les traductions),
 * de sorte que tout ce qui est affiché provient de sources attestées.
 */
export interface Sector {
  id: string;
  name: string;
  icon: string;
  description: string;
  /** racines françaises repliées (sans accents), comparées au début des mots de la glose ; « = » final : mot entier */
  stems: string[];
  /** catégories grammaticales incluses d'office */
  pos?: string[];
  /** situations proposées à l'assistant IA pour générer des dialogues */
  situations: string[];
}

export const SECTORS: Sector[] = [
  {
    id: "vie-quotidienne",
    name: "Vie quotidienne & salutations",
    icon: "👋",
    description: "Saluer, répondre, se présenter, poser des questions simples.",
    stems: ["salu", "bonjour", "merci", "oui=", "non=", "venir", "viens", "aller", "partir", "appel", "dire=", "demand", "repond",
      "nom=", "aujourd", "demain", "hier", "maintenant", "matin", "soir", "nuit", "jour", "bien", "content", "joie", "aider", "aide"],
    pos: ["interj", "pron", "int"],
    situations: ["Saluer un aîné le matin", "Se présenter à un voisin", "Demander des nouvelles de la famille", "Prendre congé"],
  },
  {
    id: "sante",
    name: "Santé",
    icon: "🩺",
    description: "Consultation, symptômes, corps humain, soins, prévention et sensibilisation.",
    stems: ["malad", "sante", "sang", "fievre", "tous", "plaie", "bless", "douleur", "souffr", "medic", "remede", "soign", "guer",
      "vomi", "diarrh", "enceinte", "grossesse", "accouch", "sida", "lepr", "variole", "rougeole", "palud", "enfl", "bouton",
      "gale", "toux", "hoquet", "mourir", "mort=", "morte=", "infirm", "sage-femme", "maigr", "faible", "fatigu", "pus=", "abces", "goitre",
      "aveugle", "sourd", "boiteux", "boiter", "fou=", "folie", "epilep", "vertige", "ulcere", "teigne", "ver=", "hernie", "cicatr", "saign"],
    pos: ["n.med"],
    situations: ["Consultation au centre de santé : un enfant a de la fièvre", "Campagne de vaccination dans le village",
      "Conseils à une femme enceinte", "Prévention du paludisme (moustiquaire)", "Sensibilisation au VIH/sida"],
  },
  {
    id: "corps",
    name: "Corps humain",
    icon: "🧍",
    description: "Les parties du corps — indispensable pour la santé et la vie courante.",
    stems: [],
    pos: ["n.anat"],
    situations: ["Décrire où l'on a mal", "Apprendre les parties du corps aux enfants"],
  },
  {
    id: "education",
    name: "Éducation & alphabétisation",
    icon: "📚",
    description: "École, apprentissage, nombres, transmission des savoirs, contes.",
    stems: ["ecole", "enseign", "apprend", "appris", "savoir", "sait", "connai", "livre", "ecri", "lire", "lecture", "compt",
      "nombre", "parole", "parler", "conte", "histoire", "eleve", "maitre", "intellig", "sage", "conseil", "universite", "explique",
      "comprend", "pense", "reflech", "idee", "question", "devin", "enigme", "ruse"],
    pos: ["num"],
    situations: ["Premier jour d'école", "Un maître explique une leçon de calcul", "Les parents rencontrent l'enseignant",
      "Raconter un conte aux enfants"],
  },
  {
    id: "agriculture",
    name: "Agriculture",
    icon: "🌾",
    description: "Champs, semis, récoltes, outils, cultures et saisons agricoles.",
    stems: ["champ", "cultiv", "labour", "sem", "recolt", "mil=", "sorgho", "arachide", "haricot", "niebe", "mais=", "riz",
      "grenier", "houe", "defrich", "debrouss", "graine", "sarcl", "manioc", "patate", "gombo", "sesame", "coton", "epi=", "epis=", "tige",
      "engrais", "fumier", "jachere", "cueill", "vann", "battre", "poquet", "semence", "faucille", "hache", "oseille", "courge",
      "calebasse", "tabac", "plant"],
    situations: ["Préparer les champs avant la saison des pluies", "Conseils d'un agent agricole sur les semences",
      "Organiser la récolte du mil", "Protéger le champ contre les criquets"],
  },
  {
    id: "elevage",
    name: "Élevage",
    icon: "🐄",
    description: "Bétail, volaille, soins aux animaux, lait et produits animaux.",
    stems: ["boeuf", "vache", "taureau", "chevre", "bouc", "mouton", "belier", "poule", "coq=", "poussin", "cheval", "ane=", "chien",
      "troupeau", "betail", "lait", "beurre", "berger", "enclos", "corne", "veau", "cochon", "porc=", "pintade", "oeuf", "patur",
      "traire", "abreuv", "canard", "pigeon", "chat=", "bete", "animal", "animaux"],
    situations: ["Un éleveur signale une vache malade", "Vente d'une chèvre au marché", "Vaccination de la volaille"],
  },
  {
    id: "peche-chasse",
    name: "Pêche & chasse",
    icon: "🎣",
    description: "Fleuve, poissons, filets, pièges, gibier.",
    stems: ["poisson", "pech", "filet", "harpon", "chass", "fleuve", "riviere", "mare=", "etang", "piege", "fleche", "arc=", "lance=",
      "gibier", "gazelle", "antilope", "pirogue", "nasse", "hamecon", "crocodile", "hippopotame", "silure", "capitaine", "nager",
      "noyer", "rive=", "berge"],
    situations: ["Partir à la pêche au fleuve", "Partager le produit de la chasse", "Réparer un filet"],
  },
  {
    id: "commerce",
    name: "Commerce & marché",
    icon: "🛒",
    description: "Acheter, vendre, prix, argent, mesures, dettes.",
    stems: ["marche=", "marchand", "vend", "achet", "argent", "prix", "payer", "paie", "dette", "cher=", "riche", "pauvre", "echang", "commer", "mesur",
      "sac=", "piece", "cauri", "pret=", "prete", "rembours", "gagn", "perdre", "perte", "valeur", "compte", "boutique", "salaire", "travail",
      "employ", "embauch"],
    situations: ["Marchander le prix du mil au marché", "Vendre des arachides", "Rembourser une dette", "Ouvrir une petite boutique"],
  },
  {
    id: "alimentation",
    name: "Alimentation & cuisine",
    icon: "🍲",
    description: "Repas, préparation, boissons, ustensiles de cuisine.",
    stems: ["mang", "nourri", "boule", "sauce", "viande", "sel=", "huile", "farine", "piler", "pile=", "mortier", "pilon", "cuire", "cuit", "cuis",
      "bouilli", "biere", "boire", "faim", "soif", "repas", "gout", "sucre", "miel", "canari", "marmite", "grill", "rotir",
      "galette", "beignet", "potage", "assiette", "louche", "moudre", "meule", "fumer"],
    situations: ["Préparer la boule et la sauce", "Inviter quelqu'un à manger", "Hygiène de l'eau et des aliments"],
  },
  {
    id: "famille",
    name: "Famille & société",
    icon: "👨‍👩‍👧",
    description: "Parenté, mariage, naissance, relations sociales.",
    stems: ["pere", "mere", "frere", "soeur", "enfant", "fils", "fille", "femme", "mari=", "mariag", "epous", "tante", "oncle", "cousin",
      "grand-pere", "grand-mere", "ami", "mariag", "dot=", "beau-", "belle-", "jumea", "naissance", "naitre", "veuv", "orphelin",
      "parent", "bebe", "garcon", "vieill", "jeune", "adulte", "homme", "voisin", "hote", "etranger", "neveu", "niece", "clan",
      "famille", "aine", "cadet"],
    pos: ["n.rel"],
    situations: ["Présenter sa famille", "Demande en mariage", "Annoncer une naissance", "Accueillir un invité"],
  },
  {
    id: "administration",
    name: "Administration, justice & paix",
    icon: "⚖️",
    description: "Chefferie, autorités, règlement des conflits, droits et devoirs.",
    stems: ["chef", "roi=", "village", "loi=", "juge", "jug", "accus", "vol=", "voler", "voleur", "prison", "amende", "temoin", "querell",
      "dispute", "palabre", "conflit", "paix", "guerre", "ordre=", "impot", "autorit", "rassembl", "reunion", "envoy", "messager",
      "frontiere", "pays", "proprie", "mensonge", "menti", "verite", "promesse", "jurer", "punir", "battre", "tuer", "fuir",
      "escla", "ennemi", "soldat", "armee", "fautif", "honte", "respect", "pardon"],
    situations: ["Régler un conflit de champ devant le chef de village", "Déclarer une naissance à la mairie",
      "Réunion communautaire", "Témoigner devant le juge"],
  },
  {
    id: "culture",
    name: "Culture, religion & traditions",
    icon: "🥁",
    description: "Croyances, rites, fêtes, danse, musique, deuil, coutumes.",
    stems: ["dieu", "prier", "priere", "sacrifi", "esprit", "ancetre", "danse", "chant", "tambour", "fete", "initia",
      "rite=", "sorci", "fetiche", "tombe=", "tombeau", "enterr", "funer", "deuil", "pleur", "coutume", "proverbe", "musique", "flute",
      "masque", "devin", "benedic", "malediction", "interdit", "totem", "offrande", "jeu=", "lutte", "cabaret", "perle", "parure",
      "tatou", "scarif", "tresse", "coiffure"],
    situations: ["Expliquer une fête traditionnelle", "Présenter ses condoléances", "Chanter lors d'une danse de nuit"],
  },
  {
    id: "environnement",
    name: "Environnement & climat",
    icon: "🌦️",
    description: "Météo, saisons, nature, eau, arbres et plantes.",
    stems: ["pluie", "pleuv", "soleil", "lune", "etoile", "vent=", "nuage", "ciel", "terre", "arbre", "foret", "brousse", "herbe",
      "feu=", "saison", "chaud", "chaleur", "froid", "fraich", "eau=", "montagne", "pierre", "sable", "boue", "rosee", "secheresse",
      "inond", "orage", "tonnerre", "eclair", "arc-en-ciel", "fumee", "cendre", "termit", "insecte", "puits", "source"],
    situations: ["Annoncer la saison des pluies", "Protéger les arbres contre les feux de brousse", "Gérer l'eau du puits"],
  },
  {
    id: "faune-flore",
    name: "Animaux & plantes",
    icon: "🦜",
    description: "Faune et flore de la région : animaux sauvages, oiseaux, insectes, arbres et plantes utiles.",
    stems: [],
    pos: ["n.zoo", "n.bot"],
    situations: ["Reconnaître les plantes médicinales", "Décrire les animaux de la brousse aux enfants"],
  },
  {
    id: "habitat",
    name: "Habitat, artisanat & métiers",
    icon: "🛖",
    description: "Construire, outils, vannerie, poterie, forge, tissage.",
    stems: ["case=", "maison", "toit", "mur=", "porte", "secco", "natte", "panier", "poterie", "potier", "forg", "fer=", "corde",
      "tress", "couteau", "hache", "constru", "bois", "paille", "clotur", "lit=", "tabouret", "banc=", "fauteuil", "aiguille",
      "coudre", "tiss", "vetement", "habit", "pagne", "chaussure", "outil", "manche", "argile", "brique", "piquet", "fenetre",
      "hutte", "concession", "cour="],
    situations: ["Construire une case avant les pluies", "Commander un outil chez le forgeron", "Tresser une natte"],
  },
  {
    id: "deplacements",
    name: "Déplacements & orientation",
    icon: "🧭",
    description: "Voyager, se repérer, directions, distances.",
    stems: ["voyag", "route", "chemin", "marcher", "travers", "pont", "velo", "vehicule", "loin", "pres=", "proche",
      "devant", "derriere", "gauche", "droite", "haut", "bas=", "dedans", "dehors", "nord", "sud", "ouest=", "arriver",
      "rentr", "sortir", "entrer", "monter", "descend", "courir", "suivre", "retour", "direction", "cote"],
    pos: ["loc", "prep"],
    situations: ["Demander le chemin du marché", "Voyager de Baktchoro à Bongor", "Indiquer où se trouve le centre de santé"],
  },
];

export const SECTOR_BY_ID = new Map(SECTORS.map((s) => [s.id, s]));

/** « fer= » : mot entier ; « cultiv » : début de mot. */
function stemRegex(stems: string[]): RegExp | null {
  if (!stems.length) return null;
  const parts = stems.map((s) => {
    const whole = s.endsWith("=");
    const esc = s.replace(/=$/, "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return whole ? `${esc}(?=\\s|$)` : esc;
  });
  return new RegExp(`(?:^|\\s)(?:${parts.join("|")})`);
}

const regexCache = new Map<string, RegExp | null>();
function regexFor(sector: Sector) {
  if (!regexCache.has(sector.id)) regexCache.set(sector.id, stemRegex(sector.stems));
  return regexCache.get(sector.id)!;
}

export function entryInSector(entry: Entry, sector: Sector): boolean {
  if (sector.pos?.some((p) => entry.pos.includes(p))) return true;
  const re = regexFor(sector);
  if (!re) return false;
  const g = fold(entry.gloss.includes(" : ") ? entry.gloss.split(" : ").slice(1).join(" ") : entry.gloss);
  return re.test(g);
}

/** Qualité pédagogique d'une entrée : glose courte et exemples disponibles d'abord. */
export function teachingScore(e: Entry): number {
  let s = 0;
  if (e.examples.length) s += 30;
  if (e.expressions.length) s += 5;
  s -= Math.min(e.gloss.length, 80) / 4;
  if (e.pos.includes("id")) s -= 15; // idéophones : difficiles pour débuter
  if (!e.gloss) s -= 100;
  return s;
}

export function sectorEntries(entries: Entry[], sector: Sector): Entry[] {
  return entries.filter((e) => e.gloss && entryInSector(e, sector)).sort((a, b) => teachingScore(b) - teachingScore(a));
}

export function sectorPhrases(entries: Entry[], sector: Sector, limit = 60): (Example & { entryId: string })[] {
  const re = regexFor(sector);
  const out: (Example & { entryId: string })[] = [];
  const seen = new Set<string>();
  for (const e of entries) {
    const inSector = entryInSector(e, sector);
    for (const ex of e.examples) {
      if (seen.has(ex.mar)) continue;
      if (inSector || (re && re.test(fold(ex.fr)))) {
        seen.add(ex.mar);
        out.push({ ...ex, entryId: e.id });
      }
    }
  }
  return out.sort((a, b) => a.mar.length - b.mar.length).slice(0, limit);
}
