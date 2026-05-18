import { useState, useEffect } from 'react';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
} from 'firebase/firestore';
import { db } from '../firebase';

export function useMenu() {
  const [menuItems, setMenuItems] = useState([]);
  const [allMenuItems, setAllMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'menu'), orderBy('order'));
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setAllMenuItems(items);
      setMenuItems(items.filter((item) => item.enabled !== false));
      setLoading(false);
    });
    return unsub;
  }, []);

  return { menuItems, allMenuItems, loading };
}

export function useBakeryInfo() {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'info', 'about'), (snap) => {
      setInfo(snap.exists() ? snap.data() : null);
      setLoading(false);
    });
    return unsub;
  }, []);

  return { info, loading };
}
