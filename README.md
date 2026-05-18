# Miso & Dough — Sourdough Order Form

React + Firebase + Google Sheets order form for Miso & Dough bakery.

## Stack
- **React** (Vite) — frontend
- **Firebase Firestore** (free Spark plan) — stores menu items, bakery info, and orders
- **Firebase Auth** (free) — admin login
- **Google Apps Script** (free) — webhook that writes orders to your Google Sheet

---

## 1. Firebase Setup

1. Go to [console.firebase.google.com](https://console.firebase.google.com) → **Add project**
2. Create a **Firestore Database** (Start in production mode, then set rules — see below)
3. Enable **Authentication → Email/Password** sign-in method
4. Go to **Project Settings → Your apps → Add app (Web)** and copy the config values

### Firestore Security Rules
Paste these in Firestore → Rules:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Public: read menu and bakery info, write orders
    match /menu/{item} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /bakeryInfo/{doc} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /orders/{order} {
      allow create: if true;
      allow read, update, delete: if request.auth != null;
    }
  }
}
```

### Create Admin User
In Firebase Console → Authentication → Users → **Add User**
Use this email/password to log into `/admin`.

---

## 2. Seed Initial Menu Data

In Firebase Console → Firestore → Start a collection named `menu`.
Add these documents (Document ID = field shown):

| Doc ID | name | price | description | enabled | order |
|--------|------|-------|-------------|---------|-------|
| `classic_sourdough` | Classic Sourdough Batard | 14 | | true | 1 |
| `cheddar_jalapeno` | Cheddar Jalapeño Batard | 17 | | true | 2 |
| `cinnamon_roll_focaccia` | Cinnamon Roll Focaccia Square w/ Cream Cheese Glaze | 7 | $7/square or $25/sheet (4 squares) | true | 3 |

Also create collection `bakeryInfo`, document `about`:
- `description`: your bakery description
- `orderDeadline`: e.g. "Orders open until Thursday!"
- `pickupInfo`: e.g. "Pick up Sunday 11-3"
- `pickupDates`: array of strings, e.g. ["5/24 Sun 11-3"]

You can manage all of this from the admin panel once you're set up.

---

## 3. Google Apps Script Setup

1. Open your Google Sheet → **Extensions → Apps Script**
2. Delete the default `myFunction` and paste the code from `google-apps-script/Code.gs`
3. In the script editor, run **`setupHeaders()`** once to create the header row in your sheet
4. Click **Deploy → New Deployment**:
   - Type: **Web App**
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Click **Deploy** → copy the Web App URL

> Note: Because the form uses `mode: 'no-cors'` (required for Apps Script), you won't get
> a response body back — but the row will be written. Orders are also saved in Firestore
> as a backup.

---

## 4. Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```
cp .env.example .env
```

```
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456:web:abc123

VITE_GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/.../exec
```

---

## 5. Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## 6. Deploy (free options)

| Service | Steps |
|---------|-------|
| **Firebase Hosting** | `npm install -g firebase-tools` → `firebase init hosting` → `npm run build` → `firebase deploy` |
| **Vercel** | Connect GitHub repo → add env vars in Vercel dashboard → auto-deploys on push |
| **Netlify** | Same as Vercel — drag `dist/` folder or connect repo |

---

## Google Sheet Column Order

The sheet will have these headers (created by `setupHeaders()`):

`OrderDate` | `Name` | `Phone` | `Email` | `Classic Sourdough Batard (qty)` | `Cheddar Jalapeño Batard (qty)` | `Cinnamon Roll Focaccia Square w/ Cream Cheese Glaze (qty)` | `PickUpDate` | `Status` | `TotalCost` | `ActualPayment`

**ActualPayment** is filled in manually (either in the sheet or in the admin orders tab).

---

## Admin Panel

Navigate to `/admin` to:
- Add, edit, or hide menu items and update prices
- Update bakery description, order deadline, and pick up dates
- View all orders and update status (In Progress → Baked → Picked Up)
- Record actual payment received
