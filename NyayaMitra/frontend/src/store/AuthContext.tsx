// Auth context — Firebase authentication for NyayaMitra
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  sendPasswordResetEmail,
  type User,
} from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db, googleProvider, githubProvider } from '@/lib/firebase'

export interface UserProfile {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
  phone: string | null
  state: string
  language: string
  createdAt: unknown
  lastLoginAt: unknown
  provider: string
}

interface AuthContextType {
  user: User | null
  userProfile: UserProfile | null
  loading: boolean
  error: string | null
  signUp: (email: string, password: string, displayName: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signInWithGithub: () => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

// Save/update user profile in Firestore
async function upsertUserProfile(user: User, provider: string) {
  const ref = doc(db, 'users', user.uid)
  const snap = await getDoc(ref)

  if (snap.exists()) {
    await setDoc(ref, { lastLoginAt: serverTimestamp() }, { merge: true })
  } else {
    const profile: UserProfile = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      phone: user.phoneNumber,
      state: 'Central',
      language: 'en',
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
      provider,
    }
    await setDoc(ref, profile)
  }
}

async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const snap = await getDoc(doc(db, 'users', uid))
    return snap.exists() ? (snap.data() as UserProfile) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser) {
        const profile = await fetchUserProfile(firebaseUser.uid)
        setUserProfile(profile)
      } else {
        setUserProfile(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  const clearError = () => setError(null)

  const signUp = async (email: string, password: string, displayName: string) => {
    setError(null)
    try {
      const { user: newUser } = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(newUser, { displayName })
      await upsertUserProfile(newUser, 'email')
      const profile = await fetchUserProfile(newUser.uid)
      setUserProfile(profile)
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string }
      if (err.code === 'auth/email-already-in-use') setError('An account with this email already exists')
      else if (err.code === 'auth/weak-password') setError('Password must be at least 6 characters')
      else if (err.code === 'auth/invalid-email') setError('Invalid email address')
      else setError(err.message || 'Sign up failed')
      throw e
    }
  }

  const signIn = async (email: string, password: string) => {
    setError(null)
    try {
      const { user: u } = await signInWithEmailAndPassword(auth, email, password)
      await upsertUserProfile(u, 'email')
      const profile = await fetchUserProfile(u.uid)
      setUserProfile(profile)
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string }
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Invalid email or password')
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many attempts. Please try again later')
      } else {
        setError(err.message || 'Sign in failed')
      }
      throw e
    }
  }

  const signInWithGoogle = async () => {
    setError(null)
    try {
      const { user: u } = await signInWithPopup(auth, googleProvider)
      await upsertUserProfile(u, 'google')
      const profile = await fetchUserProfile(u.uid)
      setUserProfile(profile)
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string }
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(err.message || 'Google sign-in failed')
      }
      throw e
    }
  }

  const signInWithGithub = async () => {
    setError(null)
    try {
      const { user: u } = await signInWithPopup(auth, githubProvider)
      await upsertUserProfile(u, 'github')
      const profile = await fetchUserProfile(u.uid)
      setUserProfile(profile)
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string }
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(err.message || 'GitHub sign-in failed')
      }
      throw e
    }
  }

  const signOut = async () => {
    await firebaseSignOut(auth)
    setUserProfile(null)
  }

  const resetPassword = async (email: string) => {
    setError(null)
    try {
      await sendPasswordResetEmail(auth, email)
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string }
      if (err.code === 'auth/user-not-found') setError('No account found with this email')
      else setError(err.message || 'Password reset failed')
      throw e
    }
  }

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, error, signUp, signIn, signInWithGoogle, signInWithGithub, signOut, resetPassword, clearError }}>
      {children}
    </AuthContext.Provider>
  )
}
