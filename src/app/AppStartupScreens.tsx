export const StorageUnavailableScreen = ({ detail, onReload }: { detail: string; onReload: () => void }) => (
  <div className="min-h-screen px-4 py-6 lg:px-8">
    <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-3xl items-center justify-center">
      <section className="panel w-full p-6 sm:p-8">
        <h1 className="themed-strong text-2xl font-semibold">Lokaler Speicher nicht verfügbar</h1>
        <p className="themed-muted mt-3 text-sm leading-6">{detail}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" className="button-primary" onClick={onReload}>
            Seite neu laden
          </button>
        </div>
      </section>
    </div>
  </div>
);

/** Static loading view; storage initialization and error handling stay in App. */
export const StorageLoadingScreen = () => (
  <div className="min-h-screen px-4 py-6 lg:px-8">
    <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-[1880px] items-center justify-center">
      <section className="storage-loader-shell w-full max-w-3xl">
        <div className="storage-loader-stage">
          <div className="storage-loader-copy">
            <p className="storage-loader-kicker">Erwartungshorizont Studio</p>
            <h1 className="storage-loader-title">Lokaler Speicher wird vorbereitet</h1>
            <p className="storage-loader-text">
              Die Anwendung initialisiert den SQLite-Speicher, prüft vorhandene Datenstände und stellt den letzten
              Arbeitsstand wieder her.
            </p>
            <div className="storage-loader-status" role="status" aria-live="polite">
              <span className="storage-loader-status-dot" />
              Speicher synchronisiert
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
);
