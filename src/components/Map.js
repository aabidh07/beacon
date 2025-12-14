// src/components/Map.js
import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Component to pan map to selected location
const MapPanner = ({ lat, lng }) => {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) {
      map.setView([lat, lng], 14); // zoom in on selection
    }
  }, [lat, lng, map]);
  return null;
};

const MapView = ({ incidents, selectedIncident }) => {
  const defaultCenter = incidents.length > 0
    ? [
      incidents.reduce((sum, i) => sum + i.latitude, 0) / incidents.length,
      incidents.reduce((sum, i) => sum + i.longitude, 0) / incidents.length
    ]
    : [6.7029, 80.3853]; // fallback

  return (
    <div className="card">
      <h3>📍 Live Map Visualization</h3>
      <p>Click on a marker or select an incident from the list to see its location.</p>

      <MapContainer
        center={defaultCenter}
        zoom={12}
        scrollWheelZoom={true}
        style={{ height: '400px', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {incidents.map((incident) => (
          <Marker
            key={incident.id}
            position={[incident.latitude, incident.longitude]}
          >
            <Popup>
              <div>
                <strong>Type:</strong> {incident.incidentType} <br />
                <strong>Severity:</strong> {incident.severity} <br />
                <strong>Timestamp:</strong> {new Date(incident.timestamp).toLocaleString()} <br />
                <strong>Location:</strong> {incident.latitude.toFixed(6)}, {incident.longitude.toFixed(6)}
              </div>
            </Popup>
          </Marker>
        ))}

        {selectedIncident && (
          <MapPanner
            lat={selectedIncident.latitude}
            lng={selectedIncident.longitude}
          />
        )}
      </MapContainer>
    </div>
  );
};

export default MapView;