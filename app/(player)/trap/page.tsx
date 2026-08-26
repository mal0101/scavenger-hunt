"use client";

export default function TrapPage() {
  return (
    <div className="px-4 space-y-6 max-w-md mx-auto">
      {/* Danger overlay */}
      <div className="fixed inset-0 pointer-events-none z-50 animate-pulse-danger" />

      {/* Header */}
      <div className="flex flex-col items-center text-center space-y-2 mt-2">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-error-container border border-error/50 animate-flicker shadow-[0_0_15px_rgba(255,180,171,0.3)]">
          <span
            className="material-symbols-outlined text-on-error-container text-lg"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            warning
          </span>
          <span className="font-label text-label-sm text-on-error-container tracking-widest">
            CRITICAL PRESSURE BREACH
          </span>
        </div>
        <h1 className="font-headline text-headline-xl text-on-surface drop-shadow-md">
          Tidal Trap
        </h1>
        <div className="font-label text-label-md text-outline flex items-center gap-2">
          <span>SECTOR 4</span>
          <span className="w-1 h-1 rounded-full bg-outline" />
          <span>VAULT SECURE</span>
        </div>
      </div>

      {/* Timer */}
      <div className="flex justify-center">
        <div className="glass-panel rounded-xl px-8 py-4 flex flex-col items-center">
          <span className="font-label text-label-sm text-error uppercase mb-1">
            Time Remaining
          </span>
          <span className="font-headline text-6xl text-error font-bold tracking-widest drop-shadow-[0_0_8px_rgba(255,180,171,0.5)]">
            02:00
          </span>
        </div>
      </div>

      {/* Water Visualization */}
      <div className="relative w-full aspect-square rounded-2xl overflow-hidden glass-panel border-t-error p-1">
        <div className="absolute inset-1 rounded-xl overflow-hidden bg-surface-container-lowest">
          {/* Water level */}
          <div className="absolute bottom-0 left-0 right-0 h-[60%] bg-surface-container-high/80 backdrop-blur-sm border-t border-outline-variant transition-all">
            <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-secondary/20 to-transparent" />
            <span className="material-symbols-outlined text-secondary/30 text-6xl absolute top-8 left-1/2 -translate-x-1/2">
              water_drop
            </span>
          </div>

          {/* Gauges */}
          <div className="absolute top-4 left-4 bg-surface/80 border border-outline-variant rounded px-2 py-1 flex items-center gap-2">
            <span
              className="material-symbols-outlined text-error text-sm"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              speed
            </span>
            <span className="font-label text-label-sm text-error">98% CAP</span>
          </div>
          <div className="absolute top-4 right-4 bg-surface/80 border border-outline-variant rounded px-2 py-1 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary-container text-sm">
              thermostat
            </span>
            <span className="font-label text-label-sm text-primary-container">
              TEMP HI
            </span>
          </div>
        </div>
      </div>

      {/* Hydraulic Controls */}
      <div className="glass-panel p-4 rounded-xl space-y-4">
        <div className="flex items-center justify-between px-1 pt-1">
          <span className="font-headline text-headline-lg-mobile text-primary">
            HYDRAULIC RELAYS
          </span>
          <span className="font-label text-label-sm text-outline-variant">
            SEQ REQ
          </span>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {["LVL-01", "LVL-02", "LVL-03", "LVL-04"].map((label, i) => (
            <button key={label} className="flex flex-col items-center gap-2 group">
              <span className="font-label text-label-sm text-outline-variant">
                {label}
              </span>
              <div className="w-8 h-16 bg-surface-container-low border border-outline-variant rounded-full relative shadow-inner">
                <div
                  className={`absolute left-1 right-1 h-7 rounded-full border transition-all duration-300 ${
                    i === 1
                      ? "top-1 bg-primary-container border-primary-container shadow-[0_0_10px_rgba(217,119,7,0.5)]"
                      : "bottom-1 bg-surface-variant border-outline group-hover:bg-primary-container group-hover:border-primary-container group-hover:shadow-[0_0_10px_rgba(217,119,7,0.5)]"
                  }`}
                />
              </div>
            </button>
          ))}
        </div>

        <button className="w-full py-4 rounded-lg bg-surface-container border border-error text-error font-label text-label-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-error hover:text-on-error transition-all duration-300 shadow-[0_0_15px_rgba(255,180,171,0.1)] hover:shadow-[0_0_20px_rgba(255,180,171,0.4)]">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
            valve
          </span>
          Manual Pump Purge
        </button>
      </div>
    </div>
  );
}
