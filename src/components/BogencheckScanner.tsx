import { BrowserQRCodeReader, IScannerControls } from "@zxing/browser";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Exam } from "../types";
import { calculateSelectableAnswerPoints, decodeAnswerSheetQrValue, getSelectableAnswerBlocks, getSelectableAnswerMaximum } from "../utils/answerSheets";
import { CameraIcon, CheckIcon, CloseIcon } from "./icons";
import { Card } from "./ui";

type ScanStudent = { id: string; label: string; answerSheetCode: string };
type Props = {
  exam: Exam;
  students: ScanStudent[];
  disabled: boolean;
  onApplyScores: (studentId: string, scoresByTaskId: Record<string, number>) => void;
};

type CameraState = "idle" | "starting" | "active" | "error";

const getEmptyMarks = (exam: Exam) => Object.fromEntries(getSelectableAnswerBlocks(exam).map((block) => [block.id, Array.from({ length: block.correctAnswers.length }, () => [])])) as Record<string, string[][]>;

export const BogencheckScanner = ({ exam, students, disabled, onApplyScores }: Props) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerControlsRef = useRef<IScannerControls | null>(null);
  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [cameraError, setCameraError] = useState("");
  const [workCode, setWorkCode] = useState("");
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const [marks, setMarks] = useState<Record<string, string[][]>>(() => getEmptyMarks(exam));
  const answerBlocks = getSelectableAnswerBlocks(exam);
  const student = students.find((entry) => entry.answerSheetCode === workCode) ?? null;

  const stopCamera = useCallback(() => {
    scannerControlsRef.current?.stop();
    scannerControlsRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraState((current) => current === "error" ? current : "idle");
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);
  useEffect(() => setMarks(getEmptyMarks(exam)), [exam]);

  const captureSnapshot = () => {
    const video = videoRef.current;
    if (!video?.videoWidth || !video.videoHeight) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    context?.drawImage(video, 0, 0);
    setSnapshot(canvas.toDataURL("image/jpeg", 0.82));
  };

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia || !videoRef.current) {
      setCameraState("error");
      setCameraError("Dieser Browser stellt keine Kamera-Schnittstelle bereit. Öffne EWH über HTTPS oder localhost und erlaube den Kamerazugriff.");
      return;
    }
    stopCamera();
    setCameraState("starting");
    setCameraError("");
    setSnapshot(null);
    try {
      const reader = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 180 });
      const controls = await reader.decodeFromConstraints(
        { audio: false, video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } } },
        videoRef.current,
        (result) => {
          if (!result) return;
          const code = decodeAnswerSheetQrValue(result.getText());
          if (!code || !students.some((entry) => entry.answerSheetCode === code)) return;
          scannerControlsRef.current?.stop();
          setCameraState("idle");
          setWorkCode(code);
          captureSnapshot();
        },
      );
      scannerControlsRef.current = controls;
      setCameraState("active");
    } catch (error) {
      console.error("Kamera konnte nicht gestartet werden", error);
      setCameraState("error");
      setCameraError("Kamera konnte nicht geöffnet werden. Prüfe die Browserberechtigung oder wähle ein Gerät mit Kamera.");
    }
  };

  const scoresByTaskId = useMemo(() => {
    const next: Record<string, number> = {};
    answerBlocks.forEach((block) => {
      if (!block.taskId) return;
      next[block.taskId] = (next[block.taskId] ?? 0) + calculateSelectableAnswerPoints(block, marks[block.id] ?? []);
    });
    return next;
  }, [answerBlocks, marks]);

  const saveScores = () => {
    if (!student) return;
    onApplyScores(student.id, scoresByTaskId);
    setSnapshot(null);
    setWorkCode("");
    setMarks(getEmptyMarks(exam));
  };

  return <div className="space-y-6">
    <Card title="Bogencheck · Scanmodus" subtitle="Kamera erkennt den QR-Code lokal. Die Aufnahme bleibt nur bis zur Übernahme im Arbeitsspeicher.">
      <div className="scan-camera-shell">
        <video ref={videoRef} className="scan-camera-video" muted playsInline aria-label="Kameraansicht für Antwortbogen" />
        <div className="scan-camera-guide" aria-hidden="true"><span /><span /><span /><span /></div>
        {cameraState !== "active" ? <div className="scan-camera-placeholder"><CameraIcon className="h-7 w-7" /><span>{cameraState === "starting" ? "Kamera startet …" : "Antwortbogen mit QR-Code in die Kamera halten"}</span></div> : null}
      </div>
      {cameraError ? <p className="mt-3 text-sm text-rose-700 dark:text-rose-300">{cameraError}</p> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        {cameraState === "active" || cameraState === "starting" ? <button type="button" className="button-secondary gap-2" onClick={stopCamera}><CloseIcon /> Kamera schließen</button> : <button type="button" className="button-primary gap-2" disabled={disabled || students.length === 0} onClick={() => void startCamera()}><CameraIcon /> Kamera starten</button>}
        {cameraState === "active" ? <button type="button" className="button-secondary" onClick={captureSnapshot}>Aufnahme prüfen</button> : null}
      </div>
      <p className="themed-muted mt-4 text-sm leading-6">Der Scanner akzeptiert ausschließlich Arbeitscodes der aktuell ausgewählten Klassenarbeit. Die QR-Erkennung ordnet den Bogen zu; die markierten Antworten werden anschließend im Raster übertragen und sofort bewertet. Freitexte bleiben auf der klassischen Klausur.</p>
    </Card>

    {workCode ? <Card title={student ? `Antwortbogen erkannt · ${student.label}` : "Unbekannter Antwortbogen"} subtitle={student ? `Arbeitscode ${workCode}` : "Dieser Code gehört nicht zur aktuell ausgewählten Klassenarbeit."}>
      {snapshot ? <img className="scan-snapshot" src={snapshot} alt="Temporäre Aufnahme des erkannten Antwortbogens" /> : null}
      {student ? <>
        <div className="mt-5 space-y-6">
          {answerBlocks.map((block) => <section key={block.id} className="scan-answer-block"><div><h3>{block.title}</h3><p>{block.correctAnswers.length} {block.type === "matching" ? "Zuordnungen" : block.type === "ordering" ? "Reihenfolgen" : block.type === "trueFalse" ? "Aussagen" : "Fragen"} · maximal {getSelectableAnswerMaximum(block)} Punkte{block.type === "multipleResponse" ? " · alle richtigen Optionen einer Zeile markieren" : ""}</p></div><div className="overflow-x-auto"><table className="scan-answer-table"><thead><tr><th>Nr.</th>{block.optionLabels.map((option) => <th key={option}>{option}</th>)}</tr></thead><tbody>{block.correctAnswers.map((_, index) => <tr key={index}><th>{index + 1} <span className="themed-muted">({block.answerPoints[index] ?? 0} P.)</span></th>{block.optionLabels.map((option) => { const selected = (marks[block.id] ?? [])[index] ?? []; const isMultipleResponse = block.type === "multipleResponse"; return <td key={option}><label><input type={isMultipleResponse ? "checkbox" : "radio"} name={`${block.id}-${index}`} checked={selected.includes(option)} onChange={() => setMarks((current) => { const next = [...(current[block.id] ?? [])]; const row = next[index] ?? []; next[index] = isMultipleResponse ? (row.includes(option) ? row.filter((choice) => choice !== option) : [...row, option]) : [option]; return { ...current, [block.id]: next }; })} /><span className="sr-only">{option}</span></label></td>; })}</tr>)}</tbody></table></div></section>)}
        </div>
        <div className="callout callout-info mt-5"><p><strong>Punktvorschlag:</strong> {Object.keys(scoresByTaskId).length ? Object.values(scoresByTaskId).join(" + ") : "Noch keine EWH-Aufgabe zugeordnet"} Punkte werden in die zugeordneten Aufgaben übertragen. Bitte markierte Kreise mit der Aufnahme vergleichen.</p></div>
        <div className="mt-5 flex flex-wrap gap-2"><button type="button" className="button-primary gap-2" disabled={disabled || Object.keys(scoresByTaskId).length === 0} onClick={saveScores}><CheckIcon /> Punkte übernehmen</button><button type="button" className="button-secondary" onClick={() => { setWorkCode(""); setSnapshot(null); setMarks(getEmptyMarks(exam)); }}>Verwerfen</button></div>
      </> : null}
    </Card> : null}
  </div>;
};
