import type { Metadata } from "next";
import { ResumeUploader } from "@/app/admin/_components/resume-uploader";

export const metadata: Metadata = { title: "Resume" };

export default function ResumePage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.15em] text-secondary">Resume</p>
        <h1 className="font-display mt-1 text-3xl font-medium tracking-tight">Replace your resume</h1>
        <p className="mt-2 max-w-xl text-sm text-secondary">
          Upload the new PDF. The first page is rendered in your browser to refresh the preview image
          on /resume, and both are published together.
        </p>
      </div>
      <ResumeUploader />
    </div>
  );
}
