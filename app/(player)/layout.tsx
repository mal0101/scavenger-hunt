import PlayerShell from "@/components/layout/player-shell";

export default function PlayerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PlayerShell>{children}</PlayerShell>;
}
