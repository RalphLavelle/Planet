import { allImageCredits } from "@/services/images";

export const metadata = { title: "Photo credits — Planet" };

export default function Credits() {
  const list = allImageCredits();
  return (
    <div className="page narrow">
      <h1>Photo credits</h1>
      <p className="muted">Sample-destination photos are freely licensed images from Wikimedia Commons, resized and bundled with Planet. Each is used under the licence shown; click through for the original file and full licence terms. Photos illustrate places in general and are not current or verified.</p>
      <ul className="credits">
        {list.map(([key, c]) => (
          <li key={key}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={c.src} alt="" loading="lazy" />
            <div><strong>{key}</strong><br /><a href={c.sourceUrl} target="_blank" rel="noopener noreferrer">{c.title}</a><br />
              <span className="muted">by {c.author} · {c.licenseUrl ? <a href={c.licenseUrl} target="_blank" rel="noopener noreferrer">{c.license}</a> : c.license}</span></div>
          </li>
        ))}
      </ul>
      <p className="muted">Functional icons: <a href="https://lucide.dev">Lucide</a> (ISC). Decorative ornaments (Greek key, mati, columns, amphora, olives, skylines) are original SVGs made for Planet.</p>
    </div>
  );
}
