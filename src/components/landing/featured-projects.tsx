import { ProjectsGrid } from "@/components/projects-grid";

export function FeaturedProjects({ limit = 2, index }: { limit?: number; index?: number }) {
  return <ProjectsGrid limit={limit} showViewAll index={index} />;
}
