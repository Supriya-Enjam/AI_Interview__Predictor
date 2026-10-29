
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

const MAX_RESUME_SIZE = 5 * 1024 * 1024;
const MIN_TEXT_LENGTH = 50;
const MAX_TEXT_LENGTH = 30_000;

export interface ExtractedResume {
  text: string;
  characterCount: number;
  fileType: "pdf" | "docx";
}

export async function extractResumeText(
  buffer: Buffer,
  originalName: string
): Promise<ExtractedResume> {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error("The uploaded resume is empty.");
  }

  if (buffer.length > MAX_RESUME_SIZE) {
    throw new Error("Resume file must be 5 MB or smaller.");
  }

  const extension = originalName
    .toLowerCase()
    .split(".")
    .pop();

  let extractedText = "";
  let fileType: "pdf" | "docx";

  if (extension === "pdf") {
    fileType = "pdf";

    let parser: PDFParse | undefined;

    try {
      parser = new PDFParse({
        data: new Uint8Array(buffer),
      });

      const result = await parser.getText();
      extractedText = result.text;
    } catch {
      throw new Error(
        "Could not read this PDF. Please upload a valid, text-based PDF resume."
      );
    } finally {
      if (parser) {
        await parser.destroy();
      }
    }
  } else if (extension === "docx") {
    fileType = "docx";

    try {
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value;
    } catch {
      throw new Error(
        "Could not read this DOCX file. Please upload a valid Word resume."
      );
    }
  } else {
    throw new Error(
      "Unsupported resume format. Upload a PDF or DOCX file."
    );
  }

  const text = extractedText
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (text.length < MIN_TEXT_LENGTH) {
    throw new Error(
      "Not enough readable text was found. Please upload a text-based resume rather than a scanned image."
    );
  }

  const limitedText = text.slice(0, MAX_TEXT_LENGTH);

  return {
    text: limitedText,
    characterCount: limitedText.length,
    fileType,
  };
}
