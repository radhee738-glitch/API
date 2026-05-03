import { useEffect, useState } from 'react';
import { getProfile, updateProfile, getProfileActivity } from '../services/api';

const ProfilePage = () => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [activity, setActivity] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', address: '', dob: '' });
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
          dob: profileRes.data.profile?.dob || ''
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
      {success && <div className="alert" style={{ background: '#e6ffed', color: '#1f6330' }}>{success}</div>}

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
              <button type="submit" className="primary">
                Save profile
              </button>
            </form>
          </div>

          <div className="card" style={{ flex: 1 }}>
            <h2 className="page-title">Recent activity</h2>
            {activity.length === 0 ? (
              <p>No recent activity recorded.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {activity.map((entry) => (
                  <li key={entry.id} style={{ marginBottom: 12, borderBottom: '1px solid #eceff4', paddingBottom: 10 }}>
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
