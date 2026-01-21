# Server-Side PDF Generation for Pixel-Perfect Avery Label Printing (Corrected Dimensions)

## Goal
Generate **pixel-perfect PDFs** for Avery label sheets (e.g., 5264) so printing is consistent across:
- Phone vs desktop
- macOS vs Windows
- Different browsers

This avoids browser/AirPrint margin and scaling issues.

---

## Critical Dimension Correction (IMPORTANT)

Our previous layout used **incorrect label dimensions**.

### ✅ Correct Avery 5264 Label Dimensions
- **Label width:** `4.0 in` (NOT 3.5 in)
- **Label height:** `3.375 in` (3 3/8 in, NOT 3.0 in)
- **Columns:** 2
- **Rows:** 3
- **Middle gutter:** Correct as previously implemented
- **Sheet size:** 8.5 × 11 in (Letter)

❗ Using incorrect label width or height will cause **vertical drift**, **horizontal misalignment**, and unusable reused sheets.

All layouts **must** be updated to these exact values.

---

## Why PDF Generation Is Required
Browser printing is **not deterministic**:
- Mobile browsers ignore some print CSS
- AirPrint enforces margins and scaling
- DPI assumptions differ

A **server-generated PDF** locks:
- Page size (8.5 × 11 in)
- Margins (0 in)
- Scale (100%)
- Exact element placement

---

## Recommended Stack
- **Node.js 20 LTS**
- **Express**
- **Puppeteer (Headless Chromium)**

---

## Install Dependencies

```bash
npm install puppeteer express
```

---

## Project Structure

```
moving-labels-qr/
├─ server.js
├─ views/
│  └─ print-avery-5264.html
└─ public/
```

---

## Print-Only HTML Rules (MANDATORY)

The print template **must**:
- Use **absolute positioning only**
- Use **inch-based units (`in`)**
- Avoid flexbox and grid
- Avoid responsive CSS
- Match Avery 5264 dimensions exactly

### Correct Label CSS Base
```css
.label {
  position: absolute;
  width: 4in;
  height: 3.375in;
}
```

---

## Example PDF Endpoint (server.js)

```js
import express from 'express';
import puppeteer from 'puppeteer';

const app = express();

app.get('/labels.pdf', async (req, res) => {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  await page.goto('http://localhost:3000/print/avery-5264', {
    waitUntil: 'networkidle0'
  });

  const pdfBuffer = await page.pdf({
    format: 'letter',
    printBackground: true,
    scale: 1,
    margin: {
      top: '0in',
      right: '0in',
      bottom: '0in',
      left: '0in'
    }
  });

  await browser.close();

  res.setHeader('Content-Type', 'application/pdf');
  res.send(pdfBuffer);
});

app.listen(3000);
```

---

## Printing Instructions (USER-FACING)

Always instruct users:
- Download the PDF
- Print at **100% scale**
- Disable:
  - “Fit to page”
  - Headers & footers
- Use desktop printing for best results

---

## Best Practices

### Debug Mode
Temporarily add:
```css
.label {
  outline: 0.25pt solid red;
}
```

### Reusable Sheets
- Left and right columns **must be symmetrical**
- Right-side labels are first-class citizens
- Orientation flipping should produce identical placement

---

## What NOT to Use ❌
- jsPDF
- html2pdf
- pdf-lib
- Browser `window.print()`

These **cannot** guarantee physical accuracy.

---

## Result
You now have:
- Correct Avery 5264 dimensions
- Deterministic PDF output
- Identical printing from any device
- Reliable reuse of partially used label sheets

This is the **only correct approach** for precision label printing.
