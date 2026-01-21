# Cursor VERIFIED Layout – Avery 5264 (FULL SHEET, BOTH COLUMNS, REUSABLE)

## IMPORTANT CONTEXT (CONFIRMED)
This layout is designed so that:
- You can print **3 labels on the LEFT column**
- Later rotate / reinsert the same sheet
- And print **the other 3 labels on the RIGHT column**
- Using the **exact same geometry**, just mirrored

Therefore:
- Left AND right margins are fully specified
- Inter-column spacing is explicitly verified
- Vertical spacing is symmetric
- Layout matches Avery 5264 die-cut geometry

---

## VERIFIED AVERY 5264 PHYSICAL SPEC

Sheet size:
- Width: **8.5 in**
- Height: **11 in**

Label grid:
- **2 columns × 3 rows**
- **6 labels total**

Each label:
- **Width: 4.0 in**
- **Height: 3.333333 in**

Total vertical label height:
```
3 × 3.333333 = 9.999999 in ≈ 10 in
```

Remaining vertical space:
```
11 − 10 = 1.0 in
```

Top margin = 0.5 in  
Bottom margin = 0.5 in  

---

## VERIFIED HORIZONTAL GEOMETRY

- Left margin: **0.156 in**
- Right margin: **0.156 in**
- Inter-column gap: **0.188 in**

Check:
```
0.156 + 4.0 + 0.188 + 4.0 + 0.156 = 8.5 in
```

Exact fit.

---

## PAGE LOCK

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

## LABEL CONTAINER

```css
.label {
  position: absolute;
  width: 4in;
  height: 3.333333in;
  box-sizing: border-box;
  overflow: hidden;
  border: 0.5pt solid black; /* DEBUG ONLY */
}
```

No padding in label box.

---

## SLOT POSITIONS – BOTH COLUMNS

### LEFT COLUMN
```css
.left.slot-1 { top: 0.5in; left: 0.156in; }
.left.slot-2 { top: 3.833333in; left: 0.156in; }
.left.slot-3 { top: 7.166666in; left: 0.156in; }
```

### RIGHT COLUMN
```css
.right.slot-1 { top: 0.5in; left: 4.344in; }
.right.slot-2 { top: 3.833333in; left: 4.344in; }
.right.slot-3 { top: 7.166666in; left: 4.344in; }
```

---

## REQUIRED HTML STRUCTURE

```html
<div class="sheet">
  <div class="label left slot-1"></div>
  <div class="label left slot-2"></div>
  <div class="label left slot-3"></div>

  <div class="label right slot-1"></div>
  <div class="label right slot-2"></div>
  <div class="label right slot-3"></div>
</div>
```

Render only one column at a time if desired.

---

## VALIDATION CHECKLIST
- One page only
- Top and bottom margins identical
- Left and right margins identical
- Labels align after sheet rotation

---

## FINAL DIRECTIVE TO CURSOR

Use Avery 5264 exact geometry.
Both columns must be defined.
Layout must support reusing the same sheet flipped.
Absolute positioning only.
