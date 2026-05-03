import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getLoans, applyForLoan, rejectLoan } from '../services/api';

const LoansPage = () => {
  const { user } = useAuth();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [applyForm, setApplyForm] = useState({ amount: '', purpose: '' });
  const [showApplyForm, setShowApplyForm] = useState(false);

  useEffect(() => {
    loadLoans();
  }, []);

  const loadLoans = async () => {
    setLoading(true);
    try {
      const response = await getLoans();
      setLoans(response.data.loans || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to load loans');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyChange = (event) => {
    setApplyForm({ ...applyForm, [event.target.name]: event.target.value });
  };

  const handleApplySubmit = async (event) => {
    event.preventDefault();
    setError(null);
    try {
      await applyForLoan(applyForm);
      setApplyForm({ amount: '', purpose: '' });
      setShowApplyForm(false);
      loadLoans();
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to apply for loan');
    }
  };

  const handleReject = async (loanId) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;
    setError(null);
    try {
      await rejectLoan(loanId, reason);
      loadLoans();
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to reject loan');
    }
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p className="error">{error}</p>;

  return (
    <div>
      <h1 className="page-title">My Loans</h1>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2>Loan Applications</h2>
          <button
            type="button"
            className="primary"
            onClick={() => setShowApplyForm(!showApplyForm)}
          >
            {showApplyForm ? 'Cancel' : 'Apply for Loan'}
          </button>
        </div>

        {showApplyForm && (
          <form className="form-grid" onSubmit={handleApplySubmit} style={{ marginBottom: 24 }}>
            <label>
              Amount
              <input
                name="amount"
                type="number"
                value={applyForm.amount}
                onChange={handleApplyChange}
                required
                min="1"
              />
            </label>
            <label>
              Purpose
              <textarea
                name="purpose"
                value={applyForm.purpose}
                onChange={handleApplyChange}
                required
                placeholder="Describe the purpose of the loan"
              />
            </label>
            <button type="submit" className="primary">
              Submit Application
            </button>
          </form>
        )}

        {loans.length === 0 ? (
          <p>No loan applications found.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Amount</th>
                <th>Purpose</th>
                <th>Status</th>
                <th>Applied Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loans.map((loan) => (
                <tr key={loan.id}>
                  <td>{loan.amount}</td>
                  <td>{loan.purpose}</td>
                  <td>{loan.status}</td>
                  <td>{new Date(loan.created_at).toLocaleDateString()}</td>
                  <td>
                    {loan.status === 'pending' && (
                      <button
                        type="button"
                        className="danger"
                        onClick={() => handleReject(loan.id)}
                      >
                        Reject
                      </button>
                    )}
                    {loan.rejection_reason && (
                      <span title={loan.rejection_reason}>Rejected</span>
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
};

export default LoansPage;