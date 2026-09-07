export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center relative overflow-hidden">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary-container/5 via-transparent to-transparent" />

      {/* Decorative pipes (desktop only) */}
      <div className="hidden lg:flex fixed left-8 top-0 bottom-0 flex-col items-center">
        <div className="w-1 bg-outline-variant/20 h-full" />
      </div>
      <div className="hidden lg:flex fixed right-8 top-0 bottom-0 flex-col items-center">
        <div className="w-1 bg-outline-variant/20 h-full" />
      </div>

      {/* Brand watermark — faint kickoff seal behind the auth card */}
      <div
        className="pointer-events-none fixed inset-0 flex items-center justify-center z-0"
        aria-hidden="true"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/branding/ade_logo_kickoff_alpha.webp"
          alt=""
          draggable={false}
          className="w-[min(60vw,420px)] opacity-[0.08] mix-blend-screen select-none"
        />
      </div>

      <main className="relative z-10 w-full max-w-md mx-auto px-5">
        {children}
      </main>
    </div>
  );
}
