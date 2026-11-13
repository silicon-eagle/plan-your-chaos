import styles from "./EventIcon.module.css";

type EventIconProps = {
  fileName: string;
  label?: string;
  colour?: "yellow" | "purple";
  className?: string;
};

export function EventIcon({
  fileName,
  label,
  colour = "yellow",
  className = "",
}: EventIconProps) {
  const mask = `url("/icons/yellow/${fileName}-yellow.png")`;
  return (
    <span
      className={`${styles.icon} ${className}`}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{
        maskImage: mask,
        WebkitMaskImage: mask,
        backgroundColor: colour === "yellow" ? "#F2C900" : "#4B2E83",
      }}
    />
  );
}
