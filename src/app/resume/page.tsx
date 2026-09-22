import Link from "next/link";
import { ArrowSquareOut, DownloadSimple } from "@phosphor-icons/react/dist/ssr";
import { Container } from "@/components/container";
import { resumeConfig } from "@/config/resume";

export const metadata = {
  title: "Resume - Harshdeep Athawale",
  description: resumeConfig.description,
};

export default function ResumePage() {
  return (
    <div className="space-y-8 pb-16 pt-8">
      <Container>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-medium tracking-tight">{resumeConfig.title}</h1>
            <p className="mt-3 max-w-xl text-secondary">{resumeConfig.description}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={resumeConfig.viewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
            >
              Open PDF
              <ArrowSquareOut className="size-4" />
            </Link>
            <Link
              href={resumeConfig.downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
            >
              Download
              <DownloadSimple className="size-4" />
            </Link>
          </div>
        </div>
      </Container>

      <Container>
        {/* A rendered page image instead of an embedded PDF: the browser's PDF
            viewer adds its own dark toolbar/backdrop that can't be styled away.
            Clicking opens the real PDF. Keep resume-preview.png in sync with it. */}
        <Link
          href={resumeConfig.viewUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open resume PDF"
          className="group relative block overflow-hidden rounded-2xl border border-border bg-white p-3 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg sm:p-6"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- static full-res page render */}
          <img
            src={resumeConfig.previewImage}
            alt="Harshdeep Athawale resume"
            className="w-full"
          />
          <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-gradient-to-t from-black/60 to-transparent px-4 py-4 text-sm font-medium text-white sm:hidden">
            Tap to open full PDF
            <ArrowSquareOut className="size-4" />
          </span>
        </Link>
      </Container>
    </div>
  );
}
