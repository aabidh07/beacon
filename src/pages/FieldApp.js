import React, { useEffect, useState, useRef } from 'react';
import { db } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';

const severityLabels = {
  1: 'Critical',
  2: 'High',
  3: 'Medium',
  4: 'Low',
  5: 'Minimal',
};

const FieldApp = () => {
  const [incidentType, setIncidentType] = useState('');
  const [severity, setSeverity] = useState(3);
  const [location, setLocation] = useState({ latitude: 0, longitude: 0 });
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [saved, setSaved] = useState(false);

  const fileInputRef = useRef();

  // ✅ Safe local pending count
  const pendingCount = useLiveQuery(
    () => db.incidents.filter(i => i.synced === false).count(),
    [],
    0
  );

  // 📍 Live GPS Status
  const [gpsStatus, setGpsStatus] = useState('locating'); // locating, success, error, denied
  const [gpsError, setGpsError] = useState('');

  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsStatus('error');
      setGpsError('Geolocation is not supported by your browser.');
      setLocation({ latitude: 6.7029, longitude: 80.3853 });
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setGpsStatus('success');
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        let msg = error.message;
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGpsStatus('denied');
            msg = "User denied the request for Geolocation.";
            break;
          case error.POSITION_UNAVAILABLE:
            setGpsStatus('error');
            msg = "Location information is unavailable.";
            break;
          case error.TIMEOUT:
            setGpsStatus('error');
            msg = "The request to get user location timed out.";
            break;
          default:
            setGpsStatus('error');
            msg = "An unknown error occurred.";
        }
        console.warn('Geolocation Error:', msg);
        setGpsError(msg);

        // Only set default if we completely lack coordinates
        setLocation(prev => ((prev.latitude === 0 || prev.latitude === 6.7029) ? { latitude: 6.7029, longitude: 80.3853 } : prev));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);
  // ⏱ Hide success alert
  useEffect(() => {
    if (saved) {
      const t = setTimeout(() => setSaved(false), 3000);
      return () => clearTimeout(t);
    }
  }, [saved]);

  // 📷 Image handlers
  const handleFile = (file) => {
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Image too large (max 2MB)');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPhoto(reader.result);        // Base64 for DB
      setPhotoPreview(reader.result); // Preview
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // drive data from live state
    const gps = location;

    await db.incidents.add({
      incidentType,
      severity,
      severityLabel: severityLabels[severity],
      latitude: gps.latitude,
      longitude: gps.longitude,
      timestamp: Date.now(),
      photo,
      synced: false,
    });

    setSaved(true);
    setIncidentType('');
    setSeverity(3);
    setPhoto(null);
    setPhotoPreview(null);
    // Location continues to update automatically
  };

  return (
    <div className="container" style={{ maxWidth: 600, margin: 'auto' }}>
      {saved && (
        <div className="alert alert-success">
          ✅ Report saved locally
        </div>
      )}

      {pendingCount > 0 && (
        <div className="alert alert-warning">
          ⏳ {pendingCount} report(s) pending sync
        </div>
      )}

      <div className="card">
        <h2 style={{ marginBottom: 5 }}>📍 Report Incident</h2>
        <p style={{ color: '#6b7280', marginBottom: 20 }}>
          All data is saved locally and syncs automatically when online
        </p>

        <form onSubmit={handleSubmit}>
          {/* GPS */}
          <label>
            GPS Location
            {gpsStatus === 'locating' && <span style={{ fontSize: '0.8em', color: '#ea580c', marginLeft: 8 }}>⚡ Locating...</span>}
            {gpsStatus === 'success' && <span style={{ fontSize: '0.8em', color: '#16a34a', marginLeft: 8 }}>✓ Live</span>}
            {(gpsStatus === 'error' || gpsStatus === 'denied') && <span style={{ fontSize: '0.8em', color: '#dc2626', marginLeft: 8 }}>⚠ {gpsStatus === 'denied' ? 'Permission Denied' : 'Signal Error'}</span>}
          </label>
          {gpsError && <div style={{ fontSize: '0.75em', color: '#dc2626', marginBottom: 5 }}>{gpsError} Using default.</div>}
          <input
            className="input-field"
            readOnly
            value={`${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`}
            style={{
              background: gpsStatus === 'success' ? '#f0fdf4' : (gpsStatus === 'error' || gpsStatus === 'denied' ? '#fef2f2' : '#f9fafb')
            }}
          />

          {/* Incident Type */}
          <label>Incident Type</label>
          <select
            className="input-field"
            value={incidentType}
            onChange={(e) => setIncidentType(e.target.value)}
            required
          >
            <option value="" disabled>
              Select incident type
            </option>
            <option value="Road Block">Road Block</option>
            <option value="Flood">Flood</option>
            <option value="Landslide">Landslide</option>
            <option value="Power Failure">Power Failure</option>
          </select>

          {/* Severity */}
          <label>
            Severity Level: <strong>{severityLabels[severity]}</strong>
          </label>
          <input
            type="range"
            min="1"
            max="5"
            value={severity}
            onChange={(e) => setSeverity(Number(e.target.value))}
            style={{ width: '100%' }}
          />

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 12,
            marginBottom: 20
          }}>
            <span style={{ color: '#dc2626' }}>Critical</span>
            <span style={{ color: '#ea580c' }}>High</span>
            <span style={{ color: '#2563eb' }}>Medium</span>
            <span style={{ color: '#16a34a' }}>Low</span>
            <span style={{ color: '#6b7280' }}>Minimal</span>
          </div>

          {/* Photo */}
          <label>Photo (Optional)</label>
          <div
            onClick={() => fileInputRef.current.click()}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            style={{
              border: '2px dashed #d1d5db',
              borderRadius: 8,
              padding: 25,
              textAlign: 'center',
              cursor: 'pointer',
              marginBottom: 20,
            }}
          >
            {photoPreview ? (
              <img
                src={photoPreview}
                alt="Preview"
                style={{ width: '100%', borderRadius: 6 }}
              />
            ) : (
              <>
                <div style={{ fontSize: 24 }}>📷</div>
                <div style={{ color: '#6b7280' }}>
                  Drag & drop image here or click to select
                </div>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={(e) => handleFile(e.target.files[0])}
            />
          </div>

          <button className="btn-primary" type="submit" style={{ width: '100%' }}>
            Save Report Locally
          </button>
        </form>
      </div>
    </div>
  );
};

export default FieldApp;
