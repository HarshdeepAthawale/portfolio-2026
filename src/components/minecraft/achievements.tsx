import { Fragment } from "react";
import Link from "next/link";
import Image from "next/image";
import { achievements, type Achievement } from "@/config/achievements";
import { GameScreen } from "./ui";

// Security milestones form one branch; everything else (hackathons) the other.
const isSecurity = (item: Achievement) => /tryhackme|intigriti|hall-of-fame|bounty/i.test(item.slug);
// Frame colours follow Minecraft's advancement types.
const frame = (item: Achievement) => /winner|award|hall of fame|top 1%/i.test(item.title) ? "challenge" : /runner-up/i.test(item.title) ? "goal" : "task";
const icons = ["/minecraft/images/skills/enchant-book.png", "/minecraft/images/skills/diamond-sword.png", "/minecraft/images/skills/diamond-pickaxe.png", "/minecraft/images/skills/diamond-axe.png", "/minecraft/images/skills/diamond-shovel.png"];

function AdvancementTree() {
  // The content file lists newest first; a branch reads oldest → newest.
  const branches = [
    { name: "Security", items: achievements.filter(isSecurity).reverse() },
    { name: "Hackathons", items: achievements.filter(item => !isSecurity(item)).reverse() },
  ].filter(branch => branch.items.length);
  return <section className="mc-adv-tree" aria-label="Advancement tree">
    {branches.map(branch => <div className="mc-adv-branch" key={branch.name}>
      <h2>{branch.name}</h2>
      <ol className="mc-adv-chain">
        {branch.items.map((item, index) => <Fragment key={item.slug}>
          {index > 0 && <li className="mc-adv-link" aria-hidden="true" />}
          <li className="mc-adv-node-wrap">
            <Link href={`/achievements/${item.slug}`} className={`mc-adv-node mc-adv-${frame(item)}`} aria-label={`${item.title}, ${item.organization}, ${item.periodLong} ${item.year}`}>
              <Image src={icons[achievements.indexOf(item) % icons.length]} alt="" width={32} height={32} />
            </Link>
            <span className="mc-adv-tooltip" aria-hidden="true"><strong className={`mc-adv-title-${frame(item)}`}>{item.title}</strong><span>{item.organization}</span><small>{/\d{4}/.test(item.periodShort) ? item.periodShort : `${item.periodShort} ${item.year}`}</small></span>
          </li>
        </Fragment>)}
      </ol>
    </div>)}
  </section>;
}

export function MinecraftAchievements() {
  return <GameScreen title="Advancements" className="mc-achievements-screen"><div className="mc-dark-panel mc-scrollbar mc-advancement-scroll" role="region" tabIndex={0} aria-label="Achievements"><AdvancementTree /><div className="mc-advancement-grid">{achievements.map((item, index) => <Link href={`/achievements/${item.slug}`} key={item.slug} className="mc-advancement-card mc-item-panel"><div className="mc-advancement-image">{item.image && <Image src={item.image} alt={item.organization} width={800} height={450} sizes="(min-width: 640px) 45vw, 90vw" />}</div><div><span className="mc-advancement-unlocked">Advancement Made! <span>{String(index + 1).padStart(2, "0")}</span></span><h2>{item.title}</h2><p>{item.organization} · {item.year}</p><p>{item.details?.[0]}</p></div></Link>)}</div></div></GameScreen>;
}
