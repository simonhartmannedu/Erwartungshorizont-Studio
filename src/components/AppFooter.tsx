import { CupIcon } from "./icons";

export const AppFooter = () => {
  const emailUser = "simonhartmann";
  const emailHost = "mailbox.org";
  const emailAddress = `${emailUser}@${emailHost}`;

  return (
    <footer className="app-footer mt-10 border-t pt-6 no-print">
      <div className="app-footer-grid">
        <div className="app-footer-copy">
          <p className="label">Hinweis</p>
          <p className="app-footer-text">
            Benutzung auf eigene Gefahr. Diese Anwendung wird ohne Gewähr und ohne Zusicherung der Eignung für einen
            bestimmten Zweck bereitgestellt. Ergebnisse, Notenschlüssel, Ausdrucke und datenschutzrechtliche Abläufe
            müssen vor dem produktiven Einsatz eigenverantwortlich geprüft werden.
          </p>
          <p className="app-footer-text">
            Creator of this app: Simon Hartmann. Kontakt:{" "}
            <a className="app-footer-link" href={`mailto:${emailAddress}`}>
              {emailUser}
              {"@"}
              {emailHost}
            </a>
          </p>
          <p className="app-footer-text">
            Copyright und Lizenzhinweis: Die Anwendung selbst unterliegt den Bedingungen der lokalen{" "}
            <a className="app-footer-link" href="/LICENSE" target="_blank" rel="noreferrer">
              Lizenzdatei
            </a>
            . Die gebündelten UI-Sounds stammen aus Kenney&apos;s CC0-Pack; der Lizenztext liegt unter{" "}
            <a
              className="app-footer-link"
              href="/licenses/kenney-interface-sounds-license.txt"
              target="_blank"
              rel="noreferrer"
            >
              /licenses/kenney-interface-sounds-license.txt
            </a>
            .
          </p>
        </div>
        <div className="app-footer-support">
          <p className="label">Support</p>
          <a
            className="app-footer-support-button"
            href="https://ko-fi.com/M4M41Y3MP2"
            target="_blank"
            rel="noreferrer"
          >
            <CupIcon className="h-3.5 w-3.5" />
            Support me on Ko-fi
          </a>
          <p className="app-footer-text">
            Direkter Link:{" "}
            <a className="app-footer-link" href="https://ko-fi.com/M4M41Y3MP2" target="_blank" rel="noreferrer">
              ko-fi.com/M4M41Y3MP2
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
};
