import { useState } from 'react';
import { useReactTable, getCoreRowModel, flexRender, type Row } from '@tanstack/react-table';
import type { ColumnDef } from '@tanstack/react-table';
import DatePicker from 'react-datepicker';
import type { ItemCategory, PaymentCategory } from './App'; // Import category types

// The shape of our data needs to include the IDs for the categories
export interface Transaction {
	transaction_id: number;
	transaction_date: string;
	item_name: string;
	item_category: string | null;
	payment_category: string | null;
	amount: number;
	notes: string | null;
	item_category_id: number;
	payment_category_id: number;
}

interface TransactionsTableProps {
	data: Transaction[];
	itemCategories: ItemCategory[];
	paymentCategories: PaymentCategory[];
	onUpdateTransaction: (updatedTransaction: Transaction) => void;
	onDeleteTransaction: (transactionId: number) => void;
}

export const TransactionsTable: React.FC<TransactionsTableProps> = ({ 
	data, 
	itemCategories, 
	paymentCategories, 
	onUpdateTransaction, 
	onDeleteTransaction
}) => {
	const [editingRowId, setEditingRowId] = useState<number | null>(null);
	const [editFormData, setEditFormData] = useState<Partial<Transaction> | null>(null);

	const handleEditClick = (row: Row<Transaction>) => {
		setEditingRowId(row.original.transaction_id);
		setEditFormData(row.original);
	};

	const handleCancelClick = () => {
		setEditingRowId(null);
		setEditFormData(null);
	};

	const handleSaveClick = async (row: Row<Transaction>) => {
		if (!editFormData) return;

		const updatedTransaction = { ...row.original, ...editFormData };

		try {
			const response = await fetch(`/api/transactions/${updatedTransaction.transaction_id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					...updatedTransaction,
					item_category_id: Number(updatedTransaction.item_category_id),
					payment_category_id: Number(updatedTransaction.payment_category_id),
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

			setEditingRowId(null);
			setEditFormData(null);
		} catch (error) {
			console.error('Save failed:', error);
		}
	};

	const handleDeleteClick = async (transactionId: number) => {
		if (!window.confirm('您確定要刪除這筆交易嗎？')) {
			return;
		}

		try {
			const response = await fetch(`/api/transactions/${transactionId}`, {
				method: 'DELETE',
			});

			if (!response.ok) {
				throw new Error('Failed to delete transaction');
			}

			onDeleteTransaction(transactionId);
		} catch (error) {
			console.error('Delete failed:', error);
			alert('刪除失敗');
		}
	};

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
		if (!editFormData) return;
		const { name, value } = e.target;
		setEditFormData({ ...editFormData, [name]: value });
	};

	const handleDateChange = (date: Date | null) => {
		if (date) {
			const formattedDate = date.toISOString().split('T')[0];
			setEditFormData({ ...editFormData, transaction_date: formattedDate });
		}
	};

	const columns: ColumnDef<Transaction>[] = [
		// ... (other columns remain the same)
		{
			accessorKey: 'transaction_date',
			header: '日期',
			cell: ({ row }) => {
				const isEditing = editingRowId === row.original.transaction_id;
				return isEditing && editFormData ? (
					<DatePicker 
						selected={new Date(editFormData.transaction_date || new Date())}
						onChange={handleDateChange}
						dateFormat="yyyy-MM-dd"
						className="form-control form-control-sm"
					/>
				) : (
					new Date(row.original.transaction_date).toLocaleDateString()
				);
			},
		},
		{
			accessorKey: 'item_name',
			header: '項目名稱',
			cell: ({ row }) => {
				const isEditing = editingRowId === row.original.transaction_id;
				return isEditing && editFormData ? (
					<input 
						type="text"
						name="item_name"
						defaultValue={editFormData.item_name}
						onChange={handleInputChange}
						className="form-control form-control-sm"
					/>
				) : (
					row.original.item_name
				);
			},
		},
		{
			accessorKey: 'item_category_id',
			header: '項目類別',
			cell: ({ row }) => {
				const isEditing = editingRowId === row.original.transaction_id;
				return isEditing && editFormData ? (
					<select
						name="item_category_id"
						defaultValue={editFormData.item_category_id}
						onChange={handleInputChange}
						className="form-select form-select-sm"
					>
						{itemCategories.map(cat => (
							<option key={cat.id} value={cat.id}>{cat.name}</option>
						))}
					</select>
				) : (
					row.original.item_category || 'N/A'
				);
			},
		},
		{
			accessorKey: 'amount',
			header: '金額',
			cell: ({ row }) => {
				const isEditing = editingRowId === row.original.transaction_id;
				return isEditing && editFormData ? (
					<input 
						type="number"
						name="amount"
						defaultValue={editFormData.amount}
						onChange={handleInputChange}
						className="form-control form-control-sm"
					/>
				) : (
					new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', minimumFractionDigits: 0 }).format(row.original.amount)
				);
			},
		},
		{
			accessorKey: 'payment_category_id',
			header: '支付類別',
			cell: ({ row }) => {
				const isEditing = editingRowId === row.original.transaction_id;
				return isEditing && editFormData ? (
					<select
						name="payment_category_id"
						defaultValue={editFormData.payment_category_id}
						onChange={handleInputChange}
						className="form-select form-select-sm"
					>
						{paymentCategories.map(cat => (
							<option key={cat.id} value={cat.id}>{cat.name}</option>
						))}
					</select>
				) : (
					row.original.payment_category || 'N/A'
				);
			},
		},
		{
			accessorKey: 'notes',
			header: '備註',
			cell: ({ row }) => {
				const isEditing = editingRowId === row.original.transaction_id;
				return isEditing && editFormData ? (
					<input 
						type="text"
						name="notes"
						defaultValue={editFormData.notes || ''}
						onChange={handleInputChange}
						className="form-control form-control-sm"
					/>
				) : (
					row.original.notes
				);
			},
		},
		{
			id: 'actions',
			header: '操作',
			cell: ({ row }) => {
				const isEditing = editingRowId === row.original.transaction_id;
				return isEditing ? (
					<>
						<button className="btn btn-sm btn-success me-1" onClick={() => handleSaveClick(row)}>儲存</button>
						<button className="btn btn-sm btn-secondary" onClick={handleCancelClick}>取消</button>
					</>
				) : (
					<>
						<button className="btn btn-sm btn-primary me-1" onClick={() => handleEditClick(row)}>編輯</button>
						<button className="btn btn-sm btn-danger" onClick={() => handleDeleteClick(row.original.transaction_id)}>刪除</button>
					</>
				);
			},
		},
	];

	const table = useReactTable({
		data,
		columns,
		getCoreRowModel: getCoreRowModel(),
		meta: {
			itemCategories,
			paymentCategories,
		},
	});

	return (
		<div className="table-responsive">
			<table className="table table-striped table-hover table-sm mb-0">
				<thead className="table-dark">
					{table.getHeaderGroups().map((headerGroup) => (
						<tr key={headerGroup.id}>
							{headerGroup.headers.map((header) => (
								<th key={header.id}>
									{flexRender(header.column.columnDef.header, header.getContext())}
								</th>
							))}
						</tr>
					))}
				</thead>
				<tbody>
					{table.getRowModel().rows.map((row) => (
						<tr key={row.id}>
							{row.getVisibleCells().map((cell) => (
								<td key={cell.id}>
									{flexRender(cell.column.columnDef.cell, cell.getContext())}
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
};