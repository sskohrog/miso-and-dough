import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase";
import OrderForm from "./components/OrderForm";
import MenuAdmin from "./components/MenuAdmin";
import AdminLogin from "./components/AdminLogin";
import "./App.css";

function AdminRoute({ user: user }) {
  if (user === undefined)
    return (
      <div className="page-center">
        <p className="loading-text">Loading…</p>
      </div>
    );
  if (!user) return <AdminLogin />;
  return <MenuAdmin />;
}

export default function App() {
  const [user, setUser] = useState(undefined); // undefined = loading

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return unsub;
  }, []);

  return (
    <BrowserRouter>
      <nav className="site-nav">
        <Link to="/" className="nav-logo">
          Miso &amp; Dough
        </Link>
        {user ? (
          <button
            className="btn-secondary btn-sm"
            onClick={() => signOut(auth)}
          >
            Sign Out
          </button>
        ) : (
          <Link to="/admin" className="nav-admin-link">
            Admin
          </Link>
        )}
      </nav>
      <main className="page-main">
        <Routes>
          <Route path="/" element={<OrderForm />} />
          <Route path="/admin" element={<AdminRoute user={user} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
