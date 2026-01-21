# Cursor Instructions – MVP Moving Box QR Server (No Native Modules)

## GOAL
Get a **working MVP tonight** that:
- Runs as a real server
- Is reachable from a phone on the same Wi‑Fi
- Uses **NO native Node modules**
- Is Docker‑ready later
- Avoids SQLite entirely (JSON storage only)

Follow these steps **exactly**.

---

## STEP 0 — Node Version (MANDATORY)

Use Node **20 LTS**. Do NOT use Node 24.

```bash
nvm install 20
nvm use 20
node -v
```

Expected:
```
v20.x.x
```

---

## STEP 1 — Clean Project

From the project root:

```bash
rm -rf node_modules package-lock.json
```

---

## STEP 2 — package.json (REPLACE ENTIRE FILE)

```json
{
  "name": "moving-labels-qr",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.19.2",
    "qrcode": "^1.5.4"
  }
}
```

---

## STEP 3 — Install Dependencies

```bash
npm install
```

This MUST succeed with no compilation.

---

## STEP 4 — Create Server (server.js)

```js
import express from 'express';
import fs from 'fs';

const app = express();
const PORT = 3000;
const DATA_FILE = './data/boxes.json';

app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

if (!fs.existsSync('data')) fs.mkdirSync('data');
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]');

app.post('/api/boxes', (req, res) => {
  const boxes = JSON.parse(fs.readFileSync(DATA_FILE));
  const box = {
    ...req.body,
    id: String(boxes.length + 1).padStart(6, '0'),
    createdAt: new Date().toISOString()
  };
  boxes.push(box);
  fs.writeFileSync(DATA_FILE, JSON.stringify(boxes, null, 2));
  res.json(box);
});

app.get('/box/:id', (req, res) => {
  const boxes = JSON.parse(fs.readFileSync(DATA_FILE));
  const box = boxes.find(b => b.id === req.params.id);
  if (!box) return res.status(404).send('Not found');
  res.json(box);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

IMPORTANT: `0.0.0.0` is required for phone access.

---

## STEP 5 — Frontend Files

Create folder structure:

```
public/
  index.html
  app.js
```

### public/index.html
```html
<!doctype html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Moving Box Label</title>
</head>
<body>
  <h1>New Box</h1>

  <input type="file" accept="image/*" capture="environment" id="photo" />
  <input placeholder="Description" id="desc" />
  <input placeholder="From room" id="from" />
  <input placeholder="To room" id="to" />

  <button onclick="save()">Save</button>

  <pre id="out"></pre>

  <script src="app.js"></script>
</body>
</html>
```

### public/app.js
```js
async function save() {
  const payload = {
    description: desc.value,
    from: from.value,
    to: to.value
  };

  const res = await fetch('/api/boxes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  out.textContent = JSON.stringify(data, null, 2);
}
```

---

## STEP 6 — Run the Server

```bash
npm start
```

---

## STEP 7 — Open on Phone

Find your Mac’s IP:

```bash
ifconfig | grep inet
```

On your phone (same Wi‑Fi):

```
http://<MAC-IP>:3000
```

---

## SUCCESS CHECKLIST
- Server starts without errors
- Page loads on phone
- Camera input appears
- Saving a box returns JSON
- data/boxes.json updates

---

## DO NOT ADD YET
- SQLite
- Native modules
- ORMs
- Dockerfiles

---

## NEXT STEPS (AFTER MVP WORKS)
- QR generation
- Print layout
- Avery CSS locking
- Docker container

Do NOT proceed until MVP works end‑to‑end.
