import { Link } from 'react-router-dom';

const NotFoundPage = () => {
  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
      <h1 style={{ fontSize: '4rem', margin: 0, background: 'linear-gradient(to right, #818cf8, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>404</h1>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '16px' }}>Page Not Found</h2>
      <p className="text-muted" style={{ maxWidth: '400px', marginBottom: '32px' }}>
        The page you are looking for doesn't exist or has been moved.
      </p>
      <Link to="/">
        <button className="primary">Return to Dashboard</button>
      </Link>
    </div>
  );
};

export default NotFoundPage;
