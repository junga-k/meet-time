type AvatarProps = {
  name: string;
  profileImageUrl?: string | null;
  size?: "sm" | "md" | "lg";
};

export function Avatar({ name, profileImageUrl, size = "md" }: AvatarProps) {
  const sizeClass = `avatar-${size}`;
  if (profileImageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={profileImageUrl} alt={name} className={`avatar ${sizeClass}`} />;
  }
  return <div className={`avatar ${sizeClass}`}>{name.slice(0, 1)}</div>;
}
