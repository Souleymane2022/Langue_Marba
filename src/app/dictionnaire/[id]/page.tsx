import dictionary from "@/data/dictionary.json";
import type { Dictionary } from "@/lib/types";
import EntryView from "./EntryView";

// Une page statique par mot : permet l'hébergement sur GitHub Pages.
export const dynamicParams = false;

export function generateStaticParams() {
  return (dictionary as unknown as Dictionary).entries.map((e) => ({ id: e.id }));
}

export default async function EntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EntryView id={id} />;
}
