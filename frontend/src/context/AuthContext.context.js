// Kept in its own file so that AuthContext.jsx only exports React components
// and hooks — a requirement for Vite Fast Refresh to work correctly.
// Mixing a raw context object export with component exports breaks HMR and
// causes full page reloads on every save.
import { createContext } from 'react';

export const AuthContext = createContext(undefined);
