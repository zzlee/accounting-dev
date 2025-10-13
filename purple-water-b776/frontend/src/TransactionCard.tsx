import { useState } from 'react';
import type { Transaction } from './TransactionsTable';
import type { ItemCategory, PaymentCategory } from './App';
import DatePicker from 'react-datepicker';

interface TransactionCardProps {
	transaction: Transaction;
	itemCategories: ItemCategory[];
	paymentCategories: PaymentCategory[];
	onUpdateTransaction: (updatedTransaction: Transaction) => void;
	onDeleteTransaction: (transactionId: number) => void;
}

const TransactionCard: React.FC<TransactionCardProps> = ({ transaction, itemCategories, paymentCategories, onUpdateTransaction, onDeleteTransaction }) => {
	const [isEditing, setIsEditing] = useState(false);
	const [editFormData, setEditFormData] = useState<Partial<Transaction>>(transaction);

	const handleEditClick = () => {
		setEditFormData(transaction);
		setIsEditing(true);
	};

	const handleCancelClick = () => {
		setIsEditing(false);
	};

	const handleSaveClick = async () => {
		if (!editFormData) return;

		try {
			const response = await fetch(`/api/transactions/${transaction.transaction_id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					...editFormData,
					item_category_id: Number(editFormData.item_category_id),
					payment_category_id: Number(editFormData.payment_category_id),
				}),
			});

			if (!response.ok) throw new Error('Failed to update transaction');

			const newItemCategory = itemCategories.find(c => c.id === Number(editFormData.item_category_id))?.name || null;
			const newPaymentCategory = paymentCategories.find(c => c.id === Number(editFormData.payment_category_id))?.name || null;

			onUpdateTransaction({ 
				...transaction, 
				...editFormData, 
				item_category: newItemCategory,
				payment_category: newPaymentCategory
			} as Transaction);

			setIsEditing(false);
		} catch (error) {
			console.error('Save failed:', error);
		}
	};

	const handleDeleteClick = async () => {
		if (!window.confirm('您確定要刪除這筆交易嗎？')) {
			return;
		}

		try {
			const response = await fetch(`/api/transactions/${transaction.transaction_id}`, {
				method: 'DELETE',
			});

			if (!response.ok) {
				throw new Error('Failed to delete transaction');
			}

			onDeleteTransaction(transaction.transaction_id);
		} catch (error) {
			console.error('Delete failed:', error);
			alert('刪除失敗');
		}
	};

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
		const { name, value } = e.target;
		setEditFormData({ ...editFormData, [name]: value });
	};

	const handleDateChange = (date: Date | null) => {
		if (date) {
			const formattedDate = date.toISOString().split('T')[0];
			setEditFormData({ ...editFormData, transaction_date: formattedDate });
		}
	};

	const formatCurrency = (amount: number) =>
		new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', minimumFractionDigits: 0 }).format(amount);

	if (isEditing) {
		return (
			<div className="card mb-2 border-primary">
				<div className="card-body p-3">
					{/* Form fields... */}
					<div className="mb-2"><label className="form-label">項目名稱</label><input type="text" name="item_name" defaultValue={editFormData.item_name} onChange={handleInputChange} className="form-control form-control-sm" /></div>
					<div className="mb-2"><label className="form-label">金額</label><input type="number" name="amount" defaultValue={editFormData.amount} onChange={handleInputChange} className="form-control form-control-sm" /></div>
					<div className="mb-2"><label className="form-label">日期</label><DatePicker selected={new Date(editFormData.transaction_date || new Date())} onChange={handleDateChange} dateFormat="yyyy-MM-dd" className="form-control form-control-sm" /></div>
					<div className="mb-2"><label className="form-label">項目類別</label><select name="item_category_id" defaultValue={editFormData.item_category_id} onChange={handleInputChange} className="form-select form-select-sm">{itemCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}</select></div>
					<div className="mb-2"><label className="form-label">支付類別</label><select name="payment_category_id" defaultValue={editFormData.payment_category_id} onChange={handleInputChange} className="form-select form-select-sm">{paymentCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}</select></div>
					<div className="mb-3"><label className="form-label">備註</label><input type="text" name="notes" defaultValue={editFormData.notes || ''} onChange={handleInputChange} className="form-control form-control-sm" /></div>
					
					<div>
						<button className="btn btn-sm btn-success me-2" onClick={handleSaveClick}>儲存</button>
						<button className="btn btn-sm btn-secondary" onClick={handleCancelClick}>取消</button>
					</div>
				</div>
			</div>
		);
	}

	const amountColor = transaction.amount > 0 ? 'text-danger' : 'text-success';
	const borderClass = transaction.amount > 0 ? 'border-danger-subtle' : 'border-success-subtle';

	return (
		<div className={`card mb-2 ${borderClass}`}>
			<div className="card-body p-3">
				<div className="d-flex justify-content-between">
					<div className="me-3">
						<h5 className="card-title mb-1">{transaction.item_name}</h5>
						<h6 className="card-subtitle text-muted">{transaction.item_category || '未分類'}</h6>
					</div>
					<div className={`text-end fs-5 fw-bold ${amountColor}`}>{formatCurrency(transaction.amount)}</div>
				</div>
				<div className="mt-2 pt-2 border-top d-flex justify-content-between align-items-center text-muted small">
					<div>
						<div>{transaction.payment_category || 'N/A'}</div>
						{transaction.notes && <div className="text-muted fst-italic">{transaction.notes}</div>}
					</div>
					<div className="btn-group">
						<button className="btn btn-sm btn-outline-primary" onClick={handleEditClick}>編輯</button>
						<button className="btn btn-sm btn-outline-danger" onClick={handleDeleteClick}>刪除</button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default TransactionCard;
