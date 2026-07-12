type BadgeProps = {
  tone: "blue" | "green" | "red" | "amber" | "gray";
  children: React.ReactNode;
};

export function Badge({ tone, children }: BadgeProps) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
