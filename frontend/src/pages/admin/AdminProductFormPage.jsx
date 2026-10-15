import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Upload,
  X,
  Package,
  Image as ImageIcon,
  AlertCircle,
  Check,
  Trash2,
  Plus,
} from 'lucide-react';
import { adminApi } from '../../api/admin';
import { useToast } from '../../context/ToastContext';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const AdminProductFormPage = () => {
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Loading states
  const [isPageLoading, setIsPageLoading] = useState(isEditMode);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Categories & Brands choices
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);

  // Form fields
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [discountPrice, setDiscountPrice] = useState('');
  const [stock, setStock] = useState('0');
  const [stockStatus, setStockStatus] = useState('IN_STOCK');
  const [categoryId, setCategoryId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);

  // Image states
  const [mainImageFile, setMainImageFile] = useState(null);
  const [mainImagePreview, setMainImagePreview] = useState('');
  const [existingMainImage, setExistingMainImage] = useState('');

  const [galleryFiles, setGalleryFiles] = useState([]);
  const [galleryPreviews, setGalleryPreviews] = useState([]);
  const [existingGalleryImages, setExistingGalleryImages] = useState([]);

  // Field-specific validation errors
  const [errors, setErrors] = useState({});

  // Fetch initial choices and product details if editing
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const [catData, brandData] = await Promise.all([
          adminApi.getCategories(),
          adminApi.getBrands(),
        ]);

        if (!isMounted) return;
        setCategories(Array.isArray(catData) ? catData : catData?.results || []);
        setBrands(Array.isArray(brandData) ? brandData : brandData?.results || []);

        if (isEditMode) {
          const product = await adminApi.getProduct(id);
          if (!isMounted) return;

          setName(product.name || '');
          setSku(product.sku || '');
          setDescription(product.description || '');
          setPrice(product.price ? String(product.price) : '');
          setDiscountPrice(product.discount_price ? String(product.discount_price) : '');
          setStock(product.stock !== undefined ? String(product.stock) : '0');
          setStockStatus(product.stock_status || (product.stock > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK'));
          setCategoryId(product.category?.id ? String(product.category.id) : '');
          setBrandId(product.brand?.id ? String(product.brand.id) : '');
          setIsAvailable(product.is_available !== false);

          if (product.image) {
            setExistingMainImage(product.image);
          }
          if (product.images && Array.isArray(product.images)) {
            setExistingGalleryImages(product.images);
          }
        }
      } catch (err) {
        if (!isMounted) return;
        showToast('Failed to load product details.', 'error');
        navigate('/admin/products');
      } finally {
        if (isMounted) setIsPageLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [id, isEditMode, navigate, showToast]);

  // Main Image selection handler
  const handleMainImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setErrors((prev) => ({
        ...prev,
        image: 'Only JPG, PNG, and WebP images are allowed.',
      }));
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setErrors((prev) => ({
        ...prev,
        image: 'Image size exceeds maximum limit of 5 MB.',
      }));
      return;
    }

    setErrors((prev) => {
      const next = { ...prev };
      delete next.image;
      return next;
    });

    setMainImageFile(file);
    setMainImagePreview(URL.createObjectURL(file));
  };

  const removeMainImage = () => {
    setMainImageFile(null);
    if (mainImagePreview) {
      URL.revokeObjectURL(mainImagePreview);
      setMainImagePreview('');
    }
    setExistingMainImage('');
  };

  // Additional Gallery Images handler
  const handleGalleryChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const validFiles = [];
    const newPreviews = [];
    let hasSizeError = false;

    files.forEach((file) => {
      if (!ALLOWED_MIME_TYPES.includes(file.type)) return;
      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        hasSizeError = true;
        return;
      }
      validFiles.push(file);
      newPreviews.push({
        file,
        previewUrl: URL.createObjectURL(file),
      });
    });

    if (hasSizeError) {
      showToast('Some images were skipped because they exceed 5 MB.', 'warning');
    }

    setGalleryFiles((prev) => [...prev, ...validFiles]);
    setGalleryPreviews((prev) => [...prev, ...newPreviews]);
  };

  const removePendingGalleryImage = (index) => {
    setGalleryFiles((prev) => prev.filter((_, i) => i !== index));
    setGalleryPreviews((prev) => {
      const target = prev[index];
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleDeleteExistingGalleryImage = async (imgId) => {
    try {
      await adminApi.deleteProductImage(imgId);
      setExistingGalleryImages((prev) => prev.filter((img) => img.id !== imgId));
      showToast('Gallery image deleted.', 'info');
    } catch (err) {
      showToast('Failed to delete image.', 'error');
    }
  };

  // Client-side Validation
  const validateForm = () => {
    const newErrors = {};

    if (!name.trim()) {
      newErrors.name = 'Product name is required.';
    }

    if (!categoryId) {
      newErrors.category_id = 'Please select a category.';
    }

    if (!brandId) {
      newErrors.brand_id = 'Please select a brand.';
    }

    const parsedPrice = parseFloat(price);
    if (!price || isNaN(parsedPrice) || parsedPrice <= 0) {
      newErrors.price = 'Price must be greater than zero.';
    }

    if (discountPrice && discountPrice.trim() !== '') {
      const parsedDiscount = parseFloat(discountPrice);
      if (isNaN(parsedDiscount) || parsedDiscount <= 0) {
        newErrors.discount_price = 'Discount price must be greater than zero.';
      } else if (!isNaN(parsedPrice) && parsedDiscount >= parsedPrice) {
        newErrors.discount_price = 'Discount price must be less than regular price.';
      }
    }

    const parsedStock = parseInt(stock, 10);
    if (stock === '' || isNaN(parsedStock) || parsedStock < 0) {
      newErrors.stock = 'Stock quantity cannot be negative.';
    }

    if (!description.trim()) {
      newErrors.description = 'Product description is required.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Form Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      showToast('Please fix the validation errors before saving.', 'error');
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      if (sku.trim()) {
        formData.append('sku', sku.trim());
      }
      formData.append('description', description.trim());
      formData.append('price', parseFloat(price).toFixed(2));
      if (discountPrice && discountPrice.trim()) {
        formData.append('discount_price', parseFloat(discountPrice).toFixed(2));
      }
      formData.append('stock', parseInt(stock, 10));
      formData.append(
        'stock_status',
        parseInt(stock, 10) > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK'
      );
      formData.append('category_id', categoryId);
      formData.append('brand_id', brandId);
      formData.append('is_available', isAvailable ? 'true' : 'false');

      // Append main image if new file selected
      if (mainImageFile) {
        formData.append('image', mainImageFile);
      }

      // Append new gallery images
      galleryFiles.forEach((file) => {
        formData.append('gallery_images', file);
      });

      if (isEditMode) {
        await adminApi.updateProduct(id, formData);
        showToast('Product updated successfully.', 'success');
      } else {
        await adminApi.createProduct(formData);
        showToast('Product created successfully.', 'success');
      }

      navigate('/admin/products');
    } catch (err) {
      console.error('Save product error:', err);
      const data = err.response?.data;

      if (data && typeof data === 'object') {
        const fieldErrors = {};
        Object.entries(data).forEach(([key, value]) => {
          fieldErrors[key] = Array.isArray(value) ? value.join(' ') : String(value);
        });
        setErrors(fieldErrors);
        showToast(
          fieldErrors.detail ||
            fieldErrors.error ||
            'Failed to save product. Please review highlighted fields.',
          'error'
        );
      } else {
        showToast('Failed to save product due to server error.', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isPageLoading) {
    return (
      <div style={{ padding: '6rem 1.5rem', textAlign: 'center' }}>
        <LoadingSpinner message="Loading product information..." />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '4rem' }}>
      {/* Header & Breadcrumb */}
      <div style={{ marginBottom: '2rem' }}>
        <Link
          to="/admin/products"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.375rem',
            color: '#71717a',
            fontSize: '0.8125rem',
            fontWeight: 500,
            textDecoration: 'none',
            marginBottom: '0.75rem',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#000000';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#71717a';
          }}
        >
          <ArrowLeft size={14} />
          <span>Back to Products</span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#000000', margin: 0, letterSpacing: '-0.025em' }}>
              {isEditMode ? `Edit Product: ${name || 'Product'}` : 'Add New Product'}
            </h1>
            <p style={{ color: '#71717a', fontSize: '0.875rem', marginTop: '0.25rem', marginBottom: 0 }}>
              {isEditMode
                ? 'Update catalog details, pricing, inventory units, and media.'
                : 'Create a new catalog item with pricing, images, and inventory.'}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={() => navigate('/admin/products')}
              disabled={isSubmitting}
              style={{
                padding: '0.625rem 1.125rem',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                backgroundColor: '#ffffff',
                color: '#3f3f46',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="product-form"
              disabled={isSubmitting}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.625rem 1.375rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#000000',
                color: '#ffffff',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.7 : 1,
              }}
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="14px" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{isEditMode ? 'Update Product' : 'Create Product'}</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Form Layout */}
      <form id="product-form" onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
          {/* LEFT COLUMN: Main Details, Pricing, Images */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* 1. Basic Information */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '10px',
                border: '1px solid #e5e7eb',
                padding: '1.5rem',
              }}
            >
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#000000', margin: '0 0 1.25rem 0' }}>
                Basic Information
              </h2>

              {/* Product Name */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label
                  htmlFor="product-name"
                  style={{
                    display: 'block',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color: '#18181b',
                    marginBottom: '0.375rem',
                  }}
                >
                  Product Name <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  id="product-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Wireless Noise-Cancelling Headphones"
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.875rem',
                    borderRadius: '8px',
                    border: `1px solid ${errors.name ? '#dc2626' : '#e5e7eb'}`,
                    fontSize: '0.875rem',
                    color: '#000000',
                    backgroundColor: '#ffffff',
                    outline: 'none',
                  }}
                />
                {errors.name && (
                  <p style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.375rem', margin: 0 }}>
                    {errors.name}
                  </p>
                )}
              </div>

              {/* SKU */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label
                  htmlFor="product-sku"
                  style={{
                    display: 'block',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color: '#18181b',
                    marginBottom: '0.375rem',
                  }}
                >
                  SKU (Stock Keeping Unit)
                </label>
                <input
                  id="product-sku"
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value.toUpperCase())}
                  placeholder="e.g. WN-HD-001"
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.875rem',
                    borderRadius: '8px',
                    border: `1px solid ${errors.sku ? '#dc2626' : '#e5e7eb'}`,
                    fontSize: '0.875rem',
                    fontFamily: 'monospace',
                    color: '#000000',
                    backgroundColor: '#ffffff',
                    outline: 'none',
                  }}
                />
                <span style={{ fontSize: '0.75rem', color: '#71717a' }}>
                  Unique identifier used for inventory tracking and bulk imports.
                </span>
                {errors.sku && (
                  <p style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.375rem', margin: 0 }}>
                    {errors.sku}
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label
                  htmlFor="product-desc"
                  style={{
                    display: 'block',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color: '#18181b',
                    marginBottom: '0.375rem',
                  }}
                >
                  Description <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <textarea
                  id="product-desc"
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detailed description of features, materials, and specifications..."
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.875rem',
                    borderRadius: '8px',
                    border: `1px solid ${errors.description ? '#dc2626' : '#e5e7eb'}`,
                    fontSize: '0.875rem',
                    color: '#000000',
                    backgroundColor: '#ffffff',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
                {errors.description && (
                  <p style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.375rem', margin: 0 }}>
                    {errors.description}
                  </p>
                )}
              </div>
            </div>

            {/* 2. Pricing & Inventory */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '10px',
                border: '1px solid #e5e7eb',
                padding: '1.5rem',
              }}
            >
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#000000', margin: '0 0 1.25rem 0' }}>
                Pricing & Inventory
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                {/* Price */}
                <div>
                  <label
                    htmlFor="product-price"
                    style={{
                      display: 'block',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      color: '#18181b',
                      marginBottom: '0.375rem',
                    }}
                  >
                    Price (₹) <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    id="product-price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                    style={{
                      width: '100%',
                      padding: '0.625rem 0.875rem',
                      borderRadius: '8px',
                      border: `1px solid ${errors.price ? '#dc2626' : '#e5e7eb'}`,
                      fontSize: '0.875rem',
                      outline: 'none',
                    }}
                  />
                  {errors.price && (
                    <p style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.375rem', margin: 0 }}>
                      {errors.price}
                    </p>
                  )}
                </div>

                {/* Discount Price */}
                <div>
                  <label
                    htmlFor="product-discount"
                    style={{
                      display: 'block',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      color: '#18181b',
                      marginBottom: '0.375rem',
                    }}
                  >
                    Discount Price (₹)
                  </label>
                  <input
                    id="product-discount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={discountPrice}
                    onChange={(e) => setDiscountPrice(e.target.value)}
                    placeholder="Optional sale price"
                    style={{
                      width: '100%',
                      padding: '0.625rem 0.875rem',
                      borderRadius: '8px',
                      border: `1px solid ${errors.discount_price ? '#dc2626' : '#e5e7eb'}`,
                      fontSize: '0.875rem',
                      outline: 'none',
                    }}
                  />
                  {errors.discount_price && (
                    <p style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.375rem', margin: 0 }}>
                      {errors.discount_price}
                    </p>
                  )}
                </div>
              </div>

              {/* Stock Quantity */}
              <div>
                <label
                  htmlFor="product-stock"
                  style={{
                    display: 'block',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color: '#18181b',
                    marginBottom: '0.375rem',
                  }}
                >
                  Stock Quantity <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  id="product-stock"
                  type="number"
                  min="0"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  placeholder="0"
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.875rem',
                    borderRadius: '8px',
                    border: `1px solid ${errors.stock ? '#dc2626' : '#e5e7eb'}`,
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                />
                <span style={{ fontSize: '0.75rem', color: '#71717a' }}>
                  Units will automatically set status to "In Stock" (stock &gt; 0) or "Out of Stock".
                </span>
                {errors.stock && (
                  <p style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.375rem', margin: 0 }}>
                    {errors.stock}
                  </p>
                )}
              </div>
            </div>

            {/* 3. Additional Gallery Images */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '10px',
                border: '1px solid #e5e7eb',
                padding: '1.5rem',
              }}
            >
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#000000', margin: '0 0 0.5rem 0' }}>
                Product Gallery Images
              </h2>
              <p style={{ color: '#71717a', fontSize: '0.8125rem', margin: '0 0 1.25rem 0' }}>
                Upload multiple alternate angles and detail shots for this product. Max 5 MB per image.
              </p>

              {/* Existing Gallery Photos (if editing) */}
              {existingGalleryImages.length > 0 && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#71717a', marginBottom: '0.5rem' }}>
                    Current Gallery Photos
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                    {existingGalleryImages.map((img) => (
                      <div
                        key={img.id}
                        style={{
                          position: 'relative',
                          width: '80px',
                          height: '80px',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          border: '1px solid #e5e7eb',
                          backgroundColor: '#fafafa',
                        }}
                      >
                        <img
                          src={img.image}
                          alt="Gallery item"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <button
                          type="button"
                          onClick={() => handleDeleteExistingGalleryImage(img.id)}
                          style={{
                            position: 'absolute',
                            top: '4px',
                            right: '4px',
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(0,0,0,0.7)',
                            color: '#ffffff',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          title="Delete image"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* New Pending Gallery Uploads Preview */}
              {galleryPreviews.length > 0 && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#71717a', marginBottom: '0.5rem' }}>
                    New Photos to Upload ({galleryPreviews.length})
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                    {galleryPreviews.map((p, idx) => (
                      <div
                        key={idx}
                        style={{
                          position: 'relative',
                          width: '80px',
                          height: '80px',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          border: '1px solid #000000',
                          backgroundColor: '#fafafa',
                        }}
                      >
                        <img
                          src={p.previewUrl}
                          alt="New preview"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <button
                          type="button"
                          onClick={() => removePendingGalleryImage(idx)}
                          style={{
                            position: 'absolute',
                            top: '4px',
                            right: '4px',
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(0,0,0,0.7)',
                            color: '#ffffff',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          title="Remove before upload"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* File upload button */}
              <div>
                <label
                  htmlFor="gallery-upload"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.625rem 1rem',
                    borderRadius: '8px',
                    border: '1px dashed #d4d4d8',
                    backgroundColor: '#fafafa',
                    color: '#18181b',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#000000';
                    e.currentTarget.style.backgroundColor = '#f4f4f5';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#d4d4d8';
                    e.currentTarget.style.backgroundColor = '#fafafa';
                  }}
                >
                  <Plus size={16} />
                  <span>Add Gallery Photos</span>
                </label>
                <input
                  id="gallery-upload"
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleGalleryChange}
                  style={{ display: 'none' }}
                />
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Organization & Main Image */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Status & Availability */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '10px',
                border: '1px solid #e5e7eb',
                padding: '1.5rem',
              }}
            >
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#000000', margin: '0 0 1rem 0' }}>
                Status & Visibility
              </h2>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={isAvailable}
                  onChange={(e) => setIsAvailable(e.target.checked)}
                  style={{
                    width: '18px',
                    height: '18px',
                    marginTop: '2px',
                    accentColor: '#000000',
                  }}
                />
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#000000' }}>
                    Visible in Storefront
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#71717a', marginTop: '0.125rem' }}>
                    When active, customers can discover and purchase this product online.
                  </div>
                </div>
              </label>
            </div>

            {/* Organization: Category & Brand */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '10px',
                border: '1px solid #e5e7eb',
                padding: '1.5rem',
              }}
            >
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#000000', margin: '0 0 1.25rem 0' }}>
                Organization
              </h2>

              {/* Category */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label
                  htmlFor="product-category"
                  style={{
                    display: 'block',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color: '#18181b',
                    marginBottom: '0.375rem',
                  }}
                >
                  Category <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <select
                  id="product-category"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.875rem',
                    borderRadius: '8px',
                    border: `1px solid ${errors.category_id ? '#dc2626' : '#e5e7eb'}`,
                    fontSize: '0.875rem',
                    color: '#000000',
                    backgroundColor: '#ffffff',
                    outline: 'none',
                  }}
                >
                  <option value="">Select Category...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {errors.category_id && (
                  <p style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.375rem', margin: 0 }}>
                    {errors.category_id}
                  </p>
                )}
              </div>

              {/* Brand */}
              <div>
                <label
                  htmlFor="product-brand"
                  style={{
                    display: 'block',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color: '#18181b',
                    marginBottom: '0.375rem',
                  }}
                >
                  Brand <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <select
                  id="product-brand"
                  value={brandId}
                  onChange={(e) => setBrandId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.875rem',
                    borderRadius: '8px',
                    border: `1px solid ${errors.brand_id ? '#dc2626' : '#e5e7eb'}`,
                    fontSize: '0.875rem',
                    color: '#000000',
                    backgroundColor: '#ffffff',
                    outline: 'none',
                  }}
                >
                  <option value="">Select Brand...</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                {errors.brand_id && (
                  <p style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.375rem', margin: 0 }}>
                    {errors.brand_id}
                  </p>
                )}
              </div>
            </div>

            {/* Main Product Image (Thumbnail) */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '10px',
                border: '1px solid #e5e7eb',
                padding: '1.5rem',
              }}
            >
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#000000', margin: '0 0 0.5rem 0' }}>
                Main Thumbnail Image
              </h2>
              <p style={{ color: '#71717a', fontSize: '0.8125rem', margin: '0 0 1rem 0' }}>
                This is the primary catalog image displayed in product cards and listings.
              </p>

              {/* Active Image Preview */}
              {mainImagePreview || existingMainImage ? (
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: '240px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: '1px solid #e5e7eb',
                    backgroundColor: '#fafafa',
                    marginBottom: '1rem',
                  }}
                >
                  <img
                    src={mainImagePreview || existingMainImage}
                    alt="Main thumbnail"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                  <button
                    type="button"
                    onClick={removeMainImage}
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      padding: '0.375rem 0.625rem',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(0,0,0,0.8)',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}
                  >
                    <Trash2 size={13} />
                    <span>Remove</span>
                  </button>
                </div>
              ) : (
                <label
                  htmlFor="main-image-upload"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2.5rem 1rem',
                    borderRadius: '8px',
                    border: '2px dashed #e5e7eb',
                    backgroundColor: '#fafafa',
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                    textAlign: 'center',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#000000';
                    e.currentTarget.style.backgroundColor = '#f4f4f5';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.backgroundColor = '#fafafa';
                  }}
                >
                  <Upload size={28} color="#71717a" style={{ marginBottom: '0.5rem' }} />
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#000000' }}>
                    Click to select thumbnail
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#71717a', marginTop: '0.25rem' }}>
                    JPG, PNG, WebP up to 5 MB
                  </div>
                </label>
              )}

              <input
                id="main-image-upload"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleMainImageChange}
                style={{ display: 'none' }}
              />

              {errors.image && (
                <p style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.5rem', margin: 0 }}>
                  {errors.image}
                </p>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AdminProductFormPage;
