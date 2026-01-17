# Cursor Print Layout FIX – Avery 5264 (3 Labels Only, Guaranteed Fit)

## What’s Going Wrong (Confirmed)
From the latest PDF output, all content is technically correct, **but layout math is wrong**:
- Labels stack naturally instead of snapping to Avery slots
- Browser pagination still controls flow
- You are *implicitly* laying out content instead of using Avery’s physical grid

This is why you keep seeing unpredictable overflow even when sizes look right.

The fix is **not tweaking sizes**.
The fix is **matching Avery 5264’s physical template exactly**.

---

## Avery 5264 – HARD FACTS (DO NOT DEVIATE)

Avery **5264** specs (US Letter):

- Page size: **8.5in × 11in**
- Label size: **3⅓ in × 4 in**
- Labels per sheet: **6 (2 columns × 3 rows)**
- Horizontal pitch: **4.0 in**
- Vertical pitch: **4.0 in**
- Left margin: **0.19 in**
- Top margin: **0.5 in**

We will intentionally use:
- **LEFT COLUMN ONLY**
- **TOP 3 LABELS ONLY**

No auto-flow. No flex.

---

## CORE RULE (THIS IS THE FIX)

> **Each label must be absolutely positioned in page coordinates.**

---

## REQUIRED PRINT STRUCTURE

```html
<div class="sheet">
  <div class="label slot-1">…</div>
  <div class="label slot-2">…</div>
  <div class="label slot-3">…</div>
</div>
```

Exactly **three** labels. No loops that auto-grow.

---

## PAGE LOCK (MANDATORY)

```css
@page {
  size: letter;
  margin: 0;
}

html, body {
  width: 8.5in;
  height: 11in;
  margin: 0;
  padding: 0;
  overflow: hidden;
}
```

---

## SHEET CONTAINER

```css
.sheet {
  position: relative;
  width: 8.5in;
  height: 11in;
}
```

---

## LABEL SLOT POSITIONS (AVERy 5264 EXACT)

```css
.label {
  position: absolute;
  width: 3.33in;
  height: 4in;
  box-sizing: border-box;
  border: 0.5pt solid #000;
  padding: 0.15in;
  overflow: hidden;
}

.slot-1 {
  top: 0.5in;
  left: 0.19in;
}

.slot-2 {
  top: 4.5in;
  left: 0.19in;
}

.slot-3 {
  top: 8.5in;
  left: 0.19in;
}
```

---

## WHY THIS WORKS
- Avery templates use absolute positioning
- Browsers cannot guess physical labels
- This bypasses pagination entirely

---

## FINAL DIRECTIVE TO CURSOR

Implement Avery 5264 using absolute positioning.
Do NOT use grid or flow for label placement.
Exactly 3 labels, left column only.
