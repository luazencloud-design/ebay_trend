import type { Zone } from "../types";

interface ZonePillProps {
  zone: Zone;
}

export function ZonePill({ zone }: ZonePillProps) {
  return (
    <span className={"zone-pill " + zone}>
      <i className="zdot" />
      {zone === "red" ? "RED ZONE" : "BLUE ZONE"}
    </span>
  );
}
