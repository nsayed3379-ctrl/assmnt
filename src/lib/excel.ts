import ExcelJS from "exceljs";

export type ParsedCandidateRow = {
  rowNumber: number;
  email: string;
  fullName: string | null;
  position: string | null;
};

export type ExcelParseResult = {
  valid: ParsedCandidateRow[];
  invalidEmail: { rowNumber: number; raw: unknown }[];
  duplicatesInFile: { rowNumber: number; email: string }[];
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeHeader(h: string) {
  return h.trim().toLowerCase();
}

function cellText(cell: ExcelJS.Cell | undefined): string {
  if (!cell) return "";
  const value = cell.value;
  if (value == null) return "";
  if (typeof value === "object" && "text" in (value as any)) return String((value as any).text ?? "");
  if (typeof value === "object" && "richText" in (value as any)) {
    return (value as any).richText.map((t: any) => t.text).join("");
  }
  return String(value).trim();
}

/**
 * Parses an uploaded .xlsx buffer into candidate rows. Only an "email"
 * column is required - "name"/"full name" and "position" are optional and
 * matched case-insensitively so recruiters don't have to reformat their
 * existing sheet.
 */
export async function parseCandidateExcel(buffer: Buffer): Promise<ExcelParseResult> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as any);
  const sheet = workbook.worksheets[0];

  const result: ExcelParseResult = { valid: [], invalidEmail: [], duplicatesInFile: [] };
  if (!sheet) return result;

  const headerRow = sheet.getRow(1);
  const columnIndex: Record<string, number> = {};
  headerRow.eachCell((cell, colNumber) => {
    columnIndex[normalizeHeader(cellText(cell))] = colNumber;
  });

  const emailCol = columnIndex["email"];
  if (!emailCol) return result; // no email column at all - nothing to import

  const nameCol = columnIndex["name"] ?? columnIndex["full name"] ?? columnIndex["full_name"];
  const positionCol = columnIndex["position"];

  const seenEmails = new Set<string>();

  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
    const row = sheet.getRow(rowNumber);
    const rawEmail = cellText(row.getCell(emailCol));
    if (!rawEmail && row.cellCount === 0) continue; // fully blank row

    const email = rawEmail.toLowerCase();

    if (!email || !EMAIL_RE.test(email)) {
      result.invalidEmail.push({ rowNumber, raw: rawEmail });
      continue;
    }

    if (seenEmails.has(email)) {
      result.duplicatesInFile.push({ rowNumber, email });
      continue;
    }
    seenEmails.add(email);

    const fullName = nameCol ? cellText(row.getCell(nameCol)) || null : null;
    const position = positionCol ? cellText(row.getCell(positionCol)) || null : null;

    result.valid.push({ rowNumber, email, fullName, position });
  }

  return result;
}
