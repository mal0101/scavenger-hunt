import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-5">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="flex justify-center">
          <div className="w-32 h-32 rounded-full border-4 border-outline-variant flex items-center justify-center relative">
            <span className="font-headline text-[80px] text-primary-container font-bold">
              4
            </span>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-surface-container border-2 border-primary-container flex items-center justify-center">
                <span
                  className="material-symbols-outlined text-primary text-3xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  search_off
                </span>
              </div>
            </div>
            <span className="font-headline text-[80px] text-primary-container font-bold">
              4
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="font-headline text-headline-lg text-on-surface">
            Lost in the Tunnels
          </h1>
          <p className="font-label text-label-md text-on-surface-variant uppercase tracking-wider">
            Sector not found in descent map
          </p>
        </div>

        <p className="font-body text-body-md text-on-surface-variant">
          The coordinates you seek do not match any known checkpoint in the
          Gadz&apos;arts Compass network. Perhaps the currents have shifted your
          position.
        </p>

        <Link
          href="/dock"
          className="inline-block py-3 px-8 bg-primary-container text-on-primary-container font-label text-label-sm font-bold uppercase tracking-widest rounded-lg hover:shadow-[0_0_20px_rgba(217,119,7,0.4)] transition-all"
        >
          Return to Dock
        </Link>
      </div>
    </div>
  );
}
