import { Fragment } from "react";
import { IconChevron } from "./icons";

export interface CrumbItem {
  label: string;
  onClick?: () => void;
}

interface CrumbProps {
  items: CrumbItem[];
}

export function Crumb({ items }: CrumbProps) {
  return (
    <div className="crumb">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <Fragment key={i}>
            {isLast ? (
              <span className="current">{item.label}</span>
            ) : (
              <span className="step" onClick={item.onClick}>
                {item.label}
              </span>
            )}
            {!isLast && (
              <span className="sep">
                <IconChevron />
              </span>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
