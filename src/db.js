// src/db.js
import Dexie from 'dexie';

// Initialize the database
export const db = new Dexie('AegisDB');

// Define the database schema
db.version(1).stores({
  incidents: '++id, timestamp, synced',
  session: '&id, isAuthenticated',
});

/**
 * Async function to get current GPS location using the browser Geolocation API.
 * Falls back to Ratnapura coordinates if unavailable.
 */
export const getGpsLocation = async () => {
  if (!navigator.geolocation) {
    console.warn('Geolocation API not available, using default location.');
    return { latitude: 6.7029, longitude: 80.3853 };
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        console.warn('Geolocation error:', error.message, 'Using default location.');
        resolve({ latitude: 6.7029, longitude: 80.3853 });
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );
  });
};

/**
 * Utility to simulate backend API for report submission.
 * Updates local 'synced' status after "sending".
 */
export const syncReportsToServer = async (reports) => {
  if (reports.length === 0) {
    console.log('No reports to sync.');
    return true;
  }

  console.log(`Attempting to sync ${reports.length} reports to server:`, reports);

  const syncedIds = reports.map(r => r.id);

  await db.incidents.where('id').anyOf(syncedIds).modify({ synced: true });

  console.log(`${syncedIds.length} reports successfully marked as synced locally.`);

  return true;
};

// Login and save session
export const login = async (userName) => {
  await db.session.clear();
  await db.session.put({
    id: 'current',
    isAuthenticated: true,
    userName,
  });
  console.log(`User ${userName} logged in locally.`);
};

// Logout and clear session
export const logout = async () => {
  await db.session.clear();
  console.log('User logged out and local session cleared.');
};

// Get current session
export const getSession = async () => {
  return db.session.get('current');
};