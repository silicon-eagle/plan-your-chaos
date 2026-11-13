import Image from "next/image";
import styles from "./UserAvatar.module.css";

type UserAvatarProps = {
  name: string;
  decorative?: boolean;
};

export function UserAvatar({
  name,
  decorative = false,
}: UserAvatarProps) {
  const initial = name.trim().charAt(0).toLowerCase();
  if (!/^[a-z]$/.test(initial)) {
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
      src={`/images/avatars/avatar_${initial === "w" ? "W" : initial}.png`}
      alt={decorative ? "" : `${name} avatar`}
      width={16}
      height={16}
      unoptimized
    />
  );
}
