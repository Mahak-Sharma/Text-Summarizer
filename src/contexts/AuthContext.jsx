import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../firebase/config';
import { onAuthStateChanged, signOut, setPersistence, browserSessionPersistence } from 'firebase/auth';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set persistence to SESSION so that auth state is cleared when browser is closed
    setPersistence(auth, browserSessionPersistence)
      .then(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          setCurrentUser(user);
          setLoading(false);
        });
        return unsubscribe;
      })
      .catch((error) => {
        console.error("Auth persistence error:", error);
        setLoading(false);
      });

    // Clear auth state when component unmounts
    return () => {
      setCurrentUser(null);
    };
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null); // Explicitly clear the user state
      // Clear any stored auth data
      localStorage.removeItem('firebase:authUser');
      sessionStorage.removeItem('firebase:authUser');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const value = {
    currentUser,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
} 