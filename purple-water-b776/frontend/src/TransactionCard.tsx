import type { Transaction } from './TransactionsTable';
import { FaTrash } from 'react-icons/fa';
import { formatDateForDisplay } from './dateUtils';

interface TransactionCardProps {
	onEditTransaction: (transaction: Transaction) => void;
	transaction: Transaction;
	onDeleteTransaction: (transactionId: number) => void;
	userId: string;
}

const TransactionCard: React.FC<TransactionCardProps> = ({ transaction, onDeleteTransaction, userId, onEditTransaction }) => {	const handleDeleteClick = async () => {
		if (!window.confirm('您確定要刪除這筆交易嗎？')) {
			return;
		}

		try {
			const response = await fetch(`/api/transactions/${transaction.transaction_id}?user_id=${userId}`, {
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

	const formatCurrency = (amount: number) =>
		new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', minimumFractionDigits: 0 }).format(amount);
	const amountColor = transaction.amount > 0 ? 'text-danger' : 'text-success';
	const borderClass = transaction.amount > 0 ? 'border-danger-subtle' : 'border-success-subtle';

	return (
		<div className={`card mb-2 ${borderClass}`}>
			<div className="card-body p-3">
				<div className="d-flex justify-content-between align-items-start" onClick={() => onEditTransaction(transaction)} style={{ cursor: 'pointer' }}>
					<div className="me-3 flex-grow-1">
						<h5 className="card-title mb-1">{transaction.item_name}</h5>
						<h6 className="card-subtitle text-muted">{transaction.item_category || '未分類'}</h6>
					</div>
					<div className="text-end">
						<div className={`fs-5 fw-bold ${amountColor}`}>{formatCurrency(transaction.amount)}</div>
						<div className="text-muted small">{formatDateForDisplay(transaction.transaction_date)}</div>
					</div>
				</div>
				<div className="mt-2 pt-2 border-top d-flex justify-content-between align-items-center text-muted small">
					<div>
						<div>{transaction.payment_category || 'N/A'}</div>
						{transaction.notes && <div className="text-muted fst-italic">{transaction.notes}</div>}
					</div>
					<div className="btn-group">
						<button className="btn btn-sm btn-outline-danger" onClick={(e) => { e.stopPropagation(); handleDeleteClick(); }}><FaTrash /></button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default TransactionCard;
