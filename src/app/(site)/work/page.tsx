import { Container } from "@/components/container";
import { ExperienceSection } from "@/components/landing/experience-section";

export const metadata = {
  title: "Work - Harshdeep Athawale",
};

export default function WorkPage() {
  return (
    <div className="space-y-10 pb-16 pt-8">
      <Container>
        <h1 className="font-display text-3xl font-medium tracking-tight">Work</h1>
        <p className="mt-3 text-muted-foreground">
          Roles and internships where I&apos;ve built, shipped, and learned.
        </p>
      </Container>
      <ExperienceSection />
    </div>
  );
}
