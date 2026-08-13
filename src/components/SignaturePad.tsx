import { type ChangeEvent, type PointerEvent, useEffect, useRef, useState } from "react";

const MAX_SVG_SIGNATURE_SIZE = 1_000_000;

const paintCanvasBackground = (context: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
};

const drawImageContain = (
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  image: CanvasImageSource & { width: number; height: number },
) => {
  const scale = Math.min(canvas.width / image.width, canvas.height / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  context.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
};

const isSafeSvgSignature = (source: string) => {
  const withoutPreamble = source
    .replace(/^\uFEFF?\s*(?:<\?xml[\s\S]*?\?>\s*)?/i, "")
    .replace(/^(?:<!--[\s\S]*?-->\s*)*/, "")
    .replace(/^<!doctype\s+svg[\s\S]*?>\s*/i, "");
  if (!/^<svg(?:\s|>)/i.test(withoutPreamble)) return false;

  // SVG can contain active HTML or load external resources. A signature only needs
  // vector shapes, so we reject those constructs before rasterising it locally.
  return !/(<\s*(?:script|foreignobject|iframe|object|embed)\b|\son[a-z]+\s*=|(?:href|xlink:href)\s*=\s*["']\s*(?!#|data:image\/))/i.test(withoutPreamble);
};

export const SignaturePad = ({
  value,
  onSave,
  onClear,
}: {
  value?: string | null;
  onSave: (dataUrl: string | null) => void;
  onClear: () => void;
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    paintCanvasBackground(context, canvas);
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
      paintCanvasBackground(context, canvas);
      drawImageContain(context, canvas, image);
      setHasChanges(false);
    };
    image.src = value;
  }, [value]);

  const importSvgFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Allow importing the same file again after it was edited.
    event.target.value = "";
    if (!file) return;

    if (file.size > MAX_SVG_SIGNATURE_SIZE) {
      setImportError("Die SVG-Signatur ist zu groß (maximal 1 MB).");
      return;
    }

    try {
      const source = await file.text();
      if (!isSafeSvgSignature(source)) {
        setImportError("Diese SVG kann nicht als Signatur importiert werden.");
        return;
      }

      const objectUrl = URL.createObjectURL(new Blob([source], { type: "image/svg+xml" }));
      const image = new Image();
      image.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d");
        if (!canvas || !context) return;

        paintCanvasBackground(context, canvas);
        drawImageContain(context, canvas, image);
        // Save a PNG rather than active SVG markup. This keeps the imported
        // signature safe and makes it work in every export format.
        onSave(canvas.toDataURL("image/png"));
        setHasChanges(false);
        setImportError(null);
      };
      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        setImportError("Die SVG-Signatur konnte nicht gelesen werden.");
      };
      image.src = objectUrl;
    } catch {
      setImportError("Die SVG-Signatur konnte nicht gelesen werden.");
    }
  };

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
          Eingabe per Maus, Touch oder Stift – oder eine SVG-Signatur importieren.
          {" "}
          {hasChanges ? "Ungespeicherte Signatur." : "Gespeicherte Signatur sichtbar."}
        </p>
        <div className="flex flex-wrap gap-2">
          <label className="button-secondary cursor-pointer">
            SVG importieren
            <input
              className="sr-only"
              type="file"
              accept="image/svg+xml,.svg"
              onChange={importSvgFile}
            />
          </label>
          <button
            type="button"
            className="button-secondary"
            onClick={() => {
              const canvas = canvasRef.current;
              const context = canvas?.getContext("2d");
              if (!canvas || !context) return;
              paintCanvasBackground(context, canvas);
              setHasChanges(true);
              setImportError(null);
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
      {importError ? <p className="text-xs text-rose-700" role="alert">{importError}</p> : null}
    </div>
  );
};
