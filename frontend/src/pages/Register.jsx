import { useState } from 'react';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const RegisterPage = () => {
  const { register, error, loading, setError } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    cnic: '',
    phone: '',
    address: '',
    dob: ''
  });
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (event) => {
    setError(null);
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await register({ ...form, role: 'customer' });
      navigate('/');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="page-container">
      <div className="card" style={{ maxWidth: 640, margin: '0 auto' }}>
        <h1 className="page-title">Create a Banking Account</h1>
        {error && <div className="alert">{error}</div>}
        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            Full name
            <input name="name" type="text" value={form.name} onChange={handleChange} required />
          </label>
          <label>
            Email
            <input name="email" type="email" value={form.email} onChange={handleChange} required />
          </label>
          <label style={{ position: 'relative' }}>
            Password
            <input
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={handleChange}
              required
            />
            <button
              type="button"
              className="password-toggle-button"
              onClick={() => setShowPassword((value) => !value)}
              tabIndex={-1}
            >
              {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
            </button>
          </label>
          <label>
            CNIC
            <input name="cnic" type="text" value={form.cnic} onChange={handleChange} required />
          </label>
          <label>
            Phone
            <input name="phone" type="text" value={form.phone} onChange={handleChange} />
          </label>
          <label>
            Address
            <input name="address" type="text" value={form.address} onChange={handleChange} />
          </label>
          <label>
            Date of Birth
            <input name="dob" type="date" value={form.dob} onChange={handleChange} />
          </label>
          <button type="submit" className="primary" disabled={loading}>
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>
        <p style={{ marginTop: 16 }}>
          Already have an account? <Link to="/login" style={{ color: '#818cf8' }}>Log in</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
