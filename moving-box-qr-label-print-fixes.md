# Cursor Prompt UPDATE – Fix QR Code, Label Overflow, and Print Boundaries

## Context
You previously generated a PDF for Avery 3" × 3¾" labels. The output has **three critical defects** that must be corrected:

1. **QR codes scan as “No usable data found”**
2. **“Packed by / Created by” text overflows the label**, forcing content onto a second page
3. There is **no visible boundary** showing the expected label area, making print alignment unreliable

This update refines the print and QR logic. Apply it strictly.

---

## DEFECT 1 — QR Code Produces “No Usable Data Found”

### Root Cause (Likely)
- QR code is encoding:
  - An empty string
  - An object instead of a string
  - A relative path without protocol that some scanners reject

### REQUIRED FIX
- QR code **MUST encode a full absolute URL string**
- Do NOT encode JSON, objects, or empty placeholders

### Correct Example
```js
const qrValue = `${window.location.origin}/box/${box_id}`;
```

### Hard Rules
- Value passed to QR generator must be:
  - A non-empty string
  - UTF-8 text
  - ≤ 512 characters
- Render QR **after** box_id is finalized

Add a console assertion:
```js
console.assert(typeof qrValue === 'string' && qrValue.length > 0);
```

---

## DEFECT 2 — “Packed by” Causes Overflow / Page Break

### Root Cause
- Footer text is not constrained to the label box
- No fixed layout or height constraints
- Print CSS allows content to expand vertically

### REQUIRED FIX
- The entire label must be a **fixed-size container**
- ALL text must fit inside it
- No element may grow the label height

### Label Container (MANDATORY)
```css
.label {
  width: 3in;
  height: 3.75in;
  box-sizing: border-box;
  overflow: hidden;
  position: relative;
}
```

### “Packed by” Placement (MANDATORY)
- Move to **absolute-positioned footer**
- Bottom-aligned
- Small font (8–9pt max)

```css
.label-footer {
  position: absolute;
  bottom: 0.15in;
  left: 0.15in;
  right: 0.15in;
  font-size: 8pt;
  line-height: 1;
  white-space: nowrap;
}
```

---

## DEFECT 3 — No Visual Boundary for Label Area

### REQUIRED FIX
Add a **hairline rectangle** to visually represent the label boundary.

### Boundary Rules
- Visible on-screen AND in print
- Thin stroke
- Must NOT change label size

```css
.label {
  border: 0.5pt solid #000;
}
```

---

## PRINT LAYOUT (DO NOT CHANGE)

### Sheet Rules
- Avery 3" × 3¾" labels
- Populate **LEFT COLUMN ONLY**
- Exactly **3 labels per box**
- Exactly **6 labels max per print** (two boxes)
- Never auto-fill unused labels

### Page Safety Rules
```css
@media print {
  body {
    margin: 0;
  }

  .label {
    page-break-inside: avoid;
  }
}
```

---

## QR Code SIZE & PLACEMENT

### Requirements
- Minimum QR size: **1.75in × 1.75in**
- Centered horizontally
- Lower half of label

```css
.qr {
  width: 1.75in;
  height: 1.75in;
  margin: 0 auto;
}
```

---

## VALIDATION CHECKLIST
- QR scans on iOS + Android
- Label fits exactly 3" × 3¾"
- No page overflow
- Hairline border visible
- Footer contained

---

## PDF Upload Guidance
Uploading the PDF to Cursor is **not required**.  
These instructions are sufficient unless printer-specific calibration is needed.

---

## Final Instruction
Fix only the issues listed.  
Do not redesign or refactor unrelated code.
