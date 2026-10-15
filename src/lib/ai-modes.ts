/** Fonctions de l'assistant IA (partagées entre l'interface et l'API). */
export interface AiMode {
  id: AiModeId;
  label: string;
  icon: string;
  description: string;
  placeholder: string;
  /** le mode utilise un secteur (santé, agriculture…) */
  sector?: boolean;
  /** conversation suivie (historique conservé) */
  chat?: boolean;
}

export type AiModeId =
  | "tuteur"
  | "traduire-fr"
  | "traduire-mar"
  | "corriger"
  | "dialogue"
  | "message"
  | "exercices"
  | "fiche"
  | "proverbe"
  | "grammaire";

export const AI_MODES: AiMode[] = [
  {
    id: "tuteur",
    label: "Tuteur personnel",
    icon: "🧑‍🏫",
    description: "Posez toutes vos questions sur la langue Marba ; le tuteur explique et vous fait pratiquer.",
    placeholder: "Ex. : Comment dit-on « je vais au champ » ? Apprends-moi à saluer.",
    chat: true,
  },
  {
    id: "traduire-fr",
    label: "Français → Marba",
    icon: "➡️",
    description: "Traduction assistée, avec niveau de confiance et mots du dictionnaire utilisés.",
    placeholder: "Texte en français à traduire…",
  },
  {
    id: "traduire-mar",
    label: "Marba → Français",
    icon: "⬅️",
    description: "Traduction et analyse mot à mot d'une phrase Marba.",
    placeholder: "Phrase en Marba… (ex. : Ami i mi abagei ka memeera)",
  },
  {
    id: "corriger",
    label: "Correcteur",
    icon: "✅",
    description: "Écrivez une phrase en Marba : l'IA la vérifie à partir des exemples attestés.",
    placeholder: "Votre phrase en Marba (et ce que vous voulez dire en français)…",
  },
  {
    id: "dialogue",
    label: "Dialogues par secteur",
    icon: "💬",
    description: "Génère un dialogue réaliste (santé, marché, champ, administration…) avec vocabulaire.",
    placeholder: "Situation (ex. : une mère amène son enfant fiévreux au centre de santé)",
    sector: true,
  },
  {
    id: "message",
    label: "Message de sensibilisation",
    icon: "📢",
    description: "Prépare un message court pour la radio, un crieur ou une affiche (santé, agriculture, civisme…).",
    placeholder: "Message à faire passer (ex. : dormez sous moustiquaire pour éviter le paludisme)",
    sector: true,
  },
  {
    id: "exercices",
    label: "Générateur d'exercices",
    icon: "📝",
    description: "Crée des exercices corrigés (QCM, traduction, phrases à compléter) sur un thème.",
    placeholder: "Thème ou niveau (ex. : les nombres, débutant)",
    sector: true,
  },
  {
    id: "fiche",
    label: "Fiche pédagogique",
    icon: "🏫",
    description: "Pour les enseignants et alphabétiseurs : plan de cours complet en Marba.",
    placeholder: "Sujet de la séance (ex. : les parties du corps, CP, 45 minutes)",
    sector: true,
  },
  {
    id: "proverbe",
    label: "Expliquer un proverbe",
    icon: "🪶",
    description: "Sens littéral, sens figuré, contexte d'usage et équivalent français.",
    placeholder: "Proverbe en Marba ou en français…",
  },
  {
    id: "grammaire",
    label: "Grammaire",
    icon: "🔤",
    description: "Explication d'un point de grammaire illustrée par des phrases authentiques.",
    placeholder: "Ex. : Comment se forme la négation ? Les pronoms personnels ?",
  },
];

export const AI_MODE_BY_ID = new Map(AI_MODES.map((m) => [m.id, m]));

export interface AiRequestBody {
  mode: AiModeId;
  input: string;
  sector?: string;
  history?: { role: "user" | "assistant"; content: string }[];
}

export const MAX_INPUT = 2000;
export const MAX_HISTORY = 12;
