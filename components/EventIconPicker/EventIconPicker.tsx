"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { EventIcon } from "@/components/EventIcon/EventIcon";
import { PixelButton } from "@/components/PixelButton/PixelButton";
import type { EventIcon as EventIconData } from "@/lib/events/icons";
import styles from "@/app/(authenticated)/events/events.module.css";

type EventIconPickerProps = {
  id: string;
  icons: EventIconData[];
  label?: string;
  floating?: boolean;
} & (
  | {
      allowAll: true;
      selectedIconId: number | null;
      onSelect: (iconId: number | null) => void;
    }
  | {
      allowAll?: false;
      selectedIconId: number;
      onSelect: (iconId: number) => void;
    }
);

function AllIcon({ label = "" }: { label?: string }) {
  return (
    <Image
      className={styles.eventIcon}
      src="/icons/All.png"
      alt={label}
      width={16}
      height={16}
      unoptimized
    />
  );
}

export function EventIconPicker(props: EventIconPickerProps) {
  const { id, icons, label = "Icon", floating = false } = props;
  const [isGridOpen, setIsGridOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const gridId = `${id}-grid`;
  const selectedIcon = icons.find((icon) => icon.id === props.selectedIconId);
  const allSelected = props.allowAll && props.selectedIconId === null;

  const closeGrid = useCallback(() => {
    setIsGridOpen(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!floating || !isGridOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !pickerRef.current?.contains(event.target)) {
        closeGrid();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeGrid();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [floating, isGridOpen, closeGrid]);

  if (!allSelected && !selectedIcon) {
    throw new Error("Select a valid event icon.");
  }

  return (
    <div className={styles.iconPicker} ref={pickerRef} role="group" aria-label={label}>
      <span className={styles.label}>{label}</span>
      <div className={styles.iconPickerControls}>
        {allSelected ? (
          <AllIcon label="All event icons" />
        ) : selectedIcon && (
          <EventIcon
            className={styles.eventIcon}
            fileName={selectedIcon.fileName}
            label={`${selectedIcon.name} icon`}
          />
        )}
        <PixelButton
          className={styles.iconSelectButton}
          type="button"
          ref={triggerRef}
          aria-expanded={isGridOpen}
          aria-controls={gridId}
          onClick={() => setIsGridOpen((isOpen) => !isOpen)}
        >
          Select icon
        </PixelButton>
      </div>

      {isGridOpen && (
        <div
          className={[
            styles.iconGrid,
            floating && styles.floatingIconGrid,
          ].filter(Boolean).join(" ")}
          id={gridId}
          role="group"
          aria-label="Event icons"
        >
          {props.allowAll && (
            <button
              className={styles.iconOption}
              type="button"
              aria-label="Select all event icons"
              aria-pressed={allSelected}
              onClick={() => {
                props.onSelect(null);
                closeGrid();
              }}
            >
              <AllIcon />
            </button>
          )}
          {icons.map((icon) => (
            <button
              className={styles.iconOption}
              type="button"
              aria-label={`Select ${icon.name} icon`}
              aria-pressed={icon.id === props.selectedIconId}
              onClick={() => {
                props.onSelect(icon.id);
                closeGrid();
              }}
              key={icon.id}
            >
              <EventIcon className={styles.eventIcon} fileName={icon.fileName} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
