import { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { TransactionsTable } from './TransactionsTable';
import type { Transaction } from './TransactionsTable';
import TransactionCard from './TransactionCard';
import { FaChevronLeft, FaChevronRight, FaPlus, FaCog, FaFilter, FaSearch } from 'react-icons/fa';

const AddTransactionForm = lazy(() => import('./AddTransactionForm'));
const CategoryManager = lazy(() => import('./CategoryManager'));

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
	const [showCategoryModal, setShowCategoryModal] = useState(false);
	const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<number>>(new Set());
	const [searchTerm, setSearchTerm] = useState('');
	const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

	// Debounce search term
	useEffect(() => {
		const handler = setTimeout(() => {
			setDebouncedSearchTerm(searchTerm);
		}, 300); // 300ms delay

		return () => {
			clearTimeout(handler);
		};
	}, [searchTerm]);

	// Fetch transactions
	useEffect(() => {
		const year = currentDate.getFullYear();
		const month = currentDate.getMonth() + 1;
		const params = new URLSearchParams({
			year: year.toString(),
			month: month.toString(),
		});

		if (debouncedSearchTerm) {
			params.append('search', debouncedSearchTerm);
		}

		const apiUrl = `/api/transactions?${params.toString()}`;

		setIsLoading(true);
		fetch(apiUrl)
			.then(res => {
				if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
				return res.json();
			})
			.then(responseData => {
				setData(responseData as Transaction[]);
				// Reset category filter when month or search term changes, but not on initial load if there's a search term
				if (selectedCategoryIds.size > 0) {
					setSelectedCategoryIds(new Set());
				}
			})
			.catch(err => {
				setError(err as Error);
				setData([]); // Clear data on error
			})
			.finally(() => setIsLoading(false));
	}, [currentDate, debouncedSearchTerm]);

	// Fetch categories on initial load
	useEffect(() => {
		Promise.all([fetch('/api/item-categories').then(res => res.json()), fetch('/api/payment-categories').then(res => res.json())])
			.then(([itemCats, paymentCats]) => {
				setItemCategories(itemCats as ItemCategory[]);
				setPaymentCategories(paymentCats as PaymentCategory[]);
			})
			.catch(err => {
				console.error('Failed to fetch categories:', err);
				setError(err as Error);
			});
	}, []);

	const handleCategoryFilterChange = (categoryId: number) => {
		setSelectedCategoryIds(prev => {
			const newSet = new Set(prev);
			if (newSet.has(categoryId)) {
				newSet.delete(categoryId);
			} else {
				newSet.add(categoryId);
			}
			return newSet;
		});
	};

	const filteredData = useMemo(() => {
		if (selectedCategoryIds.size === 0) {
			return data;
		}
		return data.filter(transaction => selectedCategoryIds.has(transaction.item_category_id));
	}, [data, selectedCategoryIds]);

	const monthlySummary = useMemo<MonthlySummary>(() => {
		const summary = filteredData.reduce(
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
	}, [filteredData]);

	const changeMonth = (monthDelta: number) => {
		setCurrentDate(prevDate => {
			const newDate = new Date(prevDate);
			newDate.setMonth(newDate.getMonth() + monthDelta);
			return newDate;
		});
		// Reset filters and search when changing month
		setSearchTerm('');
		setSelectedCategoryIds(new Set());
	};

	const handlePrevMonth = () => changeMonth(-1);
	const handleNextMonth = () => changeMonth(1);

	const handleUpdateTransaction = (updatedTransaction: Transaction) => {
		setData(currentData => currentData.map(t => (t.transaction_id === updatedTransaction.transaction_id ? updatedTransaction : t)));
	};

	const handleAddTransaction = (newTransaction: Transaction) => {
		// Add to local state and re-sort
		setData(currentData =>
			[...currentData, newTransaction].sort(
				(a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime() || b.transaction_id - a.transaction_id
			)
		);
	};

	const handleDeleteTransaction = (transactionId: number) => {
		setData(currentData => currentData.filter(t => t.transaction_id !== transactionId));
	};

	const formatCurrency = (amount: number) =>
		new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', minimumFractionDigits: 0 }).format(amount);

	const formattedMonth = new Intl.DateTimeFormat('zh-TW', { year: 'numeric', month: 'long' }).format(currentDate);

	const suspenseFallback = (
		<div
			className="position-fixed top-0 start-0 vh-100 vw-100 d-flex justify-content-center align-items-center bg-dark bg-opacity-50"
			style={{ zIndex: 1055 }}
		>
			<div className="spinner-border text-light" role="status">
				<span className="visually-hidden">Loading...</span>
			</div>
		</div>
	);

	const getNoDataMessage = () => {
		if (debouncedSearchTerm) return '沒有符合搜尋條件的交易紀錄。';
		if (selectedCategoryIds.size > 0) return '沒有符合篩選條件的交易紀錄。';
		return '這個月沒有交易紀錄。';
	}

	return (
		<div className="container my-4">
			<header className="d-flex justify-content-between align-items-center mb-4 gap-3">
				<h1 className="display-5 mb-0 text-nowrap">交易紀錄</h1>
				<div className="input-group w-100" style={{ maxWidth: '400px' }}>
					<input
						type="text"
						className="form-control"
						placeholder="搜尋項目名稱或備註..."
						value={searchTerm}
						onChange={e => setSearchTerm(e.target.value)}
					/>
					<span className="input-group-text">
						<FaSearch />
					</span>
				</div>
				<div className="btn-group">
					<button className="btn btn-outline-secondary" title="新增交易" onClick={() => setShowAddModal(true)}>
						<FaPlus />
					</button>
					<button className="btn btn-outline-secondary" title="管理類別" onClick={() => setShowCategoryModal(true)}>
						<FaCog />
					</button>
					<div className="dropdown btn-group" role="group">
						<button
							className={`btn ${selectedCategoryIds.size > 0 ? 'btn-primary' : 'btn-outline-secondary'}`}
							type="button"
							id="categoryFilterDropdown"
							data-bs-toggle="dropdown"
							data-bs-auto-close="outside"
							aria-expanded="false"
							title="篩選項目類別"
						>
							<FaFilter />
						</button>
						<ul className="dropdown-menu dropdown-menu-end" aria-labelledby="categoryFilterDropdown">
							<li>
								<a
									className="dropdown-item"
									href="#"
									onClick={e => {
										e.preventDefault();
										setSelectedCategoryIds(new Set());
									}}
								>
									全部顯示
								</a>
							</li>
							<li>
								<hr className="dropdown-divider" />
							</li>
							{itemCategories.map(cat => (
								<li key={cat.id}>
									<label htmlFor={`filter-check-${cat.id}`} className="dropdown-item d-flex align-items-center gap-2">
										<input
											className="form-check-input m-0"
											type="checkbox"
											id={`filter-check-${cat.id}`}
											checked={selectedCategoryIds.has(cat.id)}
											onChange={() => handleCategoryFilterChange(cat.id)}
										/>
										{cat.name}
									</label>
								</li>
							))}
						</ul>
					</div>
				</div>
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
						<div>
							<small className="text-muted">收入</small>
							<div className="fs-5 text-success">{formatCurrency(monthlySummary.income)}</div>
						</div>
						<div>
							<small className="text-muted">支出</small>
							<div className="fs-5 text-danger">{formatCurrency(monthlySummary.expense)}</div>
						</div>
						<div>
							<small className="text-muted">淨額</small>
							<div className="fs-5">{formatCurrency(monthlySummary.net)}</div>
						</div>
					</div>
				</div>

				{isLoading && (
					<div className="text-center p-5">
						<div className="spinner-border" role="status">
							<span className="visually-hidden">Loading...</span>
						</div>
					</div>
				)}
				{error && <div className="alert alert-danger">Error fetching data: {error.message}</div>}
				{!isLoading && !error && filteredData.length > 0 && (
					<>
						{/* Desktop Table View */}
						<div className="d-none d-lg-block">
							<div className="card">
								<div className="card-body p-0">
									<TransactionsTable
										data={filteredData}
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
							{filteredData.map(tx => (
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
				{!isLoading && !error && filteredData.length === 0 && (
					<div className="text-center p-5 border rounded bg-white">
						<p className="text-muted mb-0">{getNoDataMessage()}</p>
					</div>
				)}
			</main>

			<footer className="text-center text-muted mt-4">
				<p>Accounting App &copy; 2025</p>
			</footer>

			<Suspense fallback={suspenseFallback}>
				{showAddModal && (
					<AddTransactionForm
						show={showAddModal}
						onHide={() => setShowAddModal(false)}
						itemCategories={itemCategories}
						paymentCategories={paymentCategories}
						onAddTransaction={handleAddTransaction}
					/>
				)}

				{showCategoryModal && (
					<CategoryManager
						show={showCategoryModal}
						onHide={() => setShowCategoryModal(false)}
						itemCategories={itemCategories}
						paymentCategories={paymentCategories}
						setItemCategories={setItemCategories}
						setPaymentCategories={setPaymentCategories}
					/>
				)}
			</Suspense>
		</div>
	);
}

export default App;
