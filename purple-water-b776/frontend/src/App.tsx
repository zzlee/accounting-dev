import { useState, useEffect, useMemo } from 'react';
import { TransactionsTable } from './TransactionsTable';
import type { Transaction } from './TransactionsTable';
import TransactionCard from './TransactionCard';
import AddTransactionForm from './AddTransactionForm';
import { FaChevronLeft, FaChevronRight, FaPlus } from 'react-icons/fa';

// Define types for the categories
export interface ItemCategory {
	id: number;
	name: string;
}

export interface PaymentCategory {
	id: number;
	name: string;
}

interface MonthlySummary {
	income: number;
	expense: number;
	net: number;
}

function App() {
	const [data, setData] = useState<Transaction[]>([]);
	const [currentDate, setCurrentDate] = useState(new Date());
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [error, setError] = useState<Error | null>(null);
	const [itemCategories, setItemCategories] = useState<ItemCategory[]>([]);
	const [paymentCategories, setPaymentCategories] = useState<PaymentCategory[]>([]);
	const [showAddModal, setShowAddModal] = useState(false);

	// Fetch transactions
	useEffect(() => {
		const year = currentDate.getFullYear();
		const month = currentDate.getMonth() + 1;
		const apiUrl = `/api/transactions?year=${year}&month=${month}`;

		setIsLoading(true);
		fetch(apiUrl)
			.then((res) => {
				if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
				return res.json();
			})
			.then((responseData) => setData(responseData as Transaction[]))
			.catch((err) => {
				setError(err as Error);
				setData([]); // Clear data on error
			})
			.finally(() => setIsLoading(false));
	}, [currentDate]);

	// Fetch categories on initial load
	useEffect(() => {
		Promise.all([
			fetch('/api/item-categories').then(res => res.json()),
			fetch('/api/payment-categories').then(res => res.json())
		])
		.then(([itemCats, paymentCats]) => {
			setItemCategories(itemCats as ItemCategory[]);
			setPaymentCategories(paymentCats as PaymentCategory[]);
		})
		.catch(err => {
			console.error("Failed to fetch categories:", err);
			setError(err as Error);
		});
	}, []);

	const monthlySummary = useMemo<MonthlySummary>(() => {
		const summary = data.reduce(
			(acc, transaction) => {
				if (transaction.amount < 0) {
					acc.income += -transaction.amount;
				} else {
					acc.expense += transaction.amount;
				}
				return acc;
			},
			{ income: 0, expense: 0, net: 0 }
		);

		summary.net = summary.income - summary.expense;
		return summary;
	}, [data]);

	const handlePrevMonth = () => {
		setCurrentDate((prevDate) => {
			const newDate = new Date(prevDate);
			newDate.setMonth(newDate.getMonth() - 1);
			return newDate;
		});
	};

	const handleNextMonth = () => {
		setCurrentDate((prevDate) => {
			const newDate = new Date(prevDate);
			newDate.setMonth(newDate.getMonth() + 1);
			return newDate;
		});
	};

	const handleUpdateTransaction = (updatedTransaction: Transaction) => {
		setData(currentData => 
			currentData.map(t => 
				t.transaction_id === updatedTransaction.transaction_id ? updatedTransaction : t
			)
		);
	};

	const handleAddTransaction = (newTransaction: Transaction) => {
    // Add to local state and re-sort
		setData(currentData => 
			[...currentData, newTransaction]
				.sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime() || b.transaction_id - a.transaction_id)
		);
	};

	const handleDeleteTransaction = (transactionId: number) => {
		setData(currentData => currentData.filter(t => t.transaction_id !== transactionId));
	};

	const formatCurrency = (amount: number) =>
		new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', minimumFractionDigits: 0 }).format(amount);

	const formattedMonth = new Intl.DateTimeFormat('zh-TW', { year: 'numeric', month: 'long' }).format(currentDate);

	return (
		<div className="container my-4">
			<header className="d-flex justify-content-between align-items-center mb-4">
				<h1 className="display-5">交易紀錄</h1>
				<button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
					<FaPlus className="me-2" />新增交易
				</button>
			</header>

			<main>
				<div className="d-flex justify-content-between align-items-center p-3 rounded bg-light mb-3">
					<button className="btn btn-outline-secondary" onClick={handlePrevMonth}>
						<FaChevronLeft /> 上個月
					</button>
					<h2 className="h4 mb-0 text-center">{formattedMonth}</h2>
					<button className="btn btn-outline-secondary" onClick={handleNextMonth}>
						下個月 <FaChevronRight />
					</button>
				</div>

				<div className="p-3 rounded bg-light mb-3">
					<div className="d-flex justify-content-around text-center">
						<div><small className="text-muted">收入</small><div className="fs-5 text-success">{formatCurrency(monthlySummary.income)}</div></div>
						<div><small className="text-muted">支出</small><div className="fs-5 text-danger">{formatCurrency(monthlySummary.expense)}</div></div>
						<div><small className="text-muted">淨額</small><div className="fs-5">{formatCurrency(monthlySummary.net)}</div></div>
					</div>
				</div>

				{isLoading && <div className="text-center p-5"><div className="spinner-border" role="status"><span className="visually-hidden">Loading...</span></div></div>}
				{error && <div className="alert alert-danger">Error fetching data: {error.message}</div>}
				{!isLoading && !error && data.length > 0 && (
					<>
						{/* Desktop Table View */}
						<div className="d-none d-lg-block">
							<div className="card">
								<div className="card-body p-0">
									<TransactionsTable 
										data={data} 
										itemCategories={itemCategories}
										paymentCategories={paymentCategories}
										onUpdateTransaction={handleUpdateTransaction}
										onDeleteTransaction={handleDeleteTransaction}
									/>
								</div>
							</div>
						</div>

						{/* Mobile Card List View */}
						<div className="d-block d-lg-none">
							{data.map((tx) => (
								<TransactionCard 
									key={tx.transaction_id} 
									transaction={tx} 
									itemCategories={itemCategories}
									paymentCategories={paymentCategories}
									onUpdateTransaction={handleUpdateTransaction}
									onDeleteTransaction={handleDeleteTransaction}
								/>
							))}
						</div>
					</>
				)}
        {!isLoading && !error && data.length === 0 && (
          <div className="text-center p-5 border rounded bg-white">
            <p className="text-muted mb-0">這個月沒有交易紀錄。</p>
          </div>
        )}
			</main>

			<footer className="text-center text-muted mt-4">
				<p>Accounting App &copy; 2025</p>
			</footer>

			<AddTransactionForm 
				show={showAddModal}
				onHide={() => setShowAddModal(false)}
				itemCategories={itemCategories}
				paymentCategories={paymentCategories}
				onAddTransaction={handleAddTransaction}
			/>
		</div>
	);
}

export default App;
