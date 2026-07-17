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
            <h1 className="text-3xl font-bold tracking-tight">{resumeConfig.title}</h1>
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
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {/* Desktop: embedded PDF viewer. Mobile browsers won't render a PDF
              inside an iframe, so we show a tappable page image there instead. */}
          <iframe
            src={resumeConfig.embedUrl}
            title="Harshdeep Athawale resume"
            className="hidden aspect-auto w-full min-h-[80vh] bg-muted sm:block"
            allow="autoplay"
          />
          <Link
            href={resumeConfig.viewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative block sm:hidden"
            aria-label="Open resume PDF"
          >
            <img
              src={resumeConfig.previewImage}
              alt="Harshdeep Athawale resume preview"
              className="w-full bg-white"
            />
            <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-gradient-to-t from-black/70 to-transparent px-4 py-4 text-sm font-medium text-white">
              Tap to open full PDF
              <ArrowSquareOut className="size-4" />
            </span>
          </Link>
        </div>
      </Container>
    </div>
  );
}
