# Cursor Prompt – Moving Box QR Label Web App

## Role
You are an expert full-stack web developer and UX engineer. Build a **simple, local-first web app** for cataloging moving boxes using a phone camera and printing QR code labels.

No authentication, no API, no cloud dependencies. This is an MVP designed for **speed, reliability, and low friction while packing a house**.

---

## Core Use Case (Packing Flow)
1. User fully packs a moving box
2. User opens the web app on their phone
3. User **takes a photo of the box contents** using the phone camera
4. User optionally adds a short description
5. User selects:
   - From Room (current house)
   - To Room (new house)
6. App auto-assigns metadata
7. User taps **Save & Generate Labels**
8. App generates **3 identical labels** for that box
9. Labels are printed on a **3" × 3¾" Avery label sheet**, left-hand side only

---

## Label Printing Strategy (Critical)

### Avery Label Spec
- **Label Size:** 3" × 3¾"
- **Orientation:** Portrait
- **Sheet Usage Rule:**
  - Only populate the **LEFT COLUMN** of the sheet
  - Print **exactly 3 labels per box** (top, side, end)
  - Default behavior assumes **two boxes at a time** → 6 labels total
  - If only one box is printed, the user may flip the sheet and reuse it later

### Layout Constraints
- Do NOT auto-fill unused labels
- Printing must be deterministic and predictable
- No shifting, no scaling based on content

---

## Label Visual Layout (Single Label)

### Top Section
- Date Packed (YYYY-MM-DD)
- From → To (e.g. Kitchen → Garage)

### Middle Section
- Short Description (1–2 lines max, truncate with ellipsis)

### Bottom Section
- QR Code (dominant, scannable from 2–3 feet)

### Footer (Optional)
- Packed By

---

## QR Code Behavior
QR resolves to:
```
/box/{box_id}
```

Scanning shows:
- Photo
- Full description
- From / To rooms
- Date packed
- Packed by

---

## Data Model (Example)
```json
{
  "box_id": "BOX-000123",
  "photo_path": "images/BOX-000123.jpg",
  "short_description": "Small appliances and baking tools",
  "from_room": "Kitchen",
  "to_room": "Kitchen",
  "date_created": "2026-01-15",
  "packed_by": "George",
  "qr_url": "/box/BOX-000123"
}
```

---

## Required Screens
1. Capture Screen (mobile-first)
2. Print Preview (exact Avery layout)
3. Box Detail View (QR destination)

---

## UX Rules
- One-hand usable
- Large tap targets
- No required modals
- Dark-mode friendly

---

## Technical Preferences
- Minimal framework or vanilla JS
- Client-side QR generation
- CSS print media rules
- Local storage (SQLite or JSON)
- No login
- No cloud

---

## Non-Goals
- Auth
- APIs
- Sync
- Multi-user logic

---

## Success Criteria
- Box → photo → labels in under 30 seconds
- Zero wasted labels by default
- Instant QR scan lookup
