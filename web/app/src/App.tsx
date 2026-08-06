/**
 * Route Table
 *
 * Two routes: /login is public, / requires a session. Anything else lands
 * on / and gets guarded from there.
 *
 * Used by: main.tsx
 */
import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth } from '@/components/RequireAuth';
import { HomePage } from '@/routes/HomePage';
import { LoginPage } from '@/routes/LoginPage';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <HomePage />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}