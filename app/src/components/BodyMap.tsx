import { useEffect, useRef } from "react";
import bodySvg from "../data/body-map.svg?raw";
import { SYSTEMS, type SystemId } from "../data/content";
import type { Level } from "../data/mission";
import { LEVEL_COLOR, LEVEL_TEXT } from "../lib/ui";

interface Props {
  statuses: Record<SystemId, { level: Level }>;
  selected: SystemId | null;
  onSelect: (id: SystemId) => void;
}

/** Interactive anatomical map (hand-authored SVG by the brand team). Each system group gets its status color via
 *  --sys-color, is keyboard-focusable and announces its name and status. */
export function BodyMap({ statuses, selected, onSelect }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const cleanups: (() => void)[] = [];
    for (const sys of SYSTEMS) {
      const g = root.querySelector<SVGGElement>(`#${sys.svgId}`);
      if (!g) continue;
      const level = statuses[sys.id]?.level ?? "NODATA";
      g.style.setProperty("--sys-color", LEVEL_COLOR[level]);
      g.style.cursor = "pointer";
      g.style.opacity = selected && selected !== sys.id ? "0.45" : "1";
      g.style.transition = "opacity .2s";
      g.setAttribute("tabindex", "0");
      g.setAttribute("role", "button");
      g.setAttribute("aria-label", `${sys.name}: ${LEVEL_TEXT[level]}`);
      const click = () => onSelect(sys.id);
      const key = (e: KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(sys.id); } };
      g.addEventListener("click", click);
      g.addEventListener("keydown", key);
      cleanups.push(() => { g.removeEventListener("click", click); g.removeEventListener("keydown", key); });
    }
    return () => cleanups.forEach((c) => c());
  }, [statuses, selected, onSelect]);

  return (
    <div ref={ref} className="mx-auto w-full max-w-[300px] [&_svg]:h-auto [&_svg]:w-full" aria-label="Interactive body map"
      dangerouslySetInnerHTML={{ __html: bodySvg.replace(/width="400" height="800"/, "") }} />
  );
}
