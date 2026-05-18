import { useState, useMemo } from 'react';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useMenu, useBakeryInfo } from '../hooks/useMenu';

function QuantitySelector({ value, onChange, min = 0, max = 20 }) {
  return (
    <div className="qty-selector">
      <button
        type="button"
        className="qty-btn"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Decrease quantity"
      >
        −
      </button>
      <span className="qty-value">{value}</span>
      <button
        type="button"
        className="qty-btn"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
}

const PICKUP_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export default function OrderForm() {
  const { menuItems, loading: menuLoading } = useMenu();
  const { info, loading: infoLoading } = useBakeryInfo();

  const [form, setForm] = useState({ name: '', phone: '', email: '' });
  const [quantities, setQuantities] = useState({});
  const [pickUpDate, setPickUpDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const totalCost = useMemo(() => {
    return menuItems.reduce((sum, item) => {
      return sum + (quantities[item.id] || 0) * item.price;
    }, 0);
  }, [menuItems, quantities]);

  const totalItems = useMemo(
    () => Object.values(quantities).reduce((a, b) => a + b, 0),
    [quantities]
  );

  function handleField(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function setQty(itemId, qty) {
    setQuantities((prev) => ({ ...prev, [itemId]: qty }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) return setError('Name is required.');
    if (!form.phone.trim()) return setError('Phone number is required.');
    if (!pickUpDate) return setError('Please select a pick up date.');
    if (totalItems === 0) return setError('Please add at least one item to your order.');

    const orderDate = new Date().toLocaleDateString('en-US');
    const itemBreakdown = menuItems.reduce((acc, item) => {
      acc[item.id] = {
        name: item.name,
        qty: quantities[item.id] || 0,
        price: item.price,
      };
      return acc;
    }, {});

    const orderData = {
      orderDate,
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      items: itemBreakdown,
      pickUpDate,
      status: 'In Progress',
      totalCost,
      actualPayment: '',
      createdAt: Timestamp.now(),
    };

    setSubmitting(true);
    try {
      // 1. Save to Firestore
      await addDoc(collection(db, 'orders'), orderData);

      // 2. Send to Google Sheet via Apps Script webhook
      const scriptUrl = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL;
      if (scriptUrl) {
        // Build flat row for the sheet — one column per menu item qty
        const sheetPayload = {
          orderDate,
          name: orderData.name,
          phone: orderData.phone,
          email: orderData.email,
          pickUpDate,
          status: 'In Progress',
          totalCost,
          actualPayment: '',
          items: menuItems.map((item) => ({
            id: item.id,
            name: item.name,
            qty: quantities[item.id] || 0,
          })),
        };

        await fetch(scriptUrl, {
          method: 'POST',
          mode: 'no-cors', // Apps Script doesn't return CORS headers on success
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sheetPayload),
        });
      }

      setSubmitted(true);
    } catch (err) {
      console.error(err);
      setError('Something went wrong submitting your order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="success-card">
        <div className="success-icon">🍞</div>
        <h2>Order received!</h2>
        <p>
          Thanks <strong>{form.name}</strong>! Your order has been placed. We'll
          be in touch with pickup details.
        </p>
        <p className="success-total">Order total: <strong>${totalCost.toFixed(2)}</strong></p>
        <button
          className="btn-primary"
          onClick={() => {
            setForm({ name: '', phone: '', email: '' });
            setQuantities({});
            setPickUpDate('');
            setSubmitted(false);
          }}
        >
          Place another order
        </button>
      </div>
    );
  }

  const pickupDates = info?.pickupDates || [];

  return (
    <div className="form-card">
      {/* Bakery header */}
      <div className="form-header">
        <h1 className="bakery-name">Miso &amp; Dough</h1>
        <p className="bakery-tagline">Sourdough Order Form</p>
        {info?.description && (
          <p className="bakery-description">{info.description}</p>
        )}
        {info?.orderDeadline && (
          <p className="order-deadline">{info.orderDeadline}</p>
        )}
        {info?.pickupInfo && (
          <p className="pickup-info">{info.pickupInfo}</p>
        )}
      </div>

      <form onSubmit={handleSubmit} noValidate>
        {/* Contact info */}
        <section className="form-section">
          <div className="field-group">
            <label htmlFor="name">Name <span className="required">*</span></label>
            <input
              id="name"
              name="name"
              type="text"
              value={form.name}
              onChange={handleField}
              placeholder="Your full name"
              autoComplete="name"
              required
            />
          </div>

          <div className="field-group">
            <label htmlFor="phone">Phone Number <span className="required">*</span></label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={form.phone}
              onChange={handleField}
              placeholder="(555) 555-5555"
              autoComplete="tel"
              required
            />
          </div>

          <div className="field-group">
            <label htmlFor="email">
              Email <span className="optional">— for future drop updates!</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleField}
              placeholder="your@email.com"
              autoComplete="email"
            />
          </div>
        </section>

        {/* Menu items */}
        <section className="form-section">
          <h2 className="section-title">Organic Sourdough Bread</h2>
          <p className="section-subtitle">Select loaf and quantity</p>

          {menuLoading ? (
            <p className="loading-text">Loading menu…</p>
          ) : menuItems.length === 0 ? (
            <p className="loading-text">No items available right now.</p>
          ) : (
            <div className="menu-items">
              {menuItems.map((item) => (
                <div key={item.id} className="menu-item">
                  <div className="menu-item-info">
                    <span className="menu-item-name">{item.name}</span>
                    <span className="menu-item-price">${item.price}</span>
                    {item.description && (
                      <span className="menu-item-desc">{item.description}</span>
                    )}
                  </div>
                  <QuantitySelector
                    value={quantities[item.id] || 0}
                    onChange={(qty) => setQty(item.id, qty)}
                  />
                </div>
              ))}
            </div>
          )}

          {totalItems > 0 && (
            <div className="order-summary">
              <div className="order-summary-rows">
                {menuItems
                  .filter((item) => (quantities[item.id] || 0) > 0)
                  .map((item) => (
                    <div key={item.id} className="summary-row">
                      <span>
                        {quantities[item.id]}× {item.name}
                      </span>
                      <span>${(quantities[item.id] * item.price).toFixed(2)}</span>
                    </div>
                  ))}
              </div>
              <div className="summary-total">
                <span>Estimated Total</span>
                <span>${totalCost.toFixed(2)}</span>
              </div>
            </div>
          )}
        </section>

        {/* Pick up date */}
        <section className="form-section">
          <div className="field-group">
            <label htmlFor="pickUpDate">
              Pick Up Date <span className="required">*</span>
            </label>
            {pickupDates.length > 0 ? (
              <select
                id="pickUpDate"
                value={pickUpDate}
                onChange={(e) => setPickUpDate(e.target.value)}
                required
              >
                <option value="">Select a date…</option>
                {pickupDates.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            ) : (
              <input
                id="pickUpDate"
                type="date"
                value={pickUpDate}
                onChange={(e) => setPickUpDate(e.target.value)}
                required
              />
            )}
          </div>
        </section>

        {error && <p className="form-error">{error}</p>}

        <button
          type="submit"
          className="btn-primary btn-submit"
          disabled={submitting}
        >
          {submitting ? 'Placing order…' : 'Place Order'}
        </button>
      </form>
    </div>
  );
}
