export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-surface flex flex-col items-center justify-center relative overflow-hidden">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary-container/5 via-transparent to-transparent" />

      {/* Decorative pipes (desktop only) */}
      <div className="hidden lg:flex fixed left-8 top-0 bottom-0 flex-col items-center">
        <div className="w-1 bg-outline-variant/20 h-full" />
      </div>
      <div className="hidden lg:flex fixed right-8 top-0 bottom-0 flex-col items-center">
        <div className="w-1 bg-outline-variant/20 h-full" />
      </div>

      <main className="relative z-10 w-full max-w-md mx-auto px-5">
        {children}
      </main>
    </div>
  );
}
