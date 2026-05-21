import { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import type { ItemCategory, PaymentCategory } from './App';
import type { Transaction } from './TransactionsTable';
import { formatDateToYYYYMMDD, parseYYYYMMDDToLocalDate } from './dateUtils';

interface EditTransactionFormProps {
  show: boolean;
  onHide: () => void;
  itemCategories: ItemCategory[];
  paymentCategories: PaymentCategory[];
  onUpdateTransaction: (updatedTransaction: Transaction) => void;
  userId: string;
  transaction: Transaction;
}

const EditTransactionForm: React.FC<EditTransactionFormProps> = ({ show, onHide, itemCategories, paymentCategories, onUpdateTransaction, userId, transaction }) => {
  const [formData, setFormData] = useState<Partial<Transaction>>(transaction);

  useEffect(() => {
    if (show) {
      setFormData(transaction);
    }
  }, [show, transaction]);

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
    if (!formData.item_name || formData.amount === undefined) {
      alert('請填寫項目名稱和金額');
      return;
    }

    const updatedTransaction = { ...transaction, ...formData };

    try {
      const response = await fetch(`/api/transactions/${updatedTransaction.transaction_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...updatedTransaction,
          amount: Number(updatedTransaction.amount),
          item_category_id: Number(updatedTransaction.item_category_id),
          payment_category_id: Number(updatedTransaction.payment_category_id),
          user_id: Number(userId),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update transaction');
      }

      const newItemCategory = itemCategories.find(c => c.id === Number(updatedTransaction.item_category_id))?.name || null;
      const newPaymentCategory = paymentCategories.find(c => c.id === Number(updatedTransaction.payment_category_id))?.name || null;

      onUpdateTransaction({
        ...updatedTransaction,
        item_category: newItemCategory,
        payment_category: newPaymentCategory
      } as Transaction);

      onHide(); // Close modal on success
    } catch (error) {
      console.error('Save failed:', error);
      alert('儲存失敗');
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
                <h5 className="modal-title">編輯交易</h5>
                <button type="button" className="btn-close" onClick={onHide}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">日期</label>
                  <DatePicker
                    selected={parseYYYYMMDDToLocalDate(formData.transaction_date || formatDateToYYYYMMDD(new Date()))}
                    onChange={handleDateChange}
                    dateFormat="yyyy-MM-dd"
                    className="form-control"
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">項目名稱</label>
                  <input type="text" name="item_name" value={formData.item_name || ''} onChange={handleInputChange} className="form-control" required />
                </div>
                <div className="mb-3">
                  <label className="form-label">金額</label>
                  <input type="number" name="amount" value={formData.amount || ''} onChange={handleInputChange} onFocus={(e) => e.target.select()} className="form-control" required />
                </div>
                <div className="mb-3">
                  <label className="form-label">項目類別</label>
                  <select name="item_category_id" value={formData.item_category_id || ''} onChange={handleInputChange} className="form-select" required>
                    {itemCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">支付類別</label>
                  <select name="payment_category_id" value={formData.payment_category_id || ''} onChange={handleInputChange} className="form-select" required>
                    {paymentCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">備註</label>
                  <input type="text" name="notes" value={formData.notes || ''} onChange={handleInputChange} className="form-control" />
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

export default EditTransactionForm;
