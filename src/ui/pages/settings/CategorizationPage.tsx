import { useEffect, useState } from 'react';
import { MdCategory, MdAdd, MdEdit, MdDelete, MdApps } from 'react-icons/md';

interface Category {
  description: string;
  color: string;
  apps: string[];
  isCustom?: boolean;
}

const CategorizationPage = () => {
  const [categories, setCategories] = useState<{ [key: string]: Category }>({});
  const [detectedApps, setDetectedApps] = useState<string[]>([]);
  const [appOverrides, setAppOverrides] = useState<{ [appName: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: '', description: '', color: '#007bff' });

  // Helper function to get the current category of an app
  const getAppCategory = (appName: string): string => {
    // First check if there's a manual override
    if (appOverrides[appName]) {
      return appOverrides[appName];
    }
    
    // Otherwise find which category this app belongs to
    for (const [categoryId, category] of Object.entries(categories)) {
      if (category.apps.includes(appName)) {
        return categoryId;
      }
    }
    
    return 'miscellaneous'; // fallback
  };

  const loadCategories = async () => {
    try {
      const [categoriesResult, settingsResult] = await Promise.all([
        window.electronAPI.getAppCategories(),
        window.electronAPI.getUserCategorySettings()
      ]);

      if (categoriesResult.success && categoriesResult.data) {
        setCategories(categoriesResult.data.categories);
        setDetectedApps(categoriesResult.data.detectedApps);
      }

      if (settingsResult.success && settingsResult.data) {
        setAppOverrides(settingsResult.data.appCategoryOverrides);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategory.name.trim() || !newCategory.description.trim()) {
      alert('Please fill in all fields');
      return;
    }

    try {
      const result = await window.electronAPI.createCustomCategory(
        newCategory.name,
        newCategory.description,
        newCategory.color
      );

      if (result.success) {
        setNewCategory({ name: '', description: '', color: '#007bff' });
        setShowNewCategoryForm(false);
        await loadCategories();
      } else {
        alert(result.error || 'Failed to create category');
      }
    } catch (error) {
      console.error('Error creating category:', error);
      alert('Failed to create category. Please try again.');
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (confirm(`Are you sure you want to delete the category "${categoryId}"?`)) {
      try {
        const result = await window.electronAPI.deleteCustomCategory(categoryId);
        if (result.success) {
          await loadCategories();
        } else {
          alert(result.error || 'Failed to delete category');
        }
      } catch (error) {
        console.error('Error deleting category:', error);
        alert('Failed to delete category. Please try again.');
      }
    }
  };

  const handleAssignApp = async (appName: string, categoryId: string) => {
    try {
      const result = await window.electronAPI.assignAppToCategory(appName, categoryId);
      if (result.success) {
        await loadCategories();
      } else {
        alert(result.error || 'Failed to assign app to category');
      }
    } catch (error) {
      console.error('Error assigning app:', error);
      alert('Failed to assign app. Please try again.');
    }
  };

  const handleRemoveAppAssignment = async (appName: string) => {
    try {
      const result = await window.electronAPI.removeAppCategoryAssignment(appName);
      if (result.success) {
        await loadCategories();
      } else {
        alert(result.error || 'Failed to remove app assignment');
      }
    } catch (error) {
      console.error('Error removing app assignment:', error);
      alert('Failed to remove app assignment. Please try again.');
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  if (loading) {
    return (
      <div style={{ 
        padding: '20px', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        height: '200px'
      }}>
        <p style={{ color: 'white' }}>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0, color: 'white' }}>App Categorization</h3>
        <button
          onClick={() => setShowNewCategoryForm(!showNewCategoryForm)}
          style={{
            padding: '8px 16px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontWeight: '500'
          }}
        >
          <MdAdd size={16} />
          New Category
        </button>
      </div>

      {/* New Category Form */}
      {showNewCategoryForm && (
        <div style={{ 
          backgroundColor: '#0a0a0a', 
          padding: '20px', 
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          marginBottom: '20px'
        }}>
          <h4 style={{ color: 'white', marginBottom: '15px' }}>Create New Category</h4>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '12px', marginBottom: '15px' }}>
            <input
              type="text"
              placeholder="Category Name"
              value={newCategory.name}
              onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
              style={{
                padding: '8px 12px',
                backgroundColor: '#1a1a1a',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
            <input
              type="text"
              placeholder="Description"
              value={newCategory.description}
              onChange={(e) => setNewCategory({...newCategory, description: e.target.value})}
              style={{
                padding: '8px 12px',
                backgroundColor: '#1a1a1a',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
            <input
              type="color"
              value={newCategory.color}
              onChange={(e) => setNewCategory({...newCategory, color: e.target.value})}
              style={{
                width: '50px',
                height: '38px',
                backgroundColor: '#1a1a1a',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            />
          </div>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleCreateCategory}
              style={{
                padding: '8px 16px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Create
            </button>
            <button
              onClick={() => setShowNewCategoryForm(false)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#666',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Categories List */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', 
        gap: '20px',
        marginBottom: '30px'
      }}>
        {Object.entries(categories).map(([categoryId, category]) => (
          <div key={categoryId} style={{ 
            backgroundColor: '#0a0a0a', 
            padding: '15px', 
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ 
                  width: '20px', 
                  height: '20px', 
                  backgroundColor: category.color, 
                  borderRadius: '4px' 
                }}></div>
                <h5 style={{ color: 'white', margin: 0 }}>{categoryId}</h5>
              </div>
              {category.isCustom && (
                <button
                  onClick={() => handleDeleteCategory(categoryId)}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#f44336',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  <MdDelete size={14} />
                </button>
              )}
            </div>
            
            <p style={{ color: '#aaa', fontSize: '14px', marginBottom: '10px' }}>
              {category.description}
            </p>
            
            <div style={{ fontSize: '12px', color: '#666' }}>
              {category.apps.length} apps assigned
            </div>
          </div>
        ))}
      </div>

      {/* Detected Apps */}
      <div style={{ 
        backgroundColor: '#0a0a0a', 
        padding: '20px', 
        borderRadius: '8px',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <h4 style={{ color: 'white', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MdApps size={20} />
          Detected Applications ({detectedApps.length})
        </h4>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
          gap: '10px',
          maxHeight: '400px',
          overflowY: 'auto'
        }}>
          {detectedApps.map(app => (
            <div key={app} style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: '8px 12px',
              backgroundColor: '#1a1a1a',
              borderRadius: '4px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <span style={{ color: 'white', fontSize: '14px' }}>{app}</span>
              <div style={{ display: 'flex', gap: '5px' }}>
                <select
                  value={appOverrides[app] || ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAssignApp(app, e.target.value);
                    } else {
                      handleRemoveAppAssignment(app);
                    }
                  }}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#2a2a2a',
                    color: 'white',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}
                >
                  <option value="">Auto-detect ({getAppCategory(app)})</option>
                  {Object.keys(categories).map(categoryId => (
                    <option key={categoryId} value={categoryId}>
                      {categoryId}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CategorizationPage;
