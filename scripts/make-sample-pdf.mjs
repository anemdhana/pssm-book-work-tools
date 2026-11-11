import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(root, "fixtures", "sample-book.pdf");

const doc = await PDFDocument.create();
doc.setTitle("Sample Book");
const body = await doc.embedFont(StandardFonts.TimesRoman);
const heading = await doc.embedFont(StandardFonts.TimesRomanBold);
const ink = rgb(0.2, 0.16, 0.12);
const faded = rgb(0.45, 0.4, 0.34);

function addPage(pageNumber, lines) {
  const page = doc.addPage([612, 792]);
  page.drawText("Sample Book", { x: 72, y: 760, size: 9, font: body, color: faded });
  for (const line of lines) {
    page.drawText(line.text, {
      x: 72,
      y: line.y,
      size: line.size,
      font: line.heading ? heading : body,
      color: ink,
    });
  }
  page.drawText(String(pageNumber), { x: 300, y: 36, size: 10, font: body, color: faded });
}

addPage(1, [
  { text: "Chapter One", y: 700, size: 22, heading: true },
  { text: "The river was quiet in the morning.", y: 660, size: 12 },
  { text: "Mist sat on the water and the boat waited.", y: 642, size: 12 },
  { text: "A second paragraph follows after a pause.", y: 590, size: 12 },
  { text: "It stays with the same section until the next chapter.", y: 572, size: 12 },
]);

addPage(2, [
  { text: "Chapter Two", y: 700, size: 22, heading: true },
  { text: "The lamp was small and steady.", y: 660, size: 12 },
  { text: "Its light reached the page and no farther.", y: 642, size: 12 },
  { text: "She closed the book and listened.", y: 590, size: 12 },
]);

await mkdir(path.dirname(target), { recursive: true });
await writeFile(target, await doc.save());
console.log(target);
