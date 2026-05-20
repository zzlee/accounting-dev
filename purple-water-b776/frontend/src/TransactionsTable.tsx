import { useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table';
import type { ColumnDef } from '@tanstack/react-table';
import { FaTrash } from 'react-icons/fa';
import type { ItemCategory, PaymentCategory } from './App'; // Import category types
import { formatDateForDisplay } from './dateUtils';

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
	onEditTransaction: (transaction: Transaction) => void;
	data: Transaction[];
	itemCategories: ItemCategory[];
	paymentCategories: PaymentCategory[];
	onDeleteTransaction: (transactionId: number) => void;
	userId: string;
}

export const TransactionsTable: React.FC<TransactionsTableProps> = ({
	data,
	itemCategories,
	paymentCategories,
	onDeleteTransaction,
	userId,
	onEditTransaction
}) => {


	const handleDeleteClick = async (transactionId: number) => {
		if (!window.confirm('您確定要刪除這筆交易嗎？')) {
			return;
		}

		try {
			const response = await fetch(`/api/transactions/${transactionId}?user_id=${userId}`, {
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

	const columns: ColumnDef<Transaction>[] = [
		// ... (other columns remain the same)
		{
			accessorKey: 'transaction_date',
			header: '日期',
			cell: ({ row }) => formatDateForDisplay(row.original.transaction_date),
		},
		{
			accessorKey: 'item_name',
			header: '項目名稱',
			cell: ({ row }) => (
				<div onClick={() => onEditTransaction(row.original)} style={{ cursor: 'pointer' }}>
					{row.original.item_name}
				</div>
			),
		},
		{
			accessorKey: 'item_category_id',
			header: '項目類別',
			cell: ({ row }) => row.original.item_category || 'N/A',
		},
		{
			accessorKey: 'amount',
			header: '金額',
			cell: ({ row }) => {
				const amount = row.original.amount;
				const amountColor = amount > 0 ? 'text-danger' : 'text-success';
				const formattedAmount = new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', minimumFractionDigits: 0 }).format(amount);

				return (
					<span className={amountColor}>
						{formattedAmount}
					</span>
				);
			},
		},
		{
			accessorKey: 'payment_category_id',
			header: '支付類別',
			cell: ({ row }) => row.original.payment_category || 'N/A',
		},
		{
			accessorKey: 'notes',
			header: '備註',
			cell: ({ row }) => row.original.notes,
		},
		{
			id: 'actions',
			header: '操作',
			cell: ({ row }) => (
				<>
					<button className="btn btn-sm btn-outline-primary me-1" onClick={() => onEditTransaction(row.original)}>
						編輯
					</button>
					<button className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteClick(row.original.transaction_id)}>
						<FaTrash />
					</button>
				</>
			),
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
