import type { ReactNode, Ref } from "react";

type AppShellProps = {
  appShellRef: Ref<HTMLDivElement>;
  children: ReactNode;
};

/**
 * Presentational outer shell for the application.
 *
 * Global initialization, state and dialogs intentionally remain owned by App
 * while the shell provides the stable page boundary for later extractions.
 */
export const AppShell = ({ appShellRef, children }: AppShellProps) => (
  <div ref={appShellRef} className="app-shell min-h-screen px-3 py-4 sm:px-4 sm:py-6 lg:px-8">
    {children}
  </div>
);
