import React, { useState, useEffect } from 'react';
import { MdAdd, MdEdit, MdDelete, MdCategory, MdApps, MdRefresh, MdSave, MdCancel, MdSettingsBackupRestore } from 'react-icons/md';
import { IoColorPalette } from 'react-icons/io5';
import styles from './app-category-manager.module.css';

interface AppCategory {
  description: string;
  color: string;
  apps: string[];
  isCustom?: boolean;
}

interface AppCategories {
  detectedApps: string[];
  categories: { [key: string]: AppCategory };
}

interface UserCategorySettings {
  customCategories: { [key: string]: AppCategory };
  appCategoryOverrides: { [appName: string]: string };
}

const AppCategoryManager: React.FC = () => {
  const [categories, setCategories] = useState<AppCategories | null>(null);
  const [userSettings, setUserSettings] = useState<UserCategorySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingCategory, setEditingCategory] = useState<{
    id: string;
    name: string;
    description: string;
    color: string;
    isNew?: boolean;
  } | null>(null);

  const defaultColors = [
    '#A554E8', '#FF9CF5', '#7DD4FF', '#877DFF', '#D178F0', 
    '#9BA8FF', '#B494E8', '#FF6B6B', '#4ECDC4', '#45B7D1',
    '#96CEB4', '#FECA57', '#FF9FF3', '#54A0FF', '#5F27CD'
  ];

  const loadData = async () => {
    try {
      console.log('AppCategoryManager: Loading category data');
      setLoading(true);
      setError(null);

      const [categoriesResult, settingsResult] = await Promise.all([
        window.electronAPI.getAppCategories(),
        window.electronAPI.getUserCategorySettings()
      ]);

      if (categoriesResult.success && categoriesResult.data) {
        setCategories(categoriesResult.data);
        console.log('AppCategoryManager: Categories loaded successfully', categoriesResult.data);
      } else {
        setError(categoriesResult.error || 'Failed to load categories');
        console.error('AppCategoryManager: Failed to load categories:', categoriesResult.error);
      }

      if (settingsResult.success && settingsResult.data) {
        setUserSettings(settingsResult.data);
        console.log('AppCategoryManager: User settings loaded successfully', settingsResult.data);
      } else {
        setError(settingsResult.error || 'Failed to load user settings');
        console.error('AppCategoryManager: Failed to load user settings:', settingsResult.error);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
      setError(errorMessage);
      console.error('AppCategoryManager: Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = () => {
    console.log('AppCategoryManager: Creating new category');
    setEditingCategory({
      id: '',
      name: '',
      description: '',
      color: defaultColors[0],
      isNew: true
    });
    setIsEditing(true);
  };

  const handleEditCategory = (categoryId: string) => {
    console.log('AppCategoryManager: Editing category', categoryId);
    if (!categories) return;
    
    const category = categories.categories[categoryId] || userSettings?.customCategories[categoryId];
    if (!category) return;

    setEditingCategory({
      id: categoryId,
      name: categoryId,
      description: category.description,
      color: category.color,
      isNew: false
    });
    setIsEditing(true);
  };

  const handleSaveCategory = async () => {
    if (!editingCategory) return;

    // Validate category name
    if (!editingCategory.name.trim()) {
      setError('Category name is required');
      return;
    }

    // Check for duplicate names when creating new category
    if (editingCategory.isNew && checkCategoryNameExists(editingCategory.name)) {
      setError('A category with this name already exists');
      return;
    }

    try {
      console.log('AppCategoryManager: Saving category', editingCategory);
      setLoading(true);
      setError(null); // Clear any previous errors

      if (editingCategory.isNew) {
        console.log('AppCategoryManager: Creating new category with name:', editingCategory.name);
        const result = await window.electronAPI.createCustomCategory(
          editingCategory.name,
          editingCategory.description,
          editingCategory.color
        );
        
        console.log('AppCategoryManager: Create category result:', result);
        
        if (result.success) {
          console.log('AppCategoryManager: Category created successfully with ID:', result.id);
          await loadData();
        } else {
          setError(result.error || 'Failed to create category');
          console.error('AppCategoryManager: Failed to create category:', result.error);
        }
      } else {
        const result = await window.electronAPI.updateCustomCategory(
          editingCategory.id,
          editingCategory.name,
          editingCategory.description,
          editingCategory.color
        );
        
        if (result.success) {
          console.log('AppCategoryManager: Category updated successfully');
          await loadData();
        } else {
          setError(result.error || 'Failed to update category');
          console.error('AppCategoryManager: Failed to update category:', result.error);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save category';
      setError(errorMessage);
      console.error('AppCategoryManager: Error saving category:', err);
    } finally {
      setLoading(false);
      setIsEditing(false);
      setEditingCategory(null);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!categories) return;
    
    // Check if it's a custom category (either in main categories with isCustom flag or in userSettings.customCategories)
    const isCustomCategory = categories.categories[categoryId]?.isCustom || 
                             (userSettings?.customCategories && userSettings.customCategories[categoryId]);
    
    if (!isCustomCategory) {
      setError('Cannot delete default categories');
      return;
    }

    const categoryName = categoryId.charAt(0).toUpperCase() + categoryId.slice(1).replace(/-/g, ' ');
    if (!confirm(`Are you sure you want to delete the "${categoryName}" category? All apps in this category will be moved to miscellaneous.`)) {
      return;
    }

    try {
      console.log('AppCategoryManager: Deleting category', categoryId);
      setLoading(true);
      setError(null); // Clear any previous errors

      const result = await window.electronAPI.deleteCustomCategory(categoryId);
      
      if (result.success) {
        console.log('AppCategoryManager: Category deleted successfully');
        await loadData();
        // If the deleted category was selected, clear the selection
        if (selectedCategory === categoryId) {
          setSelectedCategory(null);
        }
      } else {
        setError(result.error || 'Failed to delete category');
        console.error('AppCategoryManager: Failed to delete category:', result.error);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete category';
      setError(errorMessage);
      console.error('AppCategoryManager: Error deleting category:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAppCategoryChange = async (appName: string, newCategoryId: string) => {
    try {
      console.log('AppCategoryManager: Changing app category', { appName, newCategoryId });
      setLoading(true);

      const result = await window.electronAPI.assignAppToCategory(appName, newCategoryId);
      
      if (result.success) {
        console.log('AppCategoryManager: App category changed successfully');
        await loadData();
      } else {
        setError(result.error || 'Failed to change app category');
        console.error('AppCategoryManager: Failed to change app category:', result.error);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to change app category';
      setError(errorMessage);
      console.error('AppCategoryManager: Error changing app category:', err);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryForApp = (appName: string): string => {
    if (!categories) return 'miscellaneous';
    
    // First check user overrides
    if (userSettings?.appCategoryOverrides[appName]) {
      return userSettings.appCategoryOverrides[appName];
    }
    
    // Then check default categories
    for (const [categoryId, category] of Object.entries(categories.categories)) {
      if (category.apps.includes(appName)) {
        return categoryId;
      }
    }
    
    return 'miscellaneous';
  };

  const checkCategoryNameExists = (name: string): boolean => {
    if (!categories) return false;
    
    // Generate the ID that would be created from this name
    const potentialId = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    
    return Object.keys(categories.categories).includes(potentialId);
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <MdRefresh className={styles.loadingIcon} />
          <span>Loading categories...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <p>Error: {error}</p>
          <button onClick={loadData} className={styles.retryButton}>
            <MdRefresh />
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!categories) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <p>No category data available</p>
          <button onClick={loadData} className={styles.retryButton}>
            <MdRefresh />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>
          <MdCategory />
          App Categories
        </h2>
        <div className={styles.headerActions}>
          <button onClick={handleCreateCategory} className={styles.createButton}>
            <MdAdd />
            Create Category
          </button>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.sidebar}>
          <h3>Categories</h3>
          <div className={styles.categoryList}>
            {Object.entries(categories.categories).map(([categoryId, category]) => (
              <div
                key={categoryId}
                className={`${styles.categoryItem} ${selectedCategory === categoryId ? styles.selected : ''}`}
                onClick={() => setSelectedCategory(categoryId)}
              >
                <div className={styles.categoryColor} style={{ backgroundColor: category.color }} />
                <div className={styles.categoryInfo}>
                  <span className={styles.categoryName}>
                    {categoryId.charAt(0).toUpperCase() + categoryId.slice(1).replace(/-/g, ' ')}
                  </span>
                  <span className={styles.categoryCount}>({category.apps.length} apps)</span>
                </div>
                {category.isCustom && (
                  <div className={styles.categoryActions}>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleEditCategory(categoryId); }}
                      className={styles.editButton}
                    >
                      <MdEdit />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteCategory(categoryId); }}
                      className={styles.deleteButton}
                    >
                      <MdDelete />
                    </button>
                  </div>
                )}
              </div>
            ))}
            {userSettings?.customCategories && Object.entries(userSettings.customCategories).map(([categoryId, category]) => (
              <div
                key={categoryId}
                className={`${styles.categoryItem} ${selectedCategory === categoryId ? styles.selected : ''}`}
                onClick={() => setSelectedCategory(categoryId)}
              >
                <div className={styles.categoryColor} style={{ backgroundColor: category.color }} />
                <div className={styles.categoryInfo}>
                  <span className={styles.categoryName}>
                    {categoryId.charAt(0).toUpperCase() + categoryId.slice(1).replace(/-/g, ' ')}
                  </span>
                  <span className={styles.categoryCount}>({category.apps.length} apps)</span>
                </div>
                <div className={styles.categoryActions}>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleEditCategory(categoryId); }}
                    className={styles.editButton}
                  >
                    <MdEdit />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteCategory(categoryId); }}
                    className={styles.deleteButton}
                  >
                    <MdDelete />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.main}>
          {selectedCategory ? (
            <div className={styles.categoryDetails}>
              <div className={styles.categoryHeader}>
                <div className={styles.categoryTitleRow}>
                  <div className={styles.categoryColor} style={{ 
                    backgroundColor: categories.categories[selectedCategory]?.color || userSettings?.customCategories[selectedCategory]?.color 
                  }} />
                  <h3>{selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1).replace(/-/g, ' ')}</h3>
                </div>
                <p>{categories.categories[selectedCategory]?.description || userSettings?.customCategories[selectedCategory]?.description}</p>
              </div>

              <div className={styles.appsSection}>
                <h4>
                  <MdApps />
                  Apps in this category ({(categories.categories[selectedCategory]?.apps || userSettings?.customCategories[selectedCategory]?.apps || []).length})
                </h4>
                <div className={styles.appsList}>
                  {(categories.categories[selectedCategory]?.apps || userSettings?.customCategories[selectedCategory]?.apps || []).map((appName) => (
                    <div key={appName} className={styles.appItem}>
                      <span className={styles.appName}>{appName}</span>
                      <select
                        value={getCategoryForApp(appName)}
                        onChange={(e) => handleAppCategoryChange(appName, e.target.value)}
                        className={styles.categorySelect}
                      >
                        {Object.entries(categories.categories).map(([catId, cat]) => (
                          <option key={catId} value={catId}>
                            {catId.charAt(0).toUpperCase() + catId.slice(1).replace(/-/g, ' ')}
                            {cat.isCustom && ' (Custom)'}
                          </option>
                        ))}
                        {userSettings?.customCategories && Object.entries(userSettings.customCategories).map(([catId, cat]) => (
                          <option key={catId} value={catId}>
                            {catId.charAt(0).toUpperCase() + catId.slice(1).replace(/-/g, ' ')} (Custom)
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.placeholder}>
              <MdCategory />
              <p>Select a category to view and manage its apps</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Category Modal */}
      {isEditing && editingCategory && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h3>{editingCategory.isNew ? 'Create New Category' : 'Edit Category'}</h3>
            
            {error && (
              <div style={{ 
                color: '#ff6b6b', 
                background: 'rgba(255, 107, 107, 0.1)', 
                padding: '8px 12px', 
                borderRadius: '4px', 
                marginBottom: '16px',
                fontSize: '14px'
              }}>
                {error}
              </div>
            )}
            
            <div className={styles.formGroup}>
              <label>Category Name:</label>
              <input
                type="text"
                value={editingCategory.name}
                onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                placeholder="e.g., My Category"
                disabled={!editingCategory.isNew}
              />
              {editingCategory.isNew && (
                <small style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  Category ID will be generated automatically from the name
                </small>
              )}
            </div>

            <div className={styles.formGroup}>
              <label>Description:</label>
              <input
                type="text"
                value={editingCategory.description}
                onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                placeholder="Brief description of this category"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Color:</label>
              <div className={styles.colorPicker}>
                <input
                  type="color"
                  value={editingCategory.color}
                  onChange={(e) => setEditingCategory({ ...editingCategory, color: e.target.value })}
                />
                <div className={styles.colorPresets}>
                  {defaultColors.map((color) => (
                    <div
                      key={color}
                      className={styles.colorPreset}
                      style={{ backgroundColor: color }}
                      onClick={() => setEditingCategory({ ...editingCategory, color })}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button onClick={handleSaveCategory} className={styles.saveButton}>
                <MdSave />
                Save
              </button>
              <button onClick={() => { setIsEditing(false); setEditingCategory(null); }} className={styles.cancelButton}>
                <MdCancel />
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppCategoryManager;
