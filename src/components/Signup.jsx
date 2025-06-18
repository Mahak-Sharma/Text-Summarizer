import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import './Auth.css';

const Signup = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const getErrorMessage = (error) => {
    switch (error.code) {
      case 'auth/email-already-in-use':
        return 'This email is already registered. Please try logging in instead.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters long.';
      case 'auth/operation-not-allowed':
        return 'Email/password accounts are not enabled. Please contact support.';
      case 'permission-denied':
        return 'Unable to create user profile. Please try again later.';
      default:
        return 'An error occurred during signup. Please try again.';
    }
  };

  const createUserProfile = async (user) => {
    try {
      const userRef = doc(db, 'users', user.uid);
      const userData = {
        name,
        email,
        createdAt: serverTimestamp(),
        summaries: [],
        lastLogin: serverTimestamp()
      };

      console.log('Creating user profile for:', user.uid);
      await setDoc(userRef, userData);
      console.log('User profile created successfully');
      return true;
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate password length
      if (password.length < 6) {
        throw new Error('Password should be at least 6 characters long.');
      }

      // Create user with email and password
      console.log('Creating user with email:', email);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log('User created successfully:', user.uid);

      // Create user document in Firestore
      try {
        await createUserProfile(user);
        console.log('User profile created, signing out and redirecting to login');
        // Sign out the user after successful signup
        await auth.signOut();
        // Show success message and redirect to login
        setError('Signup successful! Please login to continue.');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } catch (firestoreError) {
        console.error('Firestore error:', firestoreError);
        // If Firestore write fails, sign out the user and show error
        await auth.signOut();
        setError('Failed to create user profile. Please try again.');
      }
    } catch (error) {
      console.error('Signup error:', error);
      const errorMessage = getErrorMessage(error);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2>Sign Up</h2>
        {error && (
          <div className={`message ${error.includes('successful') ? 'success-message' : 'error-message'}`}>
            {error}
            {error.includes('already registered') && (
              <button 
                className="auth-link-button"
                onClick={() => navigate('/login')}
              >
                Go to Login
              </button>
            )}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
              placeholder="Enter your name"
            />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              placeholder="Enter your email"
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              minLength={6}
              placeholder="Enter your password"
            />
          </div>
          <button 
            type="submit" 
            className="auth-button"
            disabled={loading}
          >
            {loading ? 'Signing Up...' : 'Sign Up'}
          </button>
        </form>
        <p className="auth-switch">
          Already have an account? <span onClick={() => navigate('/login')}>Login</span>
        </p>
      </div>
    </div>
  );
};

export default Signup; 