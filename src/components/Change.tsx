import { IconArrowDown, IconArrowUp, IconDash } from "./icons";

interface ChangeProps {
  value: number;
  mono?: boolean;
}

export function Change({ value, mono = true }: ChangeProps) {
  if (value === 0) {
    return (
      <span className="chg flat">
        <IconDash />
        <span className={mono ? "mono" : ""}>0</span>
      </span>
    );
  }
  const up = value > 0;
  return (
    <span className={"chg " + (up ? "up" : "down")}>
      {up ? <IconArrowUp /> : <IconArrowDown />}
      <span className={mono ? "mono" : ""}>{Math.abs(value)}</span>
    </span>
  );
}
