import React, { createContext, useContext, useState, useEffect } from 'react';
import { getMe } from '../api';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [faculty, setFaculty] = useState(null);
  const [token, setToken] = useState(() => 
    sessionStorage.getItem('edurecord_token') || localStorage.getItem('edurecord_token')
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      getMe()
        .then((res) => {
          if (res.data.success) setFaculty(res.data.faculty);
          else logout();
        })
        .catch(() => logout())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  // 3-Minute Inactivity Auto-Logout
  useEffect(() => {
    if (!token) return;

    const INACTIVITY_LIMIT = 3 * 60 * 1000; // 3 minutes = 180,000 ms
    let timeoutId = null;

    const resetInactivityTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        logout();
        toast.error('You were automatically logged out due to 3 minutes of inactivity.', {
          id: 'inactivity-logout-toast',
          duration: 5000,
        });
      }, INACTIVITY_LIMIT);
    };

    // User activity listeners
    const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart', 'pointermove'];
    activityEvents.forEach((evt) =>
      window.addEventListener(evt, resetInactivityTimer, { passive: true })
    );

    // Initialize timer
    resetInactivityTimer();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      activityEvents.forEach((evt) =>
        window.removeEventListener(evt, resetInactivityTimer)
      );
    };
  }, [token]);

  const login = (tok, facultyData) => {
    sessionStorage.setItem('edurecord_token', tok);
    localStorage.removeItem('edurecord_token');
    setToken(tok);
    setFaculty(facultyData);
  };

  const logout = () => {
    sessionStorage.removeItem('edurecord_token');
    localStorage.removeItem('edurecord_token');
    setToken(null);
    setFaculty(null);
  };

  const updateFacultyData = (newData) => {
    setFaculty((prev) => ({ ...prev, ...newData }));
  };

  return (
    <AuthContext.Provider value={{ faculty, token, loading, login, logout, updateFacultyData }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

