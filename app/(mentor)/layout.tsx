import MentorShell from "@/components/layout/mentor-shell";

export default function MentorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MentorShell>{children}</MentorShell>;
}
