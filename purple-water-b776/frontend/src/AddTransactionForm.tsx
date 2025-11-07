import { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import type { ItemCategory, PaymentCategory } from './App';
import type { Transaction } from './TransactionsTable';

interface AddTransactionFormProps {
  show: boolean;
  onHide: () => void;
  itemCategories: ItemCategory[];
  paymentCategories: PaymentCategory[];
  onAddTransaction: (newTransaction: Transaction) => void;
}

const formatDateToYYYYMMDD = (date: Date) => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const AddTransactionForm: React.FC<AddTransactionFormProps> = ({ show, onHide, itemCategories, paymentCategories, onAddTransaction }) => {
  const getInitialFormData = () => ({
    transaction_date: new Date().toISOString().split('T')[0],
    item_name: '',
    amount: 0,
    item_category_id: itemCategories[0]?.id || 0,
    payment_category_id: paymentCategories[0]?.id || 0,
    notes: '',
  });

  const [formData, setFormData] = useState(getInitialFormData());

  useEffect(() => {
    // Reset form when categories are loaded or modal is shown
    if (show) {
      setFormData(getInitialFormData());
    }
  }, [show, itemCategories, paymentCategories]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (date: Date | null) => {
    if (date) {
      setFormData(prev => ({ ...prev, transaction_date: formatDateToYYYYMMDD(date) }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.item_name || !formData.amount) {
      alert('請填寫項目名稱和金額');
      return;
    }

    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          amount: Number(formData.amount),
          item_category_id: Number(formData.item_category_id),
          payment_category_id: Number(formData.payment_category_id),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add transaction');
      }

      const newTransaction = await response.json();
      onAddTransaction(newTransaction as Transaction);
      onHide(); // Close modal on success
    } catch (error) {
      console.error('Failed to add transaction:', error);
      alert('新增失敗');
    }
  };

  if (!show) {
    return null;
  }

  return (
    <>
      <div className="modal-backdrop fade show"></div>
      <div className="modal fade show d-block" tabIndex={-1}>
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <form onSubmit={handleSubmit}>
              <div className="modal-header">
                <h5 className="modal-title">新增交易</h5>
                <button type="button" className="btn-close" onClick={onHide}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">日期</label>
                  <DatePicker
                    selected={new Date(formData.transaction_date)}
                    onChange={handleDateChange}
                    dateFormat="yyyy-MM-dd"
                    className="form-control"
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">項目名稱</label>
                  <input type="text" name="item_name" value={formData.item_name} onChange={handleInputChange} className="form-control" required />
                </div>
                <div className="mb-3">
                  <label className="form-label">金額</label>
                  <input type="number" name="amount" value={formData.amount} onChange={handleInputChange} onFocus={(e) => e.target.select()} className="form-control" required />
                </div>
                <div className="mb-3">
                  <label className="form-label">項目類別</label>
                  <select name="item_category_id" value={formData.item_category_id} onChange={handleInputChange} className="form-select" required>
                    {itemCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">支付類別</label>
                  <select name="payment_category_id" value={formData.payment_category_id} onChange={handleInputChange} className="form-select" required>
                    {paymentCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">備註</label>
                  <input type="text" name="notes" value={formData.notes} onChange={handleInputChange} className="form-control" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={onHide}>取消</button>
                <button type="submit" className="btn btn-primary">儲存</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default AddTransactionForm;
