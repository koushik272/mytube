import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured } from '../firebase/config';
import { createOrGetUserProfile, syncUserPreferencesToFirestore } from '../firebase/firestore';
import { UserProfile, AuthModalMode } from '../types/user';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  authError: string | null;
  setAuthError: (err: string | null) => void;
  isAuthModalOpen: boolean;
  authModalMode: AuthModalMode;
  openAuthModal: (mode?: AuthModalMode) => void;
  closeAuthModal: () => void;
  signInWithGoogle: () => Promise<boolean>;
  signInWithEmail: (email: string, pass: string) => Promise<boolean>;
  signUpWithEmail: (name: string, email: string, pass: string) => Promise<boolean>;
  signInWithDemoUser: (preset?: 'koushik' | 'sarah') => Promise<void>;
  logout: () => Promise<void>;
  requireAuth: (action: () => void, promptMessage?: string) => void;
  updatePreferences: (prefs: Partial<Pick<UserProfile, 'likedVideos' | 'watchLaterVideos' | 'subscribedChannels' | 'isHistoryPaused'>>) => Promise<void>;
  isDemoMode: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to format Firebase error codes into human-readable messages
function formatAuthError(error: unknown): string {
  if (!error || typeof error !== 'object') return 'An unexpected error occurred.';
  const code = (error as { code?: string }).code || '';

  switch (code) {
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-disabled':
      return 'This user account has been disabled.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please verify and try again.';
    case 'auth/email-already-in-use':
      return 'An account with this email address already exists. Please log in.';
    case 'auth/weak-password':
      return 'Password is too weak. Please use at least 6 characters.';
    case 'auth/popup-closed-by-user':
      return 'Google sign-in popup was closed before completing.';
    case 'auth/cancelled-popup-request':
      return 'Popup request was cancelled. Please try again.';
    case 'auth/network-request-failed':
      return 'Network connection error. Please check your internet connection.';
    case 'auth/operation-not-allowed':
      return 'This sign-in method is not enabled in Firebase Console.';
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized in Firebase. Add your Vercel domain in Firebase Console > Authentication > Settings > Authorized domains.';
    default:
      return (error as { message?: string }).message || 'Authentication failed. Please try again.';
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode>('login');
  const [promptMessage, setPromptMessage] = useState<string | null>(null);

  const isDemoMode = !isFirebaseConfigured();

  // Load user profile and listen to auth state changes
  useEffect(() => {
    // 1. If real Firebase is initialized
    if (auth && isFirebaseConfigured()) {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        setCurrentUser(user);
        if (user) {
          try {
            const profile = await createOrGetUserProfile(user);
            setUserProfile(profile);
          } catch (err) {
            console.error('Error loading Firestore profile:', err);
          }
        } else {
          setUserProfile(null);
        }
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      // 2. Demo mode: check localStorage for persisted simulated user session
      const savedUser = localStorage.getItem('mytube_simulated_user');
      const savedProfile = localStorage.getItem('mytube_simulated_profile');

      if (savedUser && savedProfile) {
        try {
          setCurrentUser(JSON.parse(savedUser));
          setUserProfile(JSON.parse(savedProfile));
        } catch {
          // ignore
        }
      }
      setLoading(false);
    }
  }, []);

  const openAuthModal = (mode: AuthModalMode = 'login', prompt?: string) => {
    setAuthError(null);
    setAuthModalMode(mode);
    setPromptMessage(prompt || null);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
    setAuthError(null);
    setPromptMessage(null);
  };

  // Google Sign-In
  const signInWithGoogle = async (): Promise<boolean> => {
    setLoading(true);
    setAuthError(null);

    if (auth && isFirebaseConfigured()) {
      try {
        const result = await signInWithPopup(auth, googleProvider);
        const profile = await createOrGetUserProfile(result.user);
        setCurrentUser(result.user);
        setUserProfile(profile);
        closeAuthModal();
        return true;
      } catch (err: unknown) {
        setAuthError(formatAuthError(err));
        return false;
      } finally {
        setLoading(false);
      }
    } else {
      // Demo simulated Google sign-in
      await new Promise((r) => setTimeout(r, 600));
      const simulatedUser: Partial<User> = {
        uid: 'google-user-999',
        displayName: 'Koushik (Google)',
        email: 'koushik@google.com',
        photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
        emailVerified: true,
      };
      const simulatedProfile: UserProfile = {
        uid: 'google-user-999',
        displayName: 'Koushik (Google)',
        email: 'koushik@google.com',
        photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
        handle: '@koushik_google',
        subscribersCount: 1420,
        createdAt: new Date().toISOString(),
        likedVideos: ['vid-1', 'vid-3'],
        watchLaterVideos: ['vid-2'],
        subscribedChannels: ['ch-blender', 'ch-cricket'],
      };

      localStorage.setItem('mytube_simulated_user', JSON.stringify(simulatedUser));
      localStorage.setItem('mytube_simulated_profile', JSON.stringify(simulatedProfile));
      setCurrentUser(simulatedUser as User);
      setUserProfile(simulatedProfile);
      closeAuthModal();
      setLoading(false);
      return true;
    }
  };

  // Email and Password Login
  const signInWithEmail = async (email: string, pass: string): Promise<boolean> => {
    setLoading(true);
    setAuthError(null);

    if (auth && isFirebaseConfigured()) {
      try {
        const result = await signInWithEmailAndPassword(auth, email, pass);
        const profile = await createOrGetUserProfile(result.user);
        setCurrentUser(result.user);
        setUserProfile(profile);
        closeAuthModal();
        return true;
      } catch (err: unknown) {
        setAuthError(formatAuthError(err));
        return false;
      } finally {
        setLoading(false);
      }
    } else {
      // Demo simulated Email login
      await new Promise((r) => setTimeout(r, 500));
      if (!email.includes('@') || pass.length < 6) {
        setAuthError('Please enter a valid email and a password of at least 6 characters.');
        setLoading(false);
        return false;
      }

      const nameFromEmail = email.split('@')[0];
      const displayName = nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1);
      const simulatedUser: Partial<User> = {
        uid: `user-${Date.now()}`,
        displayName,
        email,
        photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}&backgroundColor=e50914`,
        emailVerified: true,
      };
      const simulatedProfile: UserProfile = {
        uid: simulatedUser.uid!,
        displayName,
        email,
        photoURL: simulatedUser.photoURL!,
        handle: `@${nameFromEmail.toLowerCase()}${Math.floor(100 + Math.random() * 900)}`,
        subscribersCount: 0,
        createdAt: new Date().toISOString(),
        likedVideos: ['vid-1'],
        watchLaterVideos: ['vid-3'],
        subscribedChannels: ['ch-code'],
      };

      localStorage.setItem('mytube_simulated_user', JSON.stringify(simulatedUser));
      localStorage.setItem('mytube_simulated_profile', JSON.stringify(simulatedProfile));
      setCurrentUser(simulatedUser as User);
      setUserProfile(simulatedProfile);
      closeAuthModal();
      setLoading(false);
      return true;
    }
  };

  // Email and Password Registration
  const signUpWithEmail = async (name: string, email: string, pass: string): Promise<boolean> => {
    setLoading(true);
    setAuthError(null);

    if (!name.trim()) {
      setAuthError('Please enter your full name or channel name.');
      setLoading(false);
      return false;
    }

    if (auth && isFirebaseConfigured()) {
      try {
        const result = await createUserWithEmailAndPassword(auth, email, pass);
        const defaultPhoto = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=e50914,2563eb`;

        await updateProfile(result.user, {
          displayName: name,
          photoURL: defaultPhoto,
        });

        const profile = await createOrGetUserProfile(result.user, name);
        setCurrentUser(result.user);
        setUserProfile(profile);
        closeAuthModal();
        return true;
      } catch (err: unknown) {
        setAuthError(formatAuthError(err));
        return false;
      } finally {
        setLoading(false);
      }
    } else {
      // Demo simulated signup
      await new Promise((r) => setTimeout(r, 600));
      if (!email.includes('@') || pass.length < 6) {
        setAuthError('Please provide a valid email and a password of at least 6 characters.');
        setLoading(false);
        return false;
      }

      const defaultPhoto = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=e50914,2563eb`;
      const simulatedUser: Partial<User> = {
        uid: `user-${Date.now()}`,
        displayName: name,
        email,
        photoURL: defaultPhoto,
        emailVerified: true,
      };
      const cleanHandle = name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'creator';
      const simulatedProfile: UserProfile = {
        uid: simulatedUser.uid!,
        displayName: name,
        email,
        photoURL: defaultPhoto,
        handle: `@${cleanHandle}${Math.floor(100 + Math.random() * 900)}`,
        subscribersCount: 0,
        createdAt: new Date().toISOString(),
        likedVideos: [],
        watchLaterVideos: [],
        subscribedChannels: [],
      };

      localStorage.setItem('mytube_simulated_user', JSON.stringify(simulatedUser));
      localStorage.setItem('mytube_simulated_profile', JSON.stringify(simulatedProfile));
      setCurrentUser(simulatedUser as User);
      setUserProfile(simulatedProfile);
      closeAuthModal();
      setLoading(false);
      return true;
    }
  };

  // 1-Click Demo User Login for testing
  const signInWithDemoUser = async (preset: 'koushik' | 'sarah' = 'koushik') => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 400));

    const isKoushik = preset === 'koushik';
    const name = isKoushik ? 'Koushik' : 'Sarah Connor';
    const email = isKoushik ? 'koushik@mytube.dev' : 'sarah@mytube.dev';
    const avatar = isKoushik
      ? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80'
      : 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80';

    const simulatedUser: Partial<User> = {
      uid: isKoushik ? 'demo-user-koushik' : 'demo-user-sarah',
      displayName: name,
      email,
      photoURL: avatar,
      emailVerified: true,
    };

    const simulatedProfile: UserProfile = {
      uid: simulatedUser.uid!,
      displayName: name,
      email,
      photoURL: avatar,
      handle: isKoushik ? '@koushik_tube' : '@sarah_creates',
      subscribersCount: isKoushik ? 2500 : 840,
      createdAt: '2026-01-15T10:00:00.000Z',
      likedVideos: ['vid-1', 'vid-3', 'vid-5'],
      watchLaterVideos: ['vid-2', 'vid-4'],
      subscribedChannels: ['ch-blender', 'ch-cricket', 'ch-code'],
    };

    localStorage.setItem('mytube_simulated_user', JSON.stringify(simulatedUser));
    localStorage.setItem('mytube_simulated_profile', JSON.stringify(simulatedProfile));
    setCurrentUser(simulatedUser as User);
    setUserProfile(simulatedProfile);
    closeAuthModal();
    setLoading(false);
  };

  // Sign out / Logout
  const logout = async () => {
    setLoading(true);
    if (auth && isFirebaseConfigured()) {
      try {
        await signOut(auth);
      } catch (err) {
        console.error('Error signing out:', err);
      }
    }
    // Clear both real & simulated state
    localStorage.removeItem('mytube_simulated_user');
    localStorage.removeItem('mytube_simulated_profile');
    setCurrentUser(null);
    setUserProfile(null);
    setLoading(false);
  };

  // Protect user-specific features from unauthorized access
  const requireAuth = (action: () => void, prompt?: string) => {
    if (currentUser) {
      action();
    } else {
      openAuthModal('login', prompt || 'Please sign in to access this feature');
    }
  };

  // Sync user preferences (liked, watch later, subscriptions)
  const updatePreferences = async (
    prefs: Partial<Pick<UserProfile, 'likedVideos' | 'watchLaterVideos' | 'subscribedChannels'>>
  ) => {
    if (!userProfile) return;

    const updatedProfile = { ...userProfile, ...prefs };
    setUserProfile(updatedProfile);

    if (currentUser) {
      await syncUserPreferencesToFirestore(currentUser.uid, prefs);
      if (isDemoMode) {
        localStorage.setItem('mytube_simulated_profile', JSON.stringify(updatedProfile));
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        authError,
        setAuthError,
        isAuthModalOpen,
        authModalMode,
        openAuthModal,
        closeAuthModal,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signInWithDemoUser,
        logout,
        requireAuth,
        updatePreferences,
        isDemoMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
