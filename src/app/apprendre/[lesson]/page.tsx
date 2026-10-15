import dictionary from "@/data/dictionary.json";
import { buildCourses } from "@/lib/lessons";
import type { Dictionary } from "@/lib/types";
import LessonView from "./LessonView";

export const dynamicParams = false;

export function generateStaticParams() {
  return buildCourses((dictionary as unknown as Dictionary).entries).flatMap((c) => c.lessons.map((l) => ({ lesson: l.id })));
}

export default async function LessonPage({ params }: { params: Promise<{ lesson: string }> }) {
  const { lesson } = await params;
  return <LessonView lessonId={lesson} />;
}
