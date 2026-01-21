# Cursor Update – Avery 5264 DIMENSION CORRECTION (Exact Spec)

## WHY THIS UPDATE EXISTS
The previous print layout used **swapped label dimensions**.
That will NEVER line up with real Avery 5264 sheets.

This update corrects the geometry to match **Avery 5264’s actual physical specification**.

Apply this update verbatim.

---

## OFFICIAL AVERY 5264 SPEC (LOCK THESE)

Avery 5264 (US Letter):

- Sheet size: **8.5in × 11in**
- Labels per sheet: **6 (2 columns × 3 rows)**
- **Label size: 4.0in (W) × 3.3333in (H)**

This is the standard orientation used by Avery’s own templates.

---

## CORE RULE (DO NOT BREAK)

> **Label width is 4 inches.  
> Label height is 3.3333 inches.**

Anything else is wrong.

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

## SHEET CONTAINER (REFERENCE FRAME)

```css
.sheet {
  position: relative;
  width: 8.5in;
  height: 11in;
}
```

---

## LABEL CONTAINER (CORRECTED)

```css
.label {
  position: absolute;
  width: 4in;
  height: 3.3333in;
  box-sizing: border-box;
  overflow: hidden;
  border: 0.5pt solid #000; /* debug outline */
  padding: 0.15in;
}
```

---

## LABEL POSITIONS — LEFT COLUMN ONLY (3 OUTPUTS)

These coordinates align with the **left column** of Avery 5264.

```css
/* LEFT COLUMN ONLY */

.slot-1 {
  top: 0.5in;
  left: 0.19in;
}

.slot-2 {
  top: 3.8333in;
  left: 0.19in;
}

.slot-3 {
  top: 7.1666in;
  left: 0.19in;
}
```

Math:
- Vertical pitch = 3.3333in
- Slot 2 = 0.5 + 3.3333
- Slot 3 = 0.5 + (3.3333 × 2)

---

## REQUIRED HTML STRUCTURE

```html
<div class="sheet">
  <div class="label slot-1">…</div>
  <div class="label slot-2">…</div>
  <div class="label slot-3">…</div>
</div>
```

Exactly **three labels**.
No loops.
No flow.
No grid.
No flex.

---

## VALIDATION CHECKLIST
- Print preview shows **1 page only**
- Exactly **3 labels**
- Borders align with Avery 5264 cuts
- No content spills outside label borders

---

## FINAL DIRECTIVE TO CURSOR

> “Use Avery 5264 with **4in × 3.3333in labels**.  
> Absolutely positioned.  
> Left column only.  
> Exactly 3 outputs.”

If any dimension is swapped, the result is invalid.
