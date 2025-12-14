// src/App.js
import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter as Router, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, syncReportsToServer } from './db';
import FieldApp from './pages/FieldApp';
import Dashboard from './pages/Dashboard';
import './index.css';

/* =========================================================
   🔐 FIELD MODE LOGIN (First screen)
   ========================================================= */
const Login = ({ onLogin }) => {
  const [name, setName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) {
      onLogin(name.trim());
    }
  };

  return (
    <div className="container" style={{ marginTop: '80px' }}>
      <div
        className="card"
        style={{
          maxWidth: '420px',
          margin: 'auto',
          textAlign: 'center',
          padding: '30px',
        }}
      >
        <span style={{ fontSize: '3rem' }}>🛡</span>
        <h1 style={{ marginBottom: '5px' }}>Project Aegis</h1>
        <p style={{ color: '#555', marginBottom: '20px' }}>
          Disaster Response System
        </p>

        <form onSubmit={handleSubmit}>
          <label style={{ textAlign: 'left', display: 'block' }}>
            Responder Name
          </label>
          <input
            className="input-field"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <button className="btn-primary" style={{ marginTop: '15px', width: '100%' }}>
            Login as Responder
          </button>
        </form>

        <div
          style={{
            marginTop: '25px',
            paddingTop: '15px',
            borderTop: '1px solid #eee',
            fontSize: '0.9em',
            color: '#444',
          }}
        >
          <strong>Offline-First System</strong>
          <p style={{ marginTop: '8px' }}>
            Once logged in, you can use this app completely offline.
            All reports are saved locally and sync automatically when
            you're back online.
          </p>
        </div>
      </div>
    </div>
  );
};

/* =========================================================
   🔐 DASHBOARD ADMIN LOGIN (Username + Password)
   ========================================================= */
const DashboardAuth = ({ onAdminLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // Example credentials
    if (username === 'admin' && password === 'admin123') {
      onAdminLogin();
    } else {
      setError('Invalid username or password');
    }
  };

  return (
    <div className="container" style={{ marginTop: '80px' }}>
      <div
        className="card"
        style={{
          maxWidth: '420px',
          margin: 'auto',
          textAlign: 'center',
          padding: '30px',
        }}
      >
        <h2>Admin Login</h2>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <form onSubmit={handleSubmit}>
          <label style={{ textAlign: 'left', display: 'block' }}>Username</label>
          <input
            className="input-field"
            placeholder="Enter username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <label style={{ textAlign: 'left', display: 'block', marginTop: '10px' }}>Password</label>
          <input
            className="input-field"
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button className="btn-primary" style={{ marginTop: '15px', width: '100%' }}>
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

/* =========================================================
   🚀 MAIN APP
   ========================================================= */
function AppWrapper() {
  return (
    <Router>
      <App />
    </Router>
  );
}

function App() {
  const navigate = useNavigate();

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState(null);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);

  const sessionState = useLiveQuery(() => db.session.get('current'), [], null);
  const isAuthenticated = !!sessionState;

  /* -------------------- AUTH ACTIONS -------------------- */
  const handleLogin = async (name) => {
    await db.session.put({
      id: 'current',
      responderName: name,
      loginTimestamp: Date.now(),
    });
  };

  const handleLogout = async () => {
    await db.session.clear();
    setAdminAuthenticated(false);
    setShowAdminLogin(false);
  };

  /* -------------------- OFFLINE SYNC ENGINE -------------------- */
  const performSync = useCallback(async () => {
    if (!isAuthenticated) return;

    const pendingReports = await db.incidents
      .filter((i) => i.synced === false)
      .toArray();

    if (pendingReports.length > 0) {
      setSyncStatus('Syncing...');
      try {
        await syncReportsToServer(pendingReports);
        setSyncStatus('Synced');
      } catch {
        setSyncStatus('Sync Failed');
      }
    } else {
      setSyncStatus('Online');
    }
    setTimeout(() => setSyncStatus(null), 4000);
  }, [isAuthenticated]);

  useEffect(() => {
    const updateStatus = () => {
      const status = navigator.onLine;
      setIsOnline(status);
      if (status && isAuthenticated) performSync();
    };
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);

    if (isOnline && isAuthenticated) performSync();

    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
    };
  }, [isOnline, isAuthenticated, performSync]);

  /* -------------------- STATUS BAR -------------------- */
  const StatusBar = () => (
    <div
      style={{
        background: isOnline ? '#16a34a' : '#dc2626',
        color: 'white',
        padding: '8px',
        textAlign: 'center',
        fontWeight: '500',
      }}
    >
      {isOnline ? '🟢 ONLINE MODE' : '🔴 OFFLINE MODE'}
    </div>
  );

  /* =========================================================
     🔁 SHOW LOGIN FIRST IF NOT AUTHENTICATED
     ========================================================= */
  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  if (showAdminLogin && !adminAuthenticated) {
    return <DashboardAuth onAdminLogin={() => {
      setAdminAuthenticated(true);
      setShowAdminLogin(false);
      navigate('/dashboard'); // ✅ go to dashboard after admin login
    }} />;
  }

  /* =========================================================
     🧭 MAIN APP ROUTES
     ========================================================= */
  return (
    <>
      <StatusBar />
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '15px 20px',
          background: '#333',
          color: 'white',
        }}
      >
        <strong style={{ fontSize: '16px' }}>
          Project Aegis | Hello, {sessionState?.responderName}
        </strong>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Link
            to="/"
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              background: '#2563eb',
              color: 'white',
              textDecoration: 'none',
              fontWeight: '500',
            }}
          >
            Field Mode
          </Link>

          <Link
            to="/dashboard"
            onClick={(e) => {
              if (!adminAuthenticated) {
                e.preventDefault();
                setShowAdminLogin(true); // show admin login instead
              }
            }}
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              background: '#e5e7eb',
              color: '#111827',
              textDecoration: 'none',
              fontWeight: '500',
            }}
          >
            Dashboard
          </Link>

          <button
            onClick={handleLogout}
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              background: '#dc2626',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '15px',
              lineHeight: '20px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            Logout
          </button>
        </div>
      </header>

      <Routes>
        <Route path="/" element={<FieldApp isOnline={isOnline} />} />
        {adminAuthenticated && (
          <Route
            path="/dashboard"
            element={<Dashboard isOnline={isOnline} syncStatus={syncStatus} setSyncStatus={setSyncStatus} />}
          />
        )}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>

      <div
        style={{
          textAlign: 'center',
          padding: '20px',
          fontSize: '0.85em',
          color: '#666',
        }}
      >
        <p>
          Sync Status:{' '}
          {syncStatus || (isOnline ? 'Online – Ready to sync' : 'Offline – Saved locally')}
        </p>
        <p>Offline-First Disaster Response MVP</p>
      </div>
    </>
  );
}

export default AppWrapper;