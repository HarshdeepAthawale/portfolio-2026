import { experience } from "@/config/experience";
import { education } from "@/config/education";
import { GameScreen, GameTags } from "./ui";
import { GameScroll } from "./game-scroll";

export function MinecraftExperience() {
  return <GameScreen title="Experience" className="mc-experience-screen">
    <section className="mc-dark-panel mc-experience-panel" aria-label="Work experience timeline">
      <GameScroll className="mc-experience-scroll" aria-label="Experience entries">
        <div className="mc-experience-list">
          {experience.map(item => <article className="mc-experience-entry" key={item.company}>
            <div className="mc-experience-date"><p>{item.periodShort}</p><p>{item.locationShort}</p></div>
            <div>
              <h2>{item.role ?? item.roles?.[0]?.title}<span> — {item.company}</span></h2>
              {item.roles ? item.roles.map(role => <div className="mc-role" key={role.title}>
                <h3>{role.title} <span>{role.periodLong}</span></h3>
                <ul className="mc-bullets">{role.details?.map(detail => <li key={detail}>{detail}</li>)}</ul>
              </div>) : <ul className="mc-bullets">{item.details?.map(detail => <li key={detail}>{detail}</li>)}</ul>}
              {item.tech && <GameTags items={item.tech} />}
            </div>
          </article>)}
          {education.map(item => <article className="mc-experience-entry" key={item.school}><div className="mc-experience-date"><p>{item.period}</p><p>Education</p></div><div><h2>{item.degree}<span> — {item.school}</span></h2><p className="mc-education-note">Core coursework: Data Structures &amp; Algorithms, Operating Systems, Computer Networks, DBMS.</p></div></article>)}
        </div>
      </GameScroll>
    </section>
  </GameScreen>;
}
