import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getProfile, updateProfile, getProfileActivity } from '../services/api';

const ProfilePage = () => {
  const { user: authUser, updateUser } = useAuth();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [activity, setActivity] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', address: '', dob: '', otp_enabled: true });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([getProfile(), getProfileActivity()])
      .then(([profileRes, activityRes]) => {
        setUser(profileRes.data.user);
        setProfile(profileRes.data.profile);
        setForm({
          name: profileRes.data.user.name || '',
          email: profileRes.data.user.email || '',
          password: '',
          phone: profileRes.data.profile?.phone || '',
          address: profileRes.data.profile?.address || '',
          dob: profileRes.data.profile?.dob || '',
          otp_enabled: profileRes.data.user.otp_enabled ?? true
        });
        setActivity(activityRes.data.activity || []);
      })
      .catch((err) => setError(err.response?.data?.error || 'Unable to load profile'))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      const response = await updateProfile(form);
      setUser(response.data.user);
      updateUser(response.data.user);
      setProfile(response.data.profile);
      setSuccess('Profile updated successfully');
      setForm({ ...form, password: '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to update profile');
    }
  };

  return (
    <div className="page-container">
      <div className="navbar">
        <div>
          <h1 className="page-title">My Profile</h1>
          <p className="text-muted">Manage your account details and review recent activity.</p>
        </div>
      </div>

      {loading && <p>Loading profile…</p>}
      {error && <div className="alert">{error}</div>}
      {success && <div className="alert-success">{success}</div>}

      {!loading && user && (
        <div className="row">
          <div className="card" style={{ flex: 2 }}>
            <h2 className="page-title">Profile details</h2>
            <form className="form-grid" onSubmit={handleSubmit}>
              <label>
                Name
                <input name="name" value={form.name} onChange={handleChange} required />
              </label>
              <label>
                Email
                <input name="email" type="email" value={form.email} onChange={handleChange} required />
              </label>
              <label>
                Password
                <input name="password" type="password" value={form.password} onChange={handleChange} placeholder="Leave blank to keep current" />
              </label>
              {user.role === 'customer' && (
                <>
                  <label>
                    Phone
                    <input name="phone" value={form.phone} onChange={handleChange} />
                  </label>
                  <label>
                    Address
                    <input name="address" value={form.address} onChange={handleChange} />
                  </label>
                  <label>
                    Date of birth
                    <input name="dob" type="date" value={form.dob || ''} onChange={handleChange} />
                  </label>
                </>
              )}
              <div style={{
                marginTop: 24,
                padding: '20px 24px',
                borderRadius: 14,
                background: form.otp_enabled
                  ? 'rgba(16, 185, 129, 0.08)'
                  : 'rgba(239, 68, 68, 0.08)',
                border: `1px solid ${form.otp_enabled ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                transition: 'all 0.3s ease'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <span style={{ fontSize: '1.3rem' }}>{form.otp_enabled ? '🔒' : '🔓'}</span>
                      <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                        Transaction OTP Verification
                      </strong>
                      <span style={{
                        padding: '3px 10px',
                        borderRadius: 20,
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        background: form.otp_enabled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: form.otp_enabled ? '#6ee7b7' : '#fca5a5',
                        border: `1px solid ${form.otp_enabled ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                      }}>
                        {form.otp_enabled ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.5 }}>
                      {form.otp_enabled
                        ? 'A 6-digit code will be required before every transfer, deposit, and withdrawal for maximum security.'
                        : 'Transactions will process instantly without verification. Enable OTP for better security.'}
                    </p>
                  </div>
                  {/* Toggle Switch */}
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, otp_enabled: !form.otp_enabled })}
                    style={{
                      width: 52,
                      height: 28,
                      borderRadius: 14,
                      border: 'none',
                      cursor: 'pointer',
                      position: 'relative',
                      flexShrink: 0,
                      background: form.otp_enabled
                        ? 'linear-gradient(135deg, #10b981, #059669)'
                        : 'rgba(100, 116, 139, 0.4)',
                      transition: 'background 0.3s ease',
                      padding: 0,
                    }}
                  >
                    <span style={{
                      position: 'absolute',
                      top: 3,
                      left: form.otp_enabled ? 27 : 3,
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: '#fff',
                      transition: 'left 0.3s ease',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                    }} />
                  </button>
                </div>
              </div>
              <div style={{ marginTop: 24 }}>
                <button type="submit" className="primary">
                  Save profile
                </button>
              </div>
            </form>
          </div>

          <div className="card" style={{ flex: 1 }}>
            <h2 className="page-title">Recent activity</h2>
            {activity.length === 0 ? (
              <p>No recent activity recorded.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {activity.map((entry) => (
                  <li key={entry.id} style={{ marginBottom: 12, borderBottom: '1px solid var(--card-border)', paddingBottom: 10 }}>
                    <strong>{entry.action.replace('transaction.', '').replace('profile.', '').replace(/_/g, ' ')}</strong>
                    <p className="text-muted" style={{ margin: '6px 0 0' }}>{entry.description || 'No details available'}</p>
                    <div className="text-muted" style={{ fontSize: '0.9rem', marginTop: 6 }}>
                      {new Date(entry.created_at).toLocaleString()}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
