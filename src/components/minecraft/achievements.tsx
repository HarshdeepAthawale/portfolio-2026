import Link from "next/link";
import Image from "next/image";
import { achievements } from "@/config/achievements";
import { GameScreen } from "./ui";

export function MinecraftAchievements() {
  return <GameScreen title="Advancements" className="mc-achievements-screen"><div className="mc-dark-panel mc-scrollbar mc-advancement-scroll" role="region" tabIndex={0} aria-label="Achievements"><div className="mc-advancement-grid">{achievements.map((item, index) => <Link href={`/achievements/${item.slug}`} key={item.slug} className="mc-advancement-card mc-item-panel"><div className="mc-advancement-image">{item.image && <Image src={item.image} alt={item.organization} width={800} height={450} sizes="(min-width: 640px) 45vw, 90vw" />}</div><div><span className="mc-advancement-unlocked">Advancement Made! <span>{String(index + 1).padStart(2, "0")}</span></span><h2>{item.title}</h2><p>{item.organization} · {item.year}</p><p>{item.details?.[0]}</p></div></Link>)}</div></div></GameScreen>;
}
