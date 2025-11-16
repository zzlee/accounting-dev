import { useState } from 'react';
import type { ItemCategory, PaymentCategory } from './App';

interface CategoryManagerProps {
  show: boolean;
  onHide: () => void;
  itemCategories: ItemCategory[];
  paymentCategories: PaymentCategory[];
  setItemCategories: React.Dispatch<React.SetStateAction<ItemCategory[]>>;
  setPaymentCategories: React.Dispatch<React.SetStateAction<PaymentCategory[]>>;
  userId: string;
}

const CategoryManager: React.FC<CategoryManagerProps> = ({
  show,
  onHide,
  itemCategories,
  paymentCategories,
  setItemCategories,
  setPaymentCategories,
  userId
}) => {  const [activeTab, setActiveTab] = useState('item'); // 'item' or 'payment'

  if (!show) {
    return null;
  }

  return (
    <>
      <div className="modal-backdrop fade show"></div>
      <div className="modal fade show d-block" tabIndex={-1}>
        <div className="modal-dialog modal-lg modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">管理類別</h5>
              <button type="button" className="btn-close" onClick={onHide}></button>
            </div>
            <div className="modal-body">
              <ul className="nav nav-tabs">
                <li className="nav-item">
                  <button className={`nav-link ${activeTab === 'item' ? 'active' : ''}`} onClick={() => setActiveTab('item')}>項目類別</button>
                </li>
                <li className="nav-item">
                  <button className={`nav-link ${activeTab === 'payment' ? 'active' : ''}`} onClick={() => setActiveTab('payment')}>支付類別</button>
                </li>
              </ul>
              <div className="tab-content p-3">
                {activeTab === 'item' && (
                  <CategoryEditor 
                    key="item-categories" // Add key to force re-mount on tab change if needed
                    categories={itemCategories} 
                    setCategories={setItemCategories} 
                    apiPath="/api/item-categories"
                    categoryType="項目類別"
                    userId={userId}
                  />
                )}
                {activeTab === 'payment' && (
                  <CategoryEditor 
                    key="payment-categories"
                    categories={paymentCategories} 
                    setCategories={setPaymentCategories} 
                    apiPath="/api/payment-categories"
                    categoryType="支付類別"
                    userId={userId}
                  />
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onHide}>關閉</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// Generic Category Editor Component
interface CategoryEditorProps<T extends { id: number; name: string }> {
  categories: T[];
  setCategories: React.Dispatch<React.SetStateAction<T[]>>;
  apiPath: string;
  categoryType: string;
  userId: string;
}

function CategoryEditor<T extends { id: number; name: string }>({ categories, setCategories, apiPath, categoryType, userId }: CategoryEditorProps<T>) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [newName, setNewName] = useState('');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    try {
      const response = await fetch(apiPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), user_id: Number(userId) }),
      });
      if (!response.ok) throw new Error(`Failed to add ${categoryType}`);
      const addedCategory = await response.json();
      setCategories(prev => [...prev, addedCategory].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName('');
    } catch (error) {
      console.error(error);
      alert(`新增${categoryType}失敗`);
    }
  };

  const handleEdit = (category: T) => {
    setEditingId(category.id);
    setEditingName(category.name);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleSave = async (id: number) => {
    if (!editingName.trim()) return;

    try {
      const response = await fetch(`${apiPath}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingName.trim(), user_id: Number(userId) }),
      });
      if (!response.ok) throw new Error(`Failed to update ${categoryType}`);
      const updatedCategory = await response.json();
      setCategories(prev => prev.map(c => c.id === id ? updatedCategory : c).sort((a, b) => a.name.localeCompare(b.name)));
      handleCancel();
    } catch (error) {
      console.error(error);
      alert(`更新${categoryType}失敗`);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(`您確定要刪除這個${categoryType}嗎？`)) return;

    try {
      const response = await fetch(`${apiPath}/${id}?user_id=${userId}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Failed to delete ${categoryType}`);
      }
      setCategories(prev => prev.filter(c => c.id !== id));
    } catch (error) {
      console.error(error);
      alert(`刪除${categoryType}失敗：${(error as Error).message}`);
    }
  };

  return (
    <div>
      <form onSubmit={handleAdd} className="input-group mb-3">
        <input 
          type="text" 
          className="form-control"
          placeholder={`新增${categoryType}`}
          value={newName} 
          onChange={e => setNewName(e.target.value)} 
        />
        <button className="btn btn-primary" type="submit">新增</button>
      </form>

      <ul className="list-group">
        {categories.map(cat => (
          <li key={cat.id} className="list-group-item d-flex justify-content-between align-items-center">
            {editingId === cat.id ? (
              <input 
                type="text" 
                className="form-control form-control-sm me-2"
                value={editingName}
                onChange={e => setEditingName(e.target.value)}
                autoFocus
              />
            ) : (
              <span>{cat.name}</span>
            )}
            <div>
              {editingId === cat.id ? (
                <>
                  <button className="btn btn-sm btn-success me-1" onClick={() => handleSave(cat.id)}>儲存</button>
                  <button className="btn btn-sm btn-secondary" onClick={handleCancel}>取消</button>
                </>
              ) : (
                <>
                  <button className="btn btn-sm btn-outline-primary me-1" onClick={() => handleEdit(cat)}>編輯</button>
                  <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(cat.id)}>刪除</button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default CategoryManager;
