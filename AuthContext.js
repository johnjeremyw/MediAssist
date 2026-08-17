import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, caregiver, setAuthToken } from './api';
import { registerForPushNotifications } from './push';

const STORAGE_KEY = 'mediassist.session';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null); // { token, user, patientId, patientName }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Restore a persisted session on cold start.
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          setAuthToken(saved.token);
          setSession(saved);
          registerForPushNotifications().catch(() => {});
        }
      } catch {
        // corrupt/missing storage — fall through to the login screen
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email, password) => {
    setError(null);
    const { token, user } = await auth.login(email, password);
    setAuthToken(token);

    let patientId = user.id;
    let patientName = user.name;
    if (user.role === 'CAREGIVER') {
      const { patients } = await caregiver.myPatients();
      if (patients.length === 0) {
        throw new Error('This caregiver account has no linked patient yet.');
      }
      patientId = patients[0].id;
      patientName = patients[0].name;
    }

    const next = { token, user, patientId, patientName };
    setSession(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    registerForPushNotifications().catch(() => {});
    return next;
  }, []);

  const logout = useCallback(async () => {
    setAuthToken(null);
    setSession(null);
    await AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <AuthContext.Provider value={{ session, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
