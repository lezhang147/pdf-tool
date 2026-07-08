const fs = require('fs');
const { PDFDocument, StandardFonts } = require('pdf-lib');

async function createDummyPdf() {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage();
  const { height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  page.drawText('Dummy Invoice / Receipt', { x: 50, y: height - 50, size: 24, font });
  page.drawText('Amount: $100', { x: 50, y: height - 100, size: 16, font });
  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync('dummy.pdf', pdfBytes);
  console.log('Dummy PDF created.');
}

createDummyPdf();
