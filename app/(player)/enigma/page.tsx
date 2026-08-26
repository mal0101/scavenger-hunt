"use client";

export default function EnigmaPage() {
  return (
    <div className="px-4 space-y-6 max-w-md mx-auto">
      <div className="text-center space-y-1 mt-2">
        <h2 className="font-headline text-headline-lg-mobile text-primary">
          PRESSURE VAULT
        </h2>
        <p className="font-label text-label-sm text-on-surface-variant uppercase tracking-widest">
          Alignment Required
        </p>
      </div>

      {/* Cylinder */}
      <div className="flex justify-center">
        <div className="relative w-64 h-64 rounded-full bg-surface-container-low border-2 border-outline-variant amber-glow-lg flex items-center justify-center">
          <div className="absolute inset-0 rounded-full brass-glow pointer-events-none border border-primary-container/30" />

          {/* Axle lines */}
          <div className="absolute w-1 h-full bg-surface-container border-x border-outline-variant z-10" />
          <div className="absolute h-1 w-full bg-surface-container border-y border-outline-variant z-10" />

          {/* Center core */}
          <div className="absolute w-16 h-16 bg-surface-bright rounded-full border-2 border-primary-container z-20 flex items-center justify-center shadow-[0_0_15px_#d97707]">
            <span className="material-symbols-outlined text-primary text-3xl">
              lock
            </span>
          </div>

          {/* Outer ring symbols */}
          <span className="absolute top-2 text-primary text-sm material-symbols-outlined">
            water_drop
          </span>
          <span className="absolute bottom-2 text-primary text-sm material-symbols-outlined">
            thermostat
          </span>
          <span className="absolute left-2 text-primary text-sm material-symbols-outlined">
            speed
          </span>
          <span className="absolute right-2 text-primary text-sm material-symbols-outlined">
            waves
          </span>

          {/* Alignment indicator */}
          <div className="absolute top-0 w-1 h-12 bg-primary-container z-30 shadow-[0_0_8px_#d97707] opacity-80" />
        </div>
      </div>

      {/* Sensor Readout */}
      <div className="glass-panel arch-top rounded-xl p-4">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-2xl animate-pulse">
            sensors
          </span>
          <div>
            <p className="font-label text-label-sm text-primary">
              SENSOR READOUT
            </p>
            <p className="font-body text-body-md text-on-surface-variant">
              Pressure variance detected. Align symbols along the vertical
              meridian.
            </p>
          </div>
        </div>
      </div>

      {/* Mariner's Log */}
      <div className="bg-surface-container-low border-t-2 border-primary-container border-x border-b border-outline-variant rounded-xl p-5 space-y-3">
        <h3 className="font-headline text-headline-lg-mobile text-primary border-b border-outline-variant pb-2 inline-block">
          The Mariner&apos;s Log
        </h3>
        <div className="font-body text-body-lg text-on-surface-variant space-y-3 italic">
          <p>
            Where the white walls meet the surging tide,
            <br />
            And ancient brass holds steam inside.
          </p>
          <p>
            Seek the gauge that measures naught but heat,
            <br />
            Beneath the shadow of the minaret&apos;s seat.
          </p>
        </div>
      </div>

      {/* Action */}
      <button className="w-full py-4 bg-primary-container text-on-primary-container font-label text-label-sm font-bold uppercase tracking-widest rounded-lg hover:shadow-[0_0_20px_rgba(217,119,7,0.4)] transition-all flex items-center justify-center gap-2">
        <span className="material-symbols-outlined text-lg">vpn_key</span>
        Verify Alignment
      </button>
    </div>
  );
}
