import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import LoginPage from './pages/Login';
import RegisterPage from './pages/Register';
import DashboardPage from './pages/Dashboard';
import AccountsPage from './pages/Accounts';
import TransactionsPage from './pages/Transactions';
import LoansPage from './pages/Loans';
import ProfilePage from './pages/Profile';
import AdminPage from './pages/Admin';
import NotFoundPage from './pages/NotFound';

const ProtectedRoute = ({ children }) => {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
};

const AdminRoute = ({ children }) => {
  const { token, user } = useAuth();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  return children;
};

const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path) => location.pathname === path ? 'active' : '';

  return (
    <nav className="top-navbar">
      <Link to="/" className="brand">🏦 Banking System</Link>
      <div className="nav-menu">
        {user?.role === 'admin' ? (
          <Link to="/admin" className={isActive('/admin')}>Admin Panel</Link>
        ) : (
          <Link to="/" className={isActive('/')}>Dashboard</Link>
        )}
        {user?.role === 'customer' && (
          <>
            <Link to="/accounts" className={isActive('/accounts')}>Accounts</Link>
            <Link to="/transactions" className={isActive('/transactions')}>Transactions</Link>
            <Link to="/loans" className={isActive('/loans')}>Loans</Link>
          </>
        )}
        <Link to="/profile" className={isActive('/profile')}>Profile</Link>
        <button type="button" className="secondary" onClick={logout}>
          Sign out
        </button>
      </div>
    </nav>
  );
};

function App() {
  const { token, user } = useAuth();

  return (
    <div className="app-shell">
      {token && <Navbar />}
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              {user?.role === 'admin' ? <Navigate to="/admin" replace /> : <DashboardPage />}
            </ProtectedRoute>
          }
        />
        <Route
          path="/accounts"
          element={
            <ProtectedRoute>
              <AccountsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/transactions"
          element={
            <ProtectedRoute>
              <TransactionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/loans"
          element={
            <ProtectedRoute>
              <LoansPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminPage />
            </AdminRoute>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  );
}

export default App;
