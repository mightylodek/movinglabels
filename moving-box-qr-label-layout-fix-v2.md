# Cursor Prompt UPDATE v2 – Fix QR Readability, Page Overflow, and Add Prominent Box Number

## Evidence From Current Output
Based on the latest generated PDF:
- QR codes **render visually** but still fail to scan (“no usable data found”)
- Three labels **overflow onto a second page**
- Footer text appears alone on page 2
- Box number is **missing** and should be visually prominent

These issues are confirmed by the rendered output (page 1–2) of the PDF.

---

## PRIMARY GOALS (DO NOT IGNORE)
1. QR codes must scan reliably on iOS + Android
2. Exactly **3 labels must fit on ONE page**
3. No content may spill to page 2
4. Box number must be **visually dominant**
5. Layout must match a strict grid

---

## ROOT CAUSE ANALYSIS (IMPORTANT)

### Why QR codes are not readable
Even though a QR *image* exists, scanners fail when:
- Quiet zone (margin) is missing or clipped
- QR is raster-scaled via CSS instead of rendered at final size
- QR is rendered before layout finalizes and then resized
- Error correction level is too low

### Why labels overflow to page 2
- Label container height + margins exceed printable page height
- Browser adds implicit margins
- Grid rows are not explicitly sized
- Footer is positioned outside the fixed label height

---

## REQUIRED FIXES (MANDATORY)

## 1. QR CODE — MAKE IT SCANNABLE

### HARD REQUIREMENTS
- QR must encode a **full absolute URL**
- QR must be rendered at **final pixel size**, not scaled
- QR must include a **quiet zone**
- QR error correction level must be **Q or H**

### REQUIRED IMPLEMENTATION
```js
const qrValue = `${window.location.origin}/box/${boxId}`;
```

Use a QR library that supports:
- errorCorrectionLevel: 'Q' or 'H'
- explicit size in pixels (NOT CSS scaling)

Example:
```js
new QRCode(element, {
  text: qrValue,
  width: 220,
  height: 220,
  correctLevel: QRCode.CorrectLevel.H
});
```

### CSS (DO NOT SCALE QR)
```css
.qr {
  width: 220px;
  height: 220px;
}
```

NO transforms. NO percentages.

---

## 2. PAGE OVERFLOW — LOCK THE GRID

### Page Setup (MANDATORY)
```css
@page {
  size: letter;
  margin: 0;
}

body {
  margin: 0;
}
```

### Label Sheet Grid (MANDATORY)
You must explicitly define **3 rows only**.

```css
.sheet {
  display: grid;
  grid-template-rows: repeat(3, 3.75in);
  grid-template-columns: 3in;
  gap: 0;
  width: 3in;
}
```

If **any content does not fit**, it must be clipped — not expanded.

---

## 3. LABEL CONTAINER — ABSOLUTE CONTROL

```css
.label {
  width: 3in;
  height: 3.75in;
  box-sizing: border-box;
  overflow: hidden;
  position: relative;
  border: 0.5pt solid #000; /* hairline boundary */
}
```

No margins. No padding beyond what is explicitly defined.

---

## 4. ADD PROMINENT BOX NUMBER (NEW)

### Visual Priority Rules
- Box number must be **largest text on the label**
- Top-left aligned
- High contrast
- Always visible even at a distance

### Header Layout
```
| Box #001    Mud Room → Office |
```

### CSS
```css
.label-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: bold;
}

.box-number {
  font-size: 22pt;
}

.room-flow {
  font-size: 10pt;
}
```

---

## 5. DESCRIPTION — CONSTRAINED TEXT

```css
.description {
  font-size: 10pt;
  line-height: 1.2;
  max-height: 2.4em;
  overflow: hidden;
  text-overflow: ellipsis;
}
```

---

## 6. IMAGE + QR — FIXED TWO-COLUMN ROW

```css
.media-row {
  display: grid;
  grid-template-columns: 1fr 220px;
  align-items: center;
}
```

Image must be:
- max-width: 100%
- max-height: 180px
- object-fit: contain

---

## 7. FOOTER — NEVER ESCAPE

```css
.label-footer {
  position: absolute;
  bottom: 0.15in;
  left: 0.15in;
  right: 0.15in;
  font-size: 8pt;
  display: flex;
  justify-content: space-between;
}
```

Includes:
- Pack Date
- Packed By

---

## VALIDATION CHECKLIST (REQUIRED)
- [ ] QR scans successfully from printed page
- [ ] All 3 labels fit on one page
- [ ] No second page generated
- [ ] Box number readable at arm’s length
- [ ] Hairline border matches label edge
- [ ] No scaling performed by browser or printer

---

## PDF UPLOAD GUIDANCE
Uploading the PDF to Cursor is **NOT required**.
This is now a **layout math + QR encoding problem**, fully solvable from instructions.

Only upload PDF if:
- Printer introduces unexplained scaling
- Avery stock has non-standard margins

---

## FINAL DIRECTIVE TO CURSOR
Treat this as a print-engine bugfix.
Do not redesign.
Do not refactor unrelated code.
Lock layout. Lock sizes. Lock QR.

Failure conditions:
- Any QR that does not scan
- Any content on page 2
