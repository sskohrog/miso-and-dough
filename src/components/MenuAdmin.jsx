import { useState, useEffect } from 'react';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useMenu, useBakeryInfo } from '../hooks/useMenu';

const STATUS_OPTIONS = ['In Progress', 'Baked', 'Picked Up'];

// ─── Menu Item Editor ────────────────────────────────────────────────────────
function MenuItemRow({ item, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item);
  const [saving, setSaving] = useState(false);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setDraft((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  }

  async function handleSave() {
    setSaving(true);
    const toSave = { ...draft };
    if (toSave.variants?.length) {
      toSave.variants = toSave.variants.map((v) => ({ ...v, price: parseFloat(v.price) || 0 }));
    } else {
      toSave.price = parseFloat(toSave.price) || 0;
    }
    await onSave(toSave);
    setSaving(false);
    setEditing(false);
  }

  if (!editing) {
    return (
      <div className={`menu-row ${!item.enabled ? 'menu-row--disabled' : ''}`}>
        <div className="menu-row-info">
          <span className="menu-row-name">{item.name}</span>
          {item.variants?.length ? (
            <div className="menu-row-variants">
              {item.variants.map((v, i) => (
                <span key={i} className="menu-row-variant">{v.label} — ${v.price}</span>
              ))}
            </div>
          ) : (
            <span className="menu-row-price">${item.price}</span>
          )}
          {item.description && (
            <span className="menu-row-desc">{item.description}</span>
          )}
          {!item.enabled && <span className="badge-disabled">Hidden</span>}
        </div>
        <div className="menu-row-actions">
          <button className="btn-secondary btn-sm" onClick={() => { setDraft(item); setEditing(true); }}>
            Edit
          </button>
          <button className="btn-danger btn-sm" onClick={() => onDelete(item.id)}>
            Delete
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="menu-row menu-row--editing">
      <div className="edit-grid">
        <div className="field-group">
          <label>Item Name</label>
          <input name="name" value={draft.name} onChange={handleChange} />
        </div>
        {!draft.variants?.length && (
          <div className="field-group">
            <label>Price ($)</label>
            <input name="price" type="number" step="0.01" min="0" value={draft.price ?? ''} onChange={handleChange} />
          </div>
        )}
        <div className="field-group field-group--full">
          <label>Description / Notes</label>
          <input name="description" value={draft.description || ''} onChange={handleChange} placeholder="Optional" />
        </div>
        <div className="field-group field-group--full">
          <label>Size Variants {!draft.variants?.length && <span className="field-hint">(leave empty for a single price above)</span>}</label>
          {(draft.variants || []).map((v, i) => (
            <div key={i} className="variant-edit-row">
              <input
                value={v.label}
                onChange={(e) => {
                  const variants = [...draft.variants];
                  variants[i] = { ...variants[i], label: e.target.value };
                  setDraft((prev) => ({ ...prev, variants }));
                }}
                placeholder="Size label (e.g. Whole Sheet)"
              />
              <input
                type="number" step="0.01" min="0"
                value={v.price}
                onChange={(e) => {
                  const variants = [...draft.variants];
                  variants[i] = { ...variants[i], price: parseFloat(e.target.value) || 0 };
                  setDraft((prev) => ({ ...prev, variants }));
                }}
                placeholder="Price"
              />
              <button
                type="button" className="btn-danger btn-sm"
                onClick={() => setDraft((prev) => ({ ...prev, variants: prev.variants.filter((_, j) => j !== i) }))}
              >×</button>
            </div>
          ))}
          <button
            type="button" className="btn-secondary btn-sm"
            onClick={() => setDraft((prev) => ({ ...prev, variants: [...(prev.variants || []), { label: '', price: 0 }] }))}
          >+ Add Size Variant</button>
        </div>
        <div className="field-group">
          <label>
            <input type="checkbox" name="enabled" checked={draft.enabled !== false} onChange={handleChange} />
            {' '}Show on order form
          </label>
        </div>
      </div>
      <div className="menu-row-actions">
        <button className="btn-primary btn-sm" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button className="btn-secondary btn-sm" onClick={() => setEditing(false)}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Add Item Form ────────────────────────────────────────────────────────────
function AddItemForm({ existingCount, onAdd }) {
  const [draft, setDraft] = useState({ name: '', price: '', description: '', enabled: true });
  const [saving, setSaving] = useState(false);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setDraft((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }

  async function handleAdd() {
    if (!draft.name.trim() || !draft.price) return;
    setSaving(true);
    await onAdd({ ...draft, price: parseFloat(draft.price), order: existingCount + 1 });
    setDraft({ name: '', price: '', description: '', enabled: true });
    setSaving(false);
  }

  return (
    <div className="add-item-form">
      <h4>Add New Item</h4>
      <div className="edit-grid">
        <div className="field-group">
          <label>Item Name</label>
          <input name="name" value={draft.name} onChange={handleChange} placeholder="e.g. Seeded Rye Loaf" />
        </div>
        <div className="field-group">
          <label>Price ($)</label>
          <input name="price" type="number" step="0.01" min="0" value={draft.price} onChange={handleChange} placeholder="0.00" />
        </div>
        <div className="field-group field-group--full">
          <label>Description / Notes</label>
          <input name="description" value={draft.description} onChange={handleChange} placeholder="Optional" />
        </div>
      </div>
      <button className="btn-primary btn-sm" onClick={handleAdd} disabled={saving || !draft.name.trim() || !draft.price}>
        {saving ? 'Adding…' : '+ Add Item'}
      </button>
    </div>
  );
}

// ─── Bakery Info Editor ───────────────────────────────────────────────────────
function BakeryInfoEditor({ info }) {
  const [draft, setDraft] = useState(
    info || { description: '', orderDeadline: '', pickupInfo: '', pickupDates: [] }
  );
  const [newDate, setNewDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function handleChange(e) {
    setDraft((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function addDate() {
    if (!newDate.trim()) return;
    setDraft((prev) => ({ ...prev, pickupDates: [...(prev.pickupDates || []), newDate.trim()] }));
    setNewDate('');
  }

  function removeDate(idx) {
    setDraft((prev) => ({ ...prev, pickupDates: prev.pickupDates.filter((_, i) => i !== idx) }));
  }

  async function handleSave() {
    setSaving(true);
    await setDoc(doc(db, 'info', 'about'), draft, { merge: true });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="info-editor">
      <div className="field-group">
        <label>Bakery Description</label>
        <textarea name="description" value={draft.description || ''} onChange={handleChange} rows={4} />
      </div>
      <div className="field-group">
        <label>Order Deadline Message</label>
        <input name="orderDeadline" value={draft.orderDeadline || ''} onChange={handleChange} placeholder="e.g. Orders open until Thursday!" />
      </div>
      <div className="field-group">
        <label>Pickup Info Message</label>
        <input name="pickupInfo" value={draft.pickupInfo || ''} onChange={handleChange} placeholder="e.g. Pick up Sunday 5/17 from 11-3" />
      </div>
      <div className="field-group">
        <label>Pick Up Date Options</label>
        <div className="date-tags">
          {(draft.pickupDates || []).map((d, i) => (
            <span key={i} className="date-tag">
              {d}
              <button type="button" onClick={() => removeDate(i)} className="date-tag-remove">×</button>
            </span>
          ))}
        </div>
        <div className="date-add-row">
          <input
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            placeholder="e.g. 5/24 Sun 11-3"
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addDate())}
          />
          <button type="button" className="btn-secondary btn-sm" onClick={addDate}>Add</button>
        </div>
      </div>
      <button className="btn-primary" onClick={handleSave} disabled={saving}>
        {saved ? 'Saved!' : saving ? 'Saving…' : 'Save Bakery Info'}
      </button>
    </div>
  );
}

// ─── Orders Table ─────────────────────────────────────────────────────────────
function OrdersTable() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  async function updateStatus(orderId, status) {
    await updateDoc(doc(db, 'orders', orderId), { status });
  }

  async function updateActualPayment(orderId, value) {
    const num = parseFloat(value);
    if (!isNaN(num)) {
      await updateDoc(doc(db, 'orders', orderId), { actualPayment: num });
    }
  }

  if (loading) return <p className="loading-text">Loading orders…</p>;
  if (orders.length === 0) return <p className="loading-text">No orders yet.</p>;

  return (
    <div className="orders-table-wrapper">
      <table className="orders-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Name</th>
            <th>Phone</th>
            <th>Email</th>
            <th>Items</th>
            <th>Pick Up</th>
            <th>Status</th>
            <th>Total</th>
            <th>Paid</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td>{order.orderDate}</td>
              <td>{order.name}</td>
              <td>{order.phone}</td>
              <td className="td-email">{order.email}</td>
              <td className="td-items">
                {order.items
                  ? Object.values(order.items)
                      .filter((i) => i.qty > 0)
                      .map((i) => `${i.qty}× ${i.name}`)
                      .join(', ')
                  : '—'}
              </td>
              <td>{order.pickUpDate}</td>
              <td>
                <select
                  value={order.status}
                  onChange={(e) => updateStatus(order.id, e.target.value)}
                  className={`status-select status-${order.status?.replace(/\s/g, '-').toLowerCase()}`}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </td>
              <td>${(order.totalCost || 0).toFixed(2)}</td>
              <td>
                <input
                  type="number"
                  className="payment-input"
                  defaultValue={order.actualPayment || ''}
                  placeholder="0.00"
                  step="0.01"
                  onBlur={(e) => updateActualPayment(order.id, e.target.value)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Admin Panel ─────────────────────────────────────────────────────────
export default function MenuAdmin() {
  const { allMenuItems, loading: menuLoading } = useMenu();
  const { info, loading: infoLoading } = useBakeryInfo();
  const [tab, setTab] = useState('menu');

  async function saveItem(item) {
    await setDoc(doc(db, 'menu', item.id), item, { merge: true });
  }

  async function deleteItem(itemId) {
    if (!window.confirm('Delete this item from the menu?')) return;
    await deleteDoc(doc(db, 'menu', itemId));
  }

  async function addItem(item) {
    // Use name as ID (slugified)
    const id = item.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    await setDoc(doc(db, 'menu', id), { ...item, id });
  }

  return (
    <div className="admin-panel">
      <h1 style={{marginBottom: 10}}>Admin Panel</h1>

      <div className="tab-bar">
        {['menu', 'info', 'orders'].map((t) => (
          <button
            key={t}
            className={`tab-btn ${tab === t ? 'tab-btn--active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'menu' ? 'Menu Items' : t === 'info' ? 'Bakery Info' : 'Orders'}
          </button>
        ))}
      </div>

      {tab === 'menu' && (
        <div className="admin-section">
          <h2>Menu Items</h2>
          {menuLoading ? (
            <p className="loading-text">Loading…</p>
          ) : (
            <>
              {allMenuItems.map((item) => (
                <MenuItemRow
                  key={item.id}
                  item={item}
                  onSave={saveItem}
                  onDelete={deleteItem}
                />
              ))}
              <AddItemForm existingCount={allMenuItems.length} onAdd={addItem} />
            </>
          )}
        </div>
      )}

      {tab === 'info' && (
        <div className="admin-section">
          <h2>Bakery Info</h2>
          {infoLoading ? (
            <p className="loading-text">Loading…</p>
          ) : (
            <BakeryInfoEditor key={info ? 'loaded' : 'empty'} info={info} />
          )}
        </div>
      )}

      {tab === 'orders' && (
        <div className="admin-section">
          <h2>Orders</h2>
          <OrdersTable />
        </div>
      )}
    </div>
  );
}
