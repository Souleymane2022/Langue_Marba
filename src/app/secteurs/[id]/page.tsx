import { SECTORS } from "@/lib/sectors";
import SectorView from "./SectorView";

export const dynamicParams = false;

export function generateStaticParams() {
  return SECTORS.map((s) => ({ id: s.id }));
}

export default async function SectorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SectorView id={id} />;
}
