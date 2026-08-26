"use client";

export default function MentorSettingsPage() {
  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div className="space-y-1">
        <h1 className="font-headline text-headline-xl text-on-surface">
          Platform Settings
        </h1>
        <p className="font-body text-body-md text-on-surface-variant">
          Configure global platform behavior
        </p>
      </div>

      {/* General Settings */}
      <div className="bg-surface-container rounded-xl border border-outline-variant/30 p-6 space-y-4">
        <h3 className="font-headline text-lg text-on-surface border-b border-outline-variant/30 pb-3">
          General
        </h3>
        <div className="space-y-4">
          <div>
            <label className="font-label text-label-sm text-on-surface-variant uppercase block mb-2">
              Platform Name
            </label>
            <input
              type="text"
              defaultValue="Aether Compass"
              className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-lg font-body text-body-md text-on-surface focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="font-label text-label-sm text-on-surface-variant uppercase block mb-2">
              Default Max Team Size
            </label>
            <input
              type="number"
              defaultValue={6}
              min={2}
              max={10}
              className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-lg font-body text-body-md text-on-surface focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="font-label text-label-sm text-on-surface-variant uppercase block mb-2">
              Default Elimination Percentage
            </label>
            <input
              type="number"
              defaultValue={20}
              min={5}
              max={50}
              className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-lg font-body text-body-md text-on-surface focus:outline-none focus:border-primary"
            />
          </div>
        </div>
      </div>

      {/* OTP Settings */}
      <div className="bg-surface-container rounded-xl border border-outline-variant/30 p-6 space-y-4">
        <h3 className="font-headline text-lg text-on-surface border-b border-outline-variant/30 pb-3">
          OTP / Authentication
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-surface-container-low rounded-lg border border-outline-variant/20">
            <div>
              <p className="font-body text-body-md text-on-surface">
                Mock OTP Mode
              </p>
              <p className="font-label text-label-sm text-on-surface-variant">
                Accept code 000000 for testing
              </p>
            </div>
            <div className="w-12 h-6 bg-primary-container rounded-full relative cursor-pointer">
              <div className="absolute top-1 left-1 w-4 h-4 bg-on-primary-container rounded-full shadow transition-transform translate-x-6" />
            </div>
          </div>
          <div>
            <label className="font-label text-label-sm text-on-surface-variant uppercase block mb-2">
              OTP Expiry (seconds)
            </label>
            <input
              type="number"
              defaultValue={300}
              min={60}
              max={600}
              className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-lg font-body text-body-md text-on-surface focus:outline-none focus:border-primary"
            />
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="bg-surface-container rounded-xl border border-outline-variant/30 p-6 space-y-4">
        <h3 className="font-headline text-lg text-on-surface border-b border-outline-variant/30 pb-3">
          Security
        </h3>
        <div className="space-y-4">
          <div>
            <label className="font-label text-label-sm text-on-surface-variant uppercase block mb-2">
              QR Freshness Window (seconds)
            </label>
            <input
              type="number"
              defaultValue={300}
              min={60}
              max={600}
              className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-lg font-body text-body-md text-on-surface focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="font-label text-label-sm text-on-surface-variant uppercase block mb-2">
              Rate Limit: Scans per minute per player
            </label>
            <input
              type="number"
              defaultValue={10}
              min={1}
              max={30}
              className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-lg font-body text-body-md text-on-surface focus:outline-none focus:border-primary"
            />
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button className="px-6 py-2.5 bg-primary-container text-on-primary-container font-label text-label-sm font-bold uppercase tracking-widest rounded-lg hover:shadow-[0_0_15px_rgba(217,119,7,0.3)] transition-all">
          Save Settings
        </button>
      </div>
    </div>
  );
}
