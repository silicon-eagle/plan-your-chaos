import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";
import styles from "./PixelButton.module.css";

type CommonProps = {
  children: ReactNode;
  className?: string;
  selected?: boolean;
};

type LinkProps = CommonProps &
  Omit<ComponentProps<typeof Link>, "children" | "className">;

type ButtonProps = CommonProps &
  Omit<ComponentProps<"button">, "children" | "className"> & {
    href?: never;
  };

type PixelButtonProps = LinkProps | ButtonProps;

function getClassName(className: string | undefined, selected: boolean) {
  return [styles.button, selected && styles.selected, className]
    .filter(Boolean)
    .join(" ");
}

export function PixelButton(props: PixelButtonProps) {
  const selected = props.selected ?? false;

  if ("href" in props && props.href !== undefined) {
    const { children, className, ...linkProps } = props;
    delete linkProps.selected;

    return (
      <Link
        {...linkProps}
        className={getClassName(className, selected)}
        aria-current={linkProps["aria-current"] ?? (selected ? "page" : undefined)}
      >
        {children}
      </Link>
    );
  }

  const { children, className, ...buttonProps } = props;
  delete buttonProps.selected;

  return (
    <button
      {...buttonProps}
      className={getClassName(className, selected)}
      aria-pressed={buttonProps["aria-pressed"] ?? selected}
    >
      {children}
    </button>
  );
}
