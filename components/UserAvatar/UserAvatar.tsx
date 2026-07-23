import Image from "next/image";
import styles from "./UserAvatar.module.css";

type UserAvatarProps = {
  name: string;
  src: string | null;
  decorative?: boolean;
};

export function UserAvatar({
  name,
  src,
  decorative = false,
}: UserAvatarProps) {
  if (!src) {
    return (
      <span
        className={styles.fallback}
        role={decorative ? undefined : "img"}
        aria-hidden={decorative || undefined}
        aria-label={decorative ? undefined : `${name} avatar`}
      >
        {name.charAt(0).toUpperCase()}
      </span>
    );
  }

  return (
    <Image
      className={styles.avatar}
      src={src}
      alt={decorative ? "" : `${name} avatar`}
      width={16}
      height={16}
      unoptimized
    />
  );
}
