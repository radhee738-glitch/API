import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getLoans, applyForLoan } from '../services/api';

const formatCurrency = (amount, currency = 'PKR') => {
  const num = parseFloat(amount);
  if (isNaN(num)) return '—';
  return `${currency} ${num.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const LoansPage = () => {
  const { user } = useAuth();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [applyForm, setApplyForm] = useState({ amount: '', purpose: '', incomeSource: '', debts: '', justification: '' });
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
    setSuccess(null);
    try {
      const questionnaire = {
        incomeSource: applyForm.incomeSource,
        debts: applyForm.debts,
        justification: applyForm.justification
      };
      await applyForLoan({ ...applyForm, questionnaire });
      setApplyForm({ amount: '', purpose: '', incomeSource: '', debts: '', justification: '' });
      setShowApplyForm(false);
      setSuccess('Loan application submitted successfully!');
      loadLoans();
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to apply for loan');
    }
  };

  if (loading) return <div className="page-container"><p>Loading...</p></div>;

  return (
    <div className="page-container">
      <h1 className="page-title">My Loans</h1>

      {error && <div className="alert">{error}</div>}
      {success && <div className="alert-success">{success}</div>}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>Loan Applications</h2>
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
              Purpose (Brief)
              <input
                name="purpose"
                value={applyForm.purpose}
                onChange={handleApplyChange}
                required
                placeholder="e.g. Home Renovation"
              />
            </label>
            <div style={{ gridColumn: '1 / -1' }}>
              <h3 style={{ marginTop: 16, borderBottom: '1px solid var(--card-border)', paddingBottom: 8 }}>Verification Questionnaire</h3>
            </div>
            <label>
              What is your primary source of income?
              <input
                name="incomeSource"
                value={applyForm.incomeSource}
                onChange={handleApplyChange}
                required
                placeholder="e.g. Salary, Business"
              />
            </label>
            <label>
              Do you have any existing financial obligations?
              <input
                name="debts"
                value={applyForm.debts}
                onChange={handleApplyChange}
                required
                placeholder="e.g. None, Car Loan"
              />
            </label>
            <label style={{ gridColumn: '1 / -1' }}>
              Provide a detailed justification for this loan request.
              <textarea
                name="justification"
                value={applyForm.justification}
                onChange={handleApplyChange}
                required
                placeholder="Explain why you need this loan and how you plan to repay it."
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
                <th>Term</th>
                <th>Rate</th>
                <th>Status</th>
                <th>Applied Date</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {loans.map((loan) => (
                <tr key={loan.id}>
                  <td className="currency">{formatCurrency(loan.amount)}</td>
                  <td>{loan.purpose || '-'}</td>
                  <td>{loan.term_months} months</td>
                  <td>{loan.interest_rate}%</td>
                  <td>
                    <span className={`status-badge ${loan.status}`}>{loan.status}</span>
                  </td>
                  <td>{new Date(loan.created_at).toLocaleDateString()}</td>
                  <td>
                    {loan.rejection_reason && (
                      <span className="text-muted" title={loan.rejection_reason} style={{ cursor: 'help' }}>
                        ⓘ {loan.rejection_reason}
                      </span>
                    )}
                    {loan.questionnaire && (
                      <span className="text-muted" title={JSON.stringify(loan.questionnaire, null, 2)} style={{ cursor: 'help', marginLeft: 8 }}>
                        📋 Form Data
                      </span>
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