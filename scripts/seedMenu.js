/**
 * Seed the Firestore `menu` collection with initial bread items.
 *
 * Run once from the project root:
 *   node --env-file=.env scripts/seedMenu.js
 *
 * Requires Node 20+ for --env-file support.
 * This will ADD documents — if you need to re-seed, delete the menu
 * collection in the Firebase console first.
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, deleteDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            "AIzaSyC1QGQHRGmolFfkHWmoOkj15qcItn-lzwA",
  authDomain:        "miso-and-dough.firebaseapp.com",
  projectId:         "miso-and-dough",
  storageBucket:     "miso-and-dough.firebasestorage.app",
  messagingSenderId: "313421845882",
  appId:             "1:313421845882:web:be21f3ba3378f7787b72c3",
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// ---------------------------------------------------------------------------
// Items with multiple sizes use a `variants` array instead of a single price.
// Items without variants use a plain `price` field.
// Edit descriptions here — they're optional and show beneath the item name.
// ---------------------------------------------------------------------------
const menuItems = [
  {
    order: 1,
    name: 'Classic Sourdough Batard',
    price: 14,
    description: '',
    enabled: true,
  },
  {
    order: 2,
    name: 'Cheddar Jalapeño Batard',
    price: 17,
    description: '',
    enabled: true,
  },
  {
    order: 3,
    name: 'Cheddar Batard',
    price: 16,
    description: '',
    enabled: true,
  },
  {
    order: 4,
    name: 'Sesame Focaccia',
    description: '',
    enabled: true,
    variants: [
      { label: 'Whole Sheet', price: 20 },
      { label: 'Half Sheet', price: 12 },
    ],
  },
  {
    order: 5,
    name: 'Cinnamon Roll Focaccia w/ Cream Cheese Glaze',
    description: '',
    enabled: true,
    variants: [
      { label: 'Whole Sheet (4 squares)', price: 25 },
      { label: '1 Square', price: 7 },
    ],
  },
];

async function seed() {
  const menuCol = collection(db, 'menu');

  // Clear existing menu docs so re-seeding is safe
  const existing = await getDocs(menuCol);
  for (const d of existing.docs) {
    await deleteDoc(d.ref);
    console.log(`Deleted old doc ${d.id}`);
  }

  for (const item of menuItems) {
    const ref = await addDoc(menuCol, item);
    console.log(`Added "${item.name}" → ${ref.id}`);
  }
  console.log('\nDone! All items seeded.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
