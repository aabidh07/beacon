import React, { useEffect, useState, useRef } from 'react';
import { db, getGpsLocation } from '../db';
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

  // 📍 Live GPS
  useEffect(() => {
    const loadLocation = async () => {
      const gps = await getGpsLocation();
      setLocation(gps);
    };
    loadLocation();
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

  // ✅ ADD THIS BLOCK HERE (RIGHT AFTER null check)
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

    const gps = await getGpsLocation();

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
    setLocation(gps);
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
          <label>GPS Location</label>
          <input
            className="input-field"
            readOnly
            value={`${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`}
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
