import { PointerEvent, useEffect, useRef, useState } from "react";

export const SignaturePad = ({
  value,
  onSave,
  onClear,
  importSvgPath,
}: {
  value?: string | null;
  onSave: (dataUrl: string | null) => void;
  onClear: () => void;
  importSvgPath?: string;
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = 2.4;
    context.strokeStyle = "#0f172a";

    if (!value) {
      setHasChanges(false);
      return;
    }

    const image = new Image();
    image.onload = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      setHasChanges(false);
    };
    image.src = value;
  }, [value]);

  const getPosition = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    const position = getPosition(event);
    if (!canvas || !context || !position) return;

    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);
    context.beginPath();
    context.moveTo(position.x, position.y);
    setIsDrawing(true);
    setHasChanges(true);
  };

  const handlePointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const context = canvasRef.current?.getContext("2d");
    const position = getPosition(event);
    if (!context || !position) return;

    event.preventDefault();
    context.lineTo(position.x, position.y);
    context.stroke();
  };

  const handlePointerUp = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
    setIsDrawing(false);
  };

  const saveCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onSave(canvas.toDataURL("image/png"));
    setHasChanges(false);
  };

  return (
    <div className="space-y-3">
      <div className="signature-shell overflow-hidden rounded-2xl border">
        <canvas
          ref={canvasRef}
          width={560}
          height={180}
          className="h-36 w-full touch-none bg-white"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="signature-hint text-xs leading-5">
          Eingabe per Maus, Touch oder Stift.
          {importSvgPath ? " Alternativ kann eine SVG-Signatur importiert werden." : ""}
          {" "}
          {hasChanges ? "Ungespeicherte Signatur." : "Gespeicherte Signatur sichtbar."}
        </p>
        <div className="flex flex-wrap gap-2">
          {importSvgPath ? (
            <button
              type="button"
              className="button-secondary"
              onClick={() => {
                onSave(importSvgPath);
                setHasChanges(false);
              }}
            >
              SVG importieren
            </button>
          ) : null}
          <button
            type="button"
            className="button-secondary"
            onClick={() => {
              const canvas = canvasRef.current;
              const context = canvas?.getContext("2d");
              if (!canvas || !context) return;
              context.clearRect(0, 0, canvas.width, canvas.height);
              context.fillStyle = "#ffffff";
              context.fillRect(0, 0, canvas.width, canvas.height);
              setHasChanges(true);
              onClear();
            }}
          >
            Leeren
          </button>
          <button type="button" className="button-primary" onClick={saveCanvas}>
            Signatur speichern
          </button>
        </div>
      </div>
    </div>
  );
};
