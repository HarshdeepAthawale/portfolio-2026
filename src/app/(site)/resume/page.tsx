import Link from "next/link";
import { GameButton, GameScreen } from "@/components/minecraft/ui";
import { GameScroll } from "@/components/minecraft/game-scroll";
import { resumeConfig } from "@/config/resume";

export const metadata = { title: "Resume - Harshdeep Athawale", description: resumeConfig.description };

export default function ResumePage() {
  return <GameScreen title={resumeConfig.title} backHref="/about" className="mc-resume-screen" actions={<>
    <a className="mc-button" href={resumeConfig.viewUrl} target="_blank" rel="noopener noreferrer">Open PDF</a>
    <a className="mc-button" href={resumeConfig.downloadUrl} download="Harshdeep-Athawale-Resume.pdf">Download</a>
    <GameButton href="/about">Back</GameButton>
  </>}>
    <GameScroll className="mc-dark-panel mc-collection-scroll" aria-label="Resume preview">
      <div className="mc-collection-content">
        <p className="mc-collection-description">{resumeConfig.description}</p>
        <Link href={resumeConfig.viewUrl} target="_blank" rel="noopener noreferrer" aria-label="Open resume PDF" className="mc-resume-preview">
          {/* eslint-disable-next-line @next/next/no-img-element -- full-resolution local PDF page render */}
          <img src={resumeConfig.previewImage} alt="Harshdeep Athawale resume" />
        </Link>
      </div>
    </GameScroll>
  </GameScreen>;
}
