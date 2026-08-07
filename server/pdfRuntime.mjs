import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const MAX_OCR_PAGES = 6;
const MAX_PDF_BYTES = 8 * 1024 * 1024;
const MAX_CONCURRENT_EXTRACTIONS = 2;
const COMMAND_TIMEOUT_MS = 45_000;
const COMMAND_MAX_BUFFER_BYTES = 2 * 1024 * 1024;
const PDF_CONSENT_VERSION = "2026-04-26";
const PDF_EXTRACT_PURPOSE = "EWH-Editor: PDF-Text- und OCR-Extraktion";
let activeExtractionCount = 0;

const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;

const decodeBase64 = (base64) => {
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64) || base64.length % 4 !== 0) {
    throw new Error("Ungültige Base64-Daten");
  }
  const bytes = Uint8Array.from(Buffer.from(base64, "base64"));
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_PDF_BYTES) {
    throw new Error("PDF-Datei überschreitet die zulässige Größe");
  }
  if (Buffer.from(bytes.subarray(0, 5)).toString("ascii") !== "%PDF-") {
    throw new Error("Datei ist keine PDF");
  }
  return bytes;
};

const runCommand = (command, args) =>
  execFileAsync(command, args, {
    timeout: COMMAND_TIMEOUT_MS,
    maxBuffer: COMMAND_MAX_BUFFER_BYTES,
  });

const normalizeWhitespace = (value) =>
  value
    .replace(/\u0000/g, "")
    .replace(/[^\S\r\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const createError = (status, code, message, details) => ({
  status,
  body: {
    error: {
      code,
      message,
      details,
    },
  },
});

const isPdfExtractRequest = (value) =>
  Boolean(value) &&
  typeof value === "object" &&
  isNonEmptyString(value.fileName) &&
  isNonEmptyString(value.fileContentBase64) &&
  isNonEmptyString(value.consentVersion) &&
  isNonEmptyString(value.purpose) &&
  isNonEmptyString(value.timestamp);

const runPdftotext = async (pdfPath, outputPath) => {
  await runCommand("pdftotext", ["-layout", pdfPath, outputPath]);
  const content = await readFile(outputPath, "utf8").catch(() => "");
  return normalizeWhitespace(content);
};

const runPdfInfoPageCount = async (pdfPath) => {
  try {
    const { stdout } = await runCommand("pdfinfo", [pdfPath]);
    const pagesMatch = stdout.match(/^Pages:\s+(\d+)\s*$/im);
    if (!pagesMatch) return null;
    const pageCount = Number(pagesMatch[1]);
    return Number.isFinite(pageCount) && pageCount > 0 ? pageCount : null;
  } catch {
    return null;
  }
};

const runOcr = async (pdfPath, workDir) => {
  const imagePrefix = path.join(workDir, "page");
  await runCommand("pdftoppm", ["-png", "-scale-to", "2200", "-f", "1", "-l", String(MAX_OCR_PAGES), pdfPath, imagePrefix]);

  const files = [];
  for (let page = 1; page <= MAX_OCR_PAGES; page += 1) {
    files.push(path.join(workDir, `page-${page}.png`));
  }

  const snippets = [];
  for (const file of files) {
    try {
      await readFile(file);
    } catch {
      continue;
    }
    try {
      const { stdout } = await runCommand("tesseract", [file, "stdout", "-l", "deu+eng", "--psm", "6"]);
      if (stdout.trim()) {
        snippets.push(stdout);
      }
    } catch {
      // Ignore per-page OCR failures and continue with the remaining pages.
    }
  }

  return normalizeWhitespace(snippets.join("\n\n"));
};

export const handlePdfExtractRequest = async (payload) => {
  if (!isPdfExtractRequest(payload)) {
    return createError(400, "invalid_request", "Die PDF-Extraktionsanfrage ist unvollständig oder ungültig.");
  }

  if (payload.consentVersion !== PDF_CONSENT_VERSION) {
    return createError(400, "consent_version_mismatch", "Die Einwilligungsversion ist veraltet.");
  }

  if (payload.purpose !== PDF_EXTRACT_PURPOSE) {
    return createError(400, "purpose_mismatch", "Die PDF wurde mit einem unzulässigen Zweck gesendet.");
  }

  if (activeExtractionCount >= MAX_CONCURRENT_EXTRACTIONS) {
    return createError(429, "pdf_extract_busy", "Die PDF-Verarbeitung ist ausgelastet. Bitte versuche es gleich erneut.");
  }

  activeExtractionCount += 1;
  let workDir = null;

  try {
    workDir = await mkdtemp(path.join(os.tmpdir(), "ewh-pdf-"));
    const pdfPath = path.join(workDir, "upload.pdf");
    const textPath = path.join(workDir, "upload.txt");
    await writeFile(pdfPath, decodeBase64(payload.fileContentBase64));
    const extractedText = await runPdftotext(pdfPath, textPath);
    const pageCountHint = await runPdfInfoPageCount(pdfPath);
    const warnings = [];

    if (extractedText.length >= 80) {
      return {
        status: 200,
        body: {
          extraction: {
            text: extractedText,
            pageCountHint,
            isLikelyScan: false,
            usedOcr: false,
            extractionMethod: "embedded_text",
            warnings,
          },
        },
      };
    }

    const ocrText = await runOcr(pdfPath, workDir);
    if (ocrText.length >= 40) {
      warnings.push("Die PDF enthielt kaum eingebetteten Text. Deshalb wurde OCR auf bis zu 6 Seiten ausgeführt.");
      return {
        status: 200,
        body: {
          extraction: {
            text: ocrText,
            pageCountHint,
            isLikelyScan: true,
            usedOcr: true,
            extractionMethod: "ocr",
            warnings,
          },
        },
      };
    }

    warnings.push("Es konnte weder per Text-Extraktion noch per OCR ausreichend Inhalt erkannt werden.");
    return {
      status: 200,
      body: {
        extraction: {
          text: "",
          pageCountHint,
          isLikelyScan: true,
          usedOcr: true,
          extractionMethod: "none",
          warnings,
        },
      },
    };
  } catch {
    return createError(500, "pdf_extract_failed", "Die PDF konnte nicht extrahiert werden.");
  } finally {
    activeExtractionCount -= 1;
    if (workDir) {
      await rm(workDir, { recursive: true, force: true });
    }
  }
};
