// src/pages/Dashboard.js

import React, { useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, syncReportsToServer } from '../db';
import MapView from '../components/Map';

const severityLabels = ['Critical', 'High', 'Medium', 'Low', 'Minimal', 'Unknown'];

const getSeverityColor = (severity) => {
  switch (severity) {
    case 1: return '#dc3545'; // Critical
    case 2: return '#ffc107'; // High
    case 3: return '#007bff'; // Medium
    case 4: return '#28a745'; // Low
    case 5: return '#6c757d'; // Minimal/Unknown
    default: return '#6c757d';
  }
};

const getSeverityTag = (severity) => (
  <span style={{
    padding: '3px 8px',
    borderRadius: '3px',
    color: 'white',
    backgroundColor: getSeverityColor(severity),
    fontSize: '0.8em'
  }}>
    {severityLabels[severity - 1] || 'Unknown'}
  </span>
);

const Dashboard = ({ isOnline, syncStatus, setSyncStatus }) => {
  const [selectedIncident, setSelectedIncident] = useState(null);

  const allIncidents = useLiveQuery(
    () => db.incidents.orderBy('timestamp').reverse().toArray(),
    [syncStatus]
  ) || [];

  const pendingIncidents = allIncidents.filter(i => !i.synced);
  const syncedIncidents = allIncidents.filter(i => i.synced);

  const totalIncidents = syncedIncidents.length;
  const criticalIncidents = syncedIncidents.filter(i => i.severity === 1).length;
  const pendingCount = pendingIncidents.length;

  const handleRefresh = async () => {
    if (isOnline && pendingIncidents.length > 0) {
      setSyncStatus('Syncing...');
      await syncReportsToServer(pendingIncidents);
      setSyncStatus('Synced');
      setTimeout(() => setSyncStatus(null), 3000);
    } else {
      alert('No pending reports or currently offline.');
    }
  };

  // Reference for Map to move to a selected incident
  const mapRef = useRef();

  const handleIncidentClick = (incident) => {
    setSelectedIncident(incident);
    if (mapRef.current) {
      mapRef.current.flyTo([incident.latitude, incident.longitude], 15);
    }
  };

  return (
    <div className="container">
      <div className="card">
        <h2>Command Dashboard</h2>
        <p>Real-time incident monitoring and response coordination</p>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <span>Last sync: {syncStatus || 'N/A'}</span>
          <button className="btn-primary" onClick={handleRefresh} style={{ width: 'auto', padding: '10px 20px' }}>
            Refresh / Sync
          </button>
        </div>

        {/* Info Cards */}
        <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center', marginBottom: '30px' }}>
          <div style={{ padding: '10px', borderRight: '1px solid #ccc' }}>
            <strong>{totalIncidents}</strong><br />Total Incidents
          </div>
          <div style={{ padding: '10px', borderRight: '1px solid #ccc' }}>
            <strong>{criticalIncidents}</strong><br />Critical Incidents
          </div>
          <div style={{ padding: '10px', borderRight: '1px solid #ccc' }}>
            <strong>{pendingCount}</strong><br />Pending Sync
          </div>
        </div>
      </div>

      {/* Live Map Visualization */}
      {isOnline && totalIncidents > 0 ? (
        <MapView ref={mapRef} incidents={allIncidents} selectedIncident={selectedIncident} />
      ) : (
        <div className="card alert-warning">
          Map requires an internet connection to load tiles. Showing synced list below.
        </div>
      )}

      {/* Real-Time List View */}
      <div className="card">
        <h3>Incoming Incident Reports ({syncedIncidents.length} Synced)</h3>
        {syncedIncidents.length > 0 ? (
          syncedIncidents.map(incident => (
            <div
              key={incident.id}
              style={{ borderBottom: '1px solid #eee', padding: '10px 0', cursor: 'pointer' }}
              onClick={() => handleIncidentClick(incident)}
            >
              <strong>{incident.incidentType}</strong> {getSeverityTag(incident.severity)}
              <br />
              <small>
                {new Date(incident.timestamp).toLocaleString()} | GPS: {incident.latitude.toFixed(6)}, {incident.longitude.toFixed(6)}
              </small>
              {incident.photo && (
                <div style={{ marginTop: '5px' }}>
                  <img
                    src={incident.photo}
                    alt="Incident"
                    style={{ maxWidth: '150px', maxHeight: '120px', borderRadius: '5px', border: '1px solid #ccc' }}
                  />
                </div>
              )}
            </div>
          ))
        ) : (
          <p>No reports have been synced to the server yet.</p>
        )}
      </div>

      {/* Pending Reports */}
      {pendingIncidents.length > 0 && (
        <div className="card alert-warning">
          <h3>⚠️ {pendingIncidents.length} Pending Local Reports (Unsynced)</h3>
          <p>These reports are safely stored locally and will sync when online.</p>
          {pendingIncidents.map(incident => (
            <div key={incident.id} style={{ borderBottom: '1px solid #ffeeba', padding: '5px 0' }}>
              <strong>{incident.incidentType}</strong> (Local ID: {incident.id})
              {incident.photo && (
                <div style={{ marginTop: '3px' }}>
                  <img
                    src={incident.photo}
                    alt="Incident"
                    style={{ maxWidth: '120px', maxHeight: '100px', borderRadius: '5px', border: '1px solid #ccc' }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;