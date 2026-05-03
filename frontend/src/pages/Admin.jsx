import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  getDashboard,
  getAllLoans,
  getCounters,
  getSecurityStaff,
  getAdminUsers,
  getAdminTransactions,
  approveLoan,
  createSecurityStaff,
  updateSecurityStaff,
  deleteSecurityStaff,
  banUser,
  unbanUser
} from '../services/api';

const sectionLabels = [
  { id: 'overview', label: 'Overview' },
  { id: 'users', label: 'Users' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'counters', label: 'Counters' },
  { id: 'staff', label: 'Security Staff' }
];

const AdminPage = () => {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState('overview');
  const [dashboard, setDashboard] = useState(null);
  const [loans, setLoans] = useState([]);
  const [counters, setCounters] = useState([]);
  const [security, setSecurity] = useState([]);
  const [users, setUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [userTotal, setUserTotal] = useState(0);
  const [transactionSearch, setTransactionSearch] = useState('');
  const [transactionType, setTransactionType] = useState('');
  const [transactionPage, setTransactionPage] = useState(1);
  const [transactionTotal, setTransactionTotal] = useState(0);
  const [staffSearch, setStaffSearch] = useState('');
  const [staffPage, setStaffPage] = useState(1);
  const [staffTotal, setStaffTotal] = useState(0);
  const [staffForm, setStaffForm] = useState({ name: '', cnic: '', phone: '', shift: '', notes: '' });
  const [editingStaff, setEditingStaff] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const userLimit = 8;
  const transactionLimit = 8;

  useEffect(() => {
    setLoading(true);
    Promise.all([getDashboard(), getAllLoans(), getCounters(), getSecurityStaff()])
      .then(([dashboardRes, loansRes, countersRes, securityRes]) => {
        setDashboard(dashboardRes.data);
        setLoans(loansRes.data.loans || []);
        setCounters(countersRes.data.counters || []);
        setSecurity(securityRes.data.staff || []);
      })
      .catch((err) => setError(err.response?.data?.error || 'Unable to load admin data'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (activeSection !== 'users') return;
    const params = { page: userPage, limit: userLimit };
    if (userSearch) params.search = userSearch;

    setLoading(true);
    getAdminUsers(params)
      .then((res) => {
        setUsers(res.data.users);
        setUserTotal(res.data.total || 0);
      })
      .catch((err) => setError(err.response?.data?.error || 'Unable to load users'))
      .finally(() => setLoading(false));
  }, [activeSection, userPage, userSearch]);

  useEffect(() => {
    if (activeSection !== 'transactions') return;
    const params = { page: transactionPage, limit: transactionLimit };
    if (transactionSearch) params.search = transactionSearch;
    if (transactionType) params.type = transactionType;

    setLoading(true);
    getAdminTransactions(params)
      .then((res) => {
        setTransactions(res.data.transactions);
        setTransactionTotal(res.data.total || 0);
      })
      .catch((err) => setError(err.response?.data?.error || 'Unable to load transactions'))
      .finally(() => setLoading(false));
  }, [activeSection, transactionPage, transactionSearch, transactionType]);

  useEffect(() => {
    if (activeSection !== 'staff') return;
    const params = { page: staffPage, limit: userLimit };
    if (staffSearch) params.search = staffSearch;

    setLoading(true);
    getSecurityStaff(params)
      .then((res) => {
        setSecurity(res.data.staff);
        setStaffTotal(res.data.total || 0);
      })
      .catch((err) => setError(err.response?.data?.error || 'Unable to load staff'))
      .finally(() => setLoading(false));
  }, [activeSection, staffPage, staffSearch]);

  const handleApprove = async (loanId) => {
    setError(null);
    try {
      await approveLoan(loanId);
      setLoans((current) => current.map((loan) => (loan.id === loanId ? { ...loan, status: 'approved' } : loan)));
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to approve loan');
    }
  };

  const handleBanUser = async (userId) => {
    const reason = prompt('Enter ban reason:');
    if (!reason) return;
    setError(null);
    try {
      await banUser(userId, reason);
      setUsers((current) => current.map((user) => (user.id === userId ? { ...user, banned: true, ban_reason: reason } : user)));
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to ban user');
    }
  };

  const handleUnbanUser = async (userId) => {
    setError(null);
    try {
      await unbanUser(userId);
      setUsers((current) => current.map((user) => (user.id === userId ? { ...user, banned: false, ban_reason: null } : user)));
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to unban user');
    }
  };

  const handleStaffChange = (event) => {
    setStaffForm({ ...staffForm, [event.target.name]: event.target.value });
  };

  const handleStaffSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    try {
      const response = editingStaff
        ? await updateSecurityStaff(editingStaff.id, staffForm)
        : await createSecurityStaff(staffForm);
      if (editingStaff) {
        setSecurity((current) => current.map((staff) => (staff.id === editingStaff.id ? response.data.staff : staff)));
        setEditingStaff(null);
      } else {
        setSecurity((current) => [...current, response.data.staff]);
      }
      setStaffForm({ name: '', cnic: '', phone: '', shift: '', notes: '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to save staff');
    }
  };

  const handleEditStaff = (staff) => {
    setEditingStaff(staff);
    setStaffForm({ name: staff.name, cnic: staff.cnic || '', phone: staff.phone || '', shift: staff.shift || '', notes: staff.notes || '' });
  };

  const handleDeleteStaff = async (staffId) => {
    if (!confirm('Are you sure you want to delete this staff member?')) return;
    setError(null);
    try {
      await deleteSecurityStaff(staffId);
      setSecurity((current) => current.filter((staff) => staff.id !== staffId));
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to delete staff');
    }
  };

  const totalUserPages = Math.max(1, Math.ceil(userTotal / userLimit));
  const totalTransactionPages = Math.max(1, Math.ceil(transactionTotal / transactionLimit));

  const sectionContent = useMemo(() => {
    if (activeSection === 'users') {
      return (
        <div>
          <div className="table-toolbar">
            <div>
              <label>
                Search users
                <input
                  value={userSearch}
                  onChange={(event) => {
                    setUserSearch(event.target.value);
                    setUserPage(1);
                  }}
                  placeholder="Filter by name, email, CNIC"
                />
              </label>
            </div>
          </div>
          <div className="card">
            <h2 className="page-title">User details</h2>
            {users.length === 0 ? (
              <p>No users found.</p>
            ) : (
              <>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>CNIC</th>
                      <th>Phone</th>
                      <th>Status</th>
                      <th>Banned</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((userRow) => (
                      <tr key={userRow.id}>
                        <td>{userRow.name}</td>
                        <td>{userRow.email}</td>
                        <td>{userRow.role}</td>
                        <td>{userRow.cnic || '-'}</td>
                        <td>{userRow.phone || '-'}</td>
                        <td>{userRow.status || 'customer'}</td>
                        <td>{userRow.banned ? 'Yes' : 'No'}</td>
                        <td>
                          {userRow.banned ? (
                            <button
                              type="button"
                              className="secondary"
                              onClick={() => handleUnbanUser(userRow.id)}
                            >
                              Unban
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="danger"
                              onClick={() => handleBanUser(userRow.id)}
                            >
                              Ban
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="pagination">
                  <button
                    type="button"
                    className="secondary"
                    disabled={userPage <= 1}
                    onClick={() => setUserPage((page) => Math.max(1, page - 1))}
                  >
                    Prev
                  </button>
                  <span>
                    Page {userPage} / {totalUserPages}
                  </span>
                  <button
                    type="button"
                    className="secondary"
                    disabled={userPage >= totalUserPages}
                    onClick={() => setUserPage((page) => Math.min(totalUserPages, page + 1))}
                  >
                    Next
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      );
    }

    if (activeSection === 'transactions') {
      return (
        <div>
          <div className="table-toolbar">
            <label>
              Search transactions
              <input
                value={transactionSearch}
                onChange={(event) => {
                  setTransactionSearch(event.target.value);
                  setTransactionPage(1);
                }}
                placeholder="Filter by account, customer, or description"
              />
            </label>
            <label>
              Type
              <select value={transactionType} onChange={(event) => setTransactionType(event.target.value)}>
                <option value="">All</option>
                <option value="deposit">Deposit</option>
                <option value="withdrawal">Withdrawal</option>
                <option value="transfer-debit">Transfer debit</option>
                <option value="transfer-credit">Transfer credit</option>
              </select>
            </label>
          </div>

          <div className="card">
            <h2 className="page-title">Transaction history</h2>
            {transactions.length === 0 ? (
              <p>No transactions found.</p>
            ) : (
              <>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Account</th>
                      <th>Customer</th>
                      <th>Type</th>
                      <th>Amount</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx.id}>
                        <td>{new Date(tx.created_at).toLocaleString()}</td>
                        <td>{tx.account_number}</td>
                        <td>{tx.customer_name}</td>
                        <td>{tx.type}</td>
                        <td>{tx.amount}</td>
                        <td>{tx.description || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="pagination">
                  <button
                    type="button"
                    className="secondary"
                    disabled={transactionPage <= 1}
                    onClick={() => setTransactionPage((page) => Math.max(1, page - 1))}
                  >
                    Prev
                  </button>
                  <span>
                    Page {transactionPage} / {totalTransactionPages}
                  </span>
                  <button
                    type="button"
                    className="secondary"
                    disabled={transactionPage >= totalTransactionPages}
                    onClick={() => setTransactionPage((page) => Math.min(totalTransactionPages, page + 1))}
                  >
                    Next
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      );
    }

    if (activeSection === 'counters') {
      return (
        <div className="card">
          <h2 className="page-title">Counters</h2>
          {counters.length === 0 ? (
            <p>No counters configured.</p>
          ) : (
            <ul>
              {counters.map((counter) => (
                <li key={counter.id}>
                  {counter.name} – {counter.status} (ticket {counter.current_ticket})
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    }

    if (activeSection === 'staff') {
      const totalStaffPages = Math.max(1, Math.ceil(staffTotal / userLimit));
      return (
        <div>
          <div className="table-toolbar">
            <div>
              <label>
                Search staff
                <input
                  value={staffSearch}
                  onChange={(event) => {
                    setStaffSearch(event.target.value);
                    setStaffPage(1);
                  }}
                  placeholder="Filter by name or email"
                />
              </label>
            </div>
          </div>
          <div className="card">
            <h2 className="page-title">Security staff</h2>
            {security.length === 0 ? (
              <p>No security staff found.</p>
            ) : (
              <>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>CNIC</th>
                      <th>Phone</th>
                      <th>Shift</th>
                      <th>Notes</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {security.map((staff) => (
                      <tr key={staff.id}>
                        <td>{staff.name}</td>
                        <td>{staff.cnic}</td>
                        <td>{staff.phone || '-'}</td>
                        <td>{staff.shift || '-'}</td>
                        <td>{staff.notes || '-'}</td>
                        <td>
                          <button
                            type="button"
                            className="secondary"
                            onClick={() => handleEditStaff(staff)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="danger"
                            onClick={() => handleDeleteStaff(staff.id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="pagination">
                  <button
                    type="button"
                    className="secondary"
                    disabled={staffPage <= 1}
                    onClick={() => setStaffPage((page) => Math.max(1, page - 1))}
                  >
                    Prev
                  </button>
                  <span>
                    Page {staffPage} / {totalStaffPages}
                  </span>
                  <button
                    type="button"
                    className="secondary"
                    disabled={staffPage >= totalStaffPages}
                    onClick={() => setStaffPage((page) => Math.min(totalStaffPages, page + 1))}
                  >
                    Next
                  </button>
                </div>
              </>
            )}
          </div>
          <div className="card" style={{ marginTop: 24 }}>
            <h2 className="page-title">{editingStaff ? 'Edit security staff' : 'Add security staff'}</h2>
            <form className="form-grid" onSubmit={handleStaffSubmit}>
              <label>
                Name
                <input name="name" value={staffForm.name} onChange={handleStaffChange} required />
              </label>
              <label>
                CNIC
                <input name="cnic" value={staffForm.cnic} onChange={handleStaffChange} required />
              </label>
              <label>
                Phone
                <input name="phone" value={staffForm.phone} onChange={handleStaffChange} />
              </label>
              <label>
                Shift
                <select name="shift" value={staffForm.shift} onChange={handleStaffChange}>
                  <option value="">Select shift</option>
                  <option value="Day">Day</option>
                  <option value="Night">Night</option>
                  <option value="Rotating">Rotating</option>
                </select>
              </label>
              <label>
                Notes
                <textarea name="notes" value={staffForm.notes} onChange={handleStaffChange} placeholder="Additional notes" />
              </label>
              <div>
                <button type="submit" className="primary">
                  {editingStaff ? 'Update staff' : 'Create staff'}
                </button>
                {editingStaff && (
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => {
                      setEditingStaff(null);
                      setStaffForm({ name: '', cnic: '', phone: '', shift: '', notes: '' });
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      );
    }

    return (
      <div>
        <div className="row">
          <div className="metric-card">
            <strong>Customers</strong>
            <p>{dashboard?.customers ?? '—'}</p>
          </div>
          <div className="metric-card">
            <strong>Accounts</strong>
            <p>{dashboard?.accounts ?? '—'}</p>
          </div>
          <div className="metric-card">
            <strong>Transactions</strong>
            <p>{dashboard?.transactions ?? '—'}</p>
          </div>
          <div className="metric-card">
            <strong>Loans</strong>
            <p>{dashboard?.loans ?? '—'}</p>
          </div>
          <div className="metric-card">
            <strong>Tickets</strong>
            <p>{dashboard?.tickets ?? '—'}</p>
          </div>
          <div className="metric-card">
            <strong>Security staff</strong>
            <p>{dashboard?.securityStaff ?? '—'}</p>
          </div>
        </div>

        <div className="card" style={{ marginTop: 24 }}>
          <h2 className="page-title" style={{ fontSize: '1.4rem' }}>
            Loan applications
          </h2>
          {loans.length === 0 ? (
            <p>No loan applications found.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Account</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loans.map((loan) => (
                  <tr key={loan.id}>
                    <td>{loan.id}</td>
                    <td>{loan.account_id ?? '-'}</td>
                    <td>{loan.amount}</td>
                    <td>{loan.status}</td>
                    <td>
                      {loan.status !== 'approved' ? (
                        <button className="primary" type="button" onClick={() => handleApprove(loan.id)}>
                          Approve
                        </button>
                      ) : (
                        'Approved'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }, [activeSection, counters, dashboard, loans, security, staffForm, transactionPage, transactionSearch, transactionType, transactions, userPage, userSearch, users, totalTransactionPages, totalUserPages]);

  return (
    <div className="page-container admin-shell">
      <div className="navbar">
        <div>
          <h1 className="page-title">Admin Portal</h1>
          <p className="text-muted">Use the sidebar to view users, transactions, and system data.</p>
        </div>
      </div>

      <div className="admin-grid">
        <aside className="admin-sidebar">
          {sectionLabels.map((section) => (
            <button
              key={section.id}
              type="button"
              className={`sidebar-link ${activeSection === section.id ? 'active' : ''}`}
              onClick={() => setActiveSection(section.id)}
            >
              {section.label}
            </button>
          ))}
        </aside>

        <main className="admin-main">
          {loading ? <p>Loading admin data...</p> : sectionContent}
          {error && <div className="alert">{error}</div>}
        </main>
      </div>
    </div>
  );
};

export default AdminPage;
