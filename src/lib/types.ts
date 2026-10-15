export interface Example {
  mar: string;
  fr: string;
}

export interface Entry {
  id: string;
  word: string;
  forms: string[];
  pos: string[];
  posLabel: string;
  letter: string;
  head: string;
  gloss: string;
  definition: string[];
  examples: Example[];
  expressions: Example[];
  tags?: string[];
}

export interface DictionaryMeta {
  title: string;
  source: string;
  introduction: string[];
  alphabet: string[];
  entryCount: number;
  exampleCount: number;
  proverbCount: number;
}

export interface Dictionary {
  meta: DictionaryMeta;
  entries: Entry[];
}

export interface Proverb {
  id: number;
  mar: string;
  fr: string;
}
