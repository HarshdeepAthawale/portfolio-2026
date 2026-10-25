import { SiteChrome } from "@/components/site-chrome";
import { GameScreen } from "@/components/minecraft/ui";

export default function NotFound() {
  return <SiteChrome>
    <GameScreen title="Page not found">
      <section className="mc-dark-panel flex flex-1 items-center justify-center">
        <div className="mc-empty"><p>404</p><span>The page you’re looking for doesn’t exist or was moved.</span></div>
      </section>
    </GameScreen>
  </SiteChrome>;
}
