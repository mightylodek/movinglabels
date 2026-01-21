# Cursor Prompt UPDATE v4 – QR Debug Mode + Plain-Text QR Payload

## WHY THIS UPDATE EXISTS
The QR code is still visually rendered but **not readable by scanners**.
At this point, we must remove ambiguity by **displaying the exact QR payload in plain text on the label**.

This is a diagnostic step. Do NOT skip it.

---

## PRIMARY OBJECTIVE
1. Make the QR payload **visible as text**
2. Guarantee the QR library is encoding **exactly that string**
3. Allow human verification of:
   - URL correctness
   - Unexpected whitespace
   - Encoding errors
   - Missing protocol
   - Bad characters

This update does NOT replace the QR — it augments it.

---

## QR DEBUG MODE (MANDATORY FOR NOW)

### REQUIRED BEHAVIOR
- The **exact string** passed to the QR generator must ALSO be rendered as text
- Text must be:
  - Monospaced
  - Small
  - Fully visible
  - Truncated visually but copyable in dev tools

---

## QR PAYLOAD — SINGLE SOURCE OF TRUTH

### Define ONCE
```js
const qrPayload = `${window.location.origin}/box/${boxId}`;
```

### HARD RULES
- This variable:
  - MUST be a string
  - MUST NOT be modified
  - MUST be used for BOTH:
    - QR generation
    - Plain-text display

Add assertion:
```js
console.assert(
  typeof qrPayload === 'string' &&
  qrPayload.startsWith('http'),
  'QR payload must be absolute URL'
);
```

---

## QR GENERATION (UNCHANGED BUT VERIFIED)

```js
new QRCode(qrEl, {
  text: qrPayload,
  width: 160,
  height: 160,
  correctLevel: QRCode.CorrectLevel.H
});
```

NO CSS scaling. NO transforms.

---

## DISPLAY QR PAYLOAD AS TEXT (NEW)

### HTML (Inside Label)
```html
<div class="qr-debug">
  <span class="qr-debug-label">QR:</span>
  <span class="qr-debug-value">${qrPayload}</span>
</div>
```

### CSS
```css
.qr-debug {
  font-family: monospace;
  font-size: 6pt;
  line-height: 1.1;
  word-break: break-all;
  margin-top: 0.05in;
  max-height: 0.35in;
  overflow: hidden;
}
```

This MUST appear directly below the QR/image row.

---

## WHY THIS MATTERS (DO NOT IGNORE)
If the QR still does not scan after this:
- We will KNOW:
  - Whether the payload is empty
  - Whether it contains line breaks
  - Whether it is relative
  - Whether it is malformed
- We can then:
  - Test the URL manually
  - Paste it into a QR generator online
  - Compare results

This removes guesswork.

---

## TEMPORARY NATURE
This debug text:
- Is ONLY for testing
- Will be removed after QR reliability is confirmed
- Must remain visible until then

---

## VALIDATION CHECKLIST
- [ ] QR payload text is visible on label
- [ ] Payload starts with `http://` or `https://`
- [ ] Payload matches scanned destination
- [ ] QR library receives EXACT same string
- [ ] No page 2 is generated
- [ ] QR still rendered at 160×160 px

---

## FINAL DIRECTIVE TO CURSOR
Do not optimize this away.
Do not hide the payload.
Do not reformat the string.

Expose the QR payload plainly so we can diagnose the failure.
