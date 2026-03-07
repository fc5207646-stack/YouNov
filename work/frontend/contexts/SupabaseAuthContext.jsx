
// This file is deprecated. Please use src/contexts/SupabaseAuthContext.jsx instead.
// We are keeping this file as a placeholder to prevent import errors if it is referenced elsewhere,
// but it simply re-exports the correct context.

export * from '../src/contexts/SupabaseAuthContext';
export { AuthProvider, useAuth } from '../src/contexts/SupabaseAuthContext';
