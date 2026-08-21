import { useId, useMemo, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";

export interface TabItem {
  id: string;
  label: string;
  content: ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  defaultActiveId?: string;
  activeId?: string;
  onChange?: (id: string) => void;
  ariaLabel?: string;
  className?: string;
}

export function Tabs({
  items,
  defaultActiveId,
  activeId,
  onChange,
  ariaLabel = "Section tabs",
  className = "",
}: TabsProps) {
  const baseId = useId();
  const enabledItems = useMemo(() => items.filter((item) => !item.disabled), [items]);
  const fallbackId = defaultActiveId ?? enabledItems[0]?.id ?? "";
  const [internalActiveId, setInternalActiveId] = useState(fallbackId);
  const currentId = activeId ?? internalActiveId;
  const selected = items.find((item) => item.id === currentId && !item.disabled) ?? enabledItems[0];

  function select(id: string) {
    if (activeId === undefined) setInternalActiveId(id);
    onChange?.(id);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key) || enabledItems.length === 0) return;
    event.preventDefault();

    const currentEnabledIndex = enabledItems.findIndex((item) => item.id === items[index]?.id);
    let nextIndex = currentEnabledIndex;
    if (event.key === "ArrowRight") nextIndex = (currentEnabledIndex + 1) % enabledItems.length;
    if (event.key === "ArrowLeft") nextIndex = (currentEnabledIndex - 1 + enabledItems.length) % enabledItems.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = enabledItems.length - 1;

    const next = enabledItems[nextIndex];
    if (!next) return;
    select(next.id);
    document.getElementById(`${baseId}-tab-${next.id}`)?.focus();
  }

  return (
    <div className={["tabs", className].filter(Boolean).join(" ")}>
      <div className="tabs__list" role="tablist" aria-label={ariaLabel}>
        {items.map((item, index) => {
          const isSelected = selected?.id === item.id;
          return (
            <button
              key={item.id}
              id={`${baseId}-tab-${item.id}`}
              className="tabs__tab"
              type="button"
              role="tab"
              aria-selected={isSelected}
              aria-controls={`${baseId}-panel-${item.id}`}
              tabIndex={isSelected ? 0 : -1}
              disabled={item.disabled}
              onClick={() => select(item.id)}
              onKeyDown={(event) => handleKeyDown(event, index)}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {selected && (
        <div
          id={`${baseId}-panel-${selected.id}`}
          className="tabs__panel"
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-${selected.id}`}
          tabIndex={0}
        >
          {selected.content}
        </div>
      )}
    </div>
  );
}
