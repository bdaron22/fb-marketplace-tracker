# CLAUDE.md — FB Marketplace Tracker

This file provides context for AI assistants working in this repository.

## Project Overview

A client-side React single-page application (SPA) for tracking Facebook Marketplace vehicle purchase leads. Users can:
- Upload screenshots of Facebook Messenger conversations to extract lead data automatically via the Claude AI vision API
- Add leads manually through a form
- Track each lead through a status pipeline: `new → contacted → negotiating → purchased / passed`
- Search and filter leads
- Set follow-up dates with overdue reminders

All data is stored in the browser's `localStorage`—there is no backend or database.

---

## File Naming Convention

**Important**: All source files use a `.txt` suffix appended to their real extension (e.g., `App.jsx.txt`, `package.json.txt`). This is intentional in this repository. When reading or editing files, always include the `.txt` suffix.

```
index.html.txt
package.json.txt
vite.config.js.txt
tailwind.config.js.txt
postcss.config.js.txt
vercel.json.txt
src/
  main.jsx.txt
  App.jsx.txt
  index.css.txt
```

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| UI framework | React | 18.2.0 |
| Build tool | Vite | 4.3.9 |
| Styling | Tailwind CSS | 3.3.2 |
| CSS processing | PostCSS + Autoprefixer | 8.4.24 / 10.4.14 |
| Icons | Lucide React | 0.263.1 |
| AI integration | Anthropic Claude API (claude-sonnet-4-20250514) | — |
| Persistence | Browser `localStorage` | — |
| Deployment | Vercel | — |

---

## Development Workflow

### Install dependencies

```bash
npm install
```

### Start dev server

```bash
npm run dev
```

Starts a Vite dev server with hot module replacement at `http://localhost:5173`.

### Build for production

```bash
npm run build
```

Output goes to `dist/`. Vercel automatically runs this on push.

### Preview production build locally

```bash
npm run preview
```

---

## Environment Variables

The app requires one environment variable:

| Variable | Purpose |
|---|---|
| `VITE_ANTHROPIC_API_KEY` | Anthropic API key used to call the Claude vision API |

Create a `.env.local` file in the project root (already in `.gitignore.txt`):

```
VITE_ANTHROPIC_API_KEY=sk-ant-...
```

Vite exposes variables prefixed with `VITE_` to client-side code via `import.meta.env`.

### Known Bug: API Key Not Evaluated

In `src/App.jsx.txt` line 58, the API key is currently set as a **string literal** instead of the actual environment variable:

```js
// WRONG (current code — string, not evaluated):
'x-api-key': 'import.meta.env.VITE_ANTHROPIC_API_KEY',

// CORRECT (what it should be):
'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
```

Fix this before testing the screenshot upload feature.

---

## Architecture

### Single-component design

The entire application lives in one component: `src/App.jsx.txt`. There are no sub-components, routing, or global state management libraries (no Redux, Zustand, Context, etc.).

### State shape

All state is managed with `useState` hooks:

```js
leads          // array of lead objects stored in localStorage
filter         // 'all' | 'new' | 'contacted' | 'negotiating' | 'purchased' | 'passed'
searchTerm     // string for filtering leads by name/seller
showForm       // boolean toggling the manual-add form
uploading      // boolean showing AI processing spinner
formData       // object for the controlled manual-add form
```

### Lead object schema

```js
{
  id:             number,   // Date.now() + Math.random() (unique per lead)
  itemName:       string,   // Format: "YEAR MAKE MODEL" e.g. "2018 Toyota Camry"
  seller:         string,
  price:          number,   // 0 if unknown
  fbLink:         string,   // URL to FB Marketplace listing (optional)
  messengerNotes: string,   // Free-text conversation notes
  status:         'new' | 'contacted' | 'negotiating' | 'purchased' | 'passed',
  dateAdded:      string,   // ISO date "YYYY-MM-DD"
  followUpDate:   string,   // ISO date "YYYY-MM-DD" (optional)
}
```

### Data persistence

Leads are persisted to `localStorage` under the key `purchase-leads` as a JSON string. Every mutation (add, update status, update notes, delete) immediately calls `saveData()`.

### AI screenshot extraction flow

1. User selects an image file via the hidden `<input type="file">`.
2. `handleImageUpload` validates it is an image MIME type.
3. `extractLeadInfo` converts the file to a Base64 string using `FileReader`.
4. A POST request is sent to `https://api.anthropic.com/v1/messages` with the image and a structured prompt.
5. The response JSON is parsed; each extracted lead is mapped to the lead schema and appended to state + localStorage.

The prompt instructs Claude to return **only** a JSON object with a `leads` array—no markdown fences or explanation.

---

## UI Conventions

- **Tailwind CSS utility classes only**—no custom CSS beyond global base styles in `src/index.css.txt`.
- **Mobile-first responsive layout**: single column on small screens, two+ columns at `md` breakpoint (768 px).
- **Status badge colors** (Tailwind classes):
  - `new` → `bg-blue-100 text-blue-800`
  - `contacted` → `bg-yellow-100 text-yellow-800`
  - `negotiating` → `bg-orange-100 text-orange-800`
  - `purchased` → `bg-green-100 text-green-800`
  - `passed` → `bg-gray-100 text-gray-800`
- **Icons** come from `lucide-react`: `Plus`, `Trash2`, `ExternalLink`, `Search`, `Calendar`, `Camera`.
- **User feedback** via `window.alert` and `window.confirm` (no toast library).

---

## Deployment

Configured for Vercel via `vercel.json.txt`:

```json
{
  "buildCommand": "npm install && npm run build",
  "outputDirectory": "dist",
  "devCommand": "npm run dev",
  "installCommand": "npm install"
}
```

Set `VITE_ANTHROPIC_API_KEY` as an environment variable in the Vercel project dashboard before deploying.

---

## Testing

There are **no tests** in this project. No test framework is configured. If adding tests, Jest + React Testing Library or Vitest are the natural fit given the Vite setup.

---

## Key Conventions for AI Assistants

1. **Always append `.txt`** when referencing or editing source files.
2. **Do not split `App.jsx.txt` into sub-components** unless explicitly asked—the project is intentionally a single-component app.
3. **Fix the API key bug** (`line 58 of src/App.jsx.txt`) before making any changes that involve the screenshot upload feature.
4. **Persist all lead mutations** by calling `saveData(updatedLeads)` immediately after updating state.
5. **Follow Tailwind-only styling**—do not introduce CSS modules, styled-components, or inline styles.
6. **`itemName` format** must always be `"YEAR MAKE MODEL"` (e.g., `"2019 Honda Civic"`) to keep data consistent.
7. **No backend**—this app is intentionally fully client-side. Do not add a server, database, or API route unless the user explicitly requests it.
8. **Status values are a closed enum**: `new`, `contacted`, `negotiating`, `purchased`, `passed`. Do not add new statuses without updating all relevant UI (filter buttons, status selectors, `statusColors` map).
