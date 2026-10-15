import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Upload,
  FileSpreadsheet,
  FileArchive,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  X,
  FileCheck,
  RefreshCw,
  Eye,
  AlertCircle,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { adminApi } from '../../api/admin';
import { useToast } from '../../context/ToastContext';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export const AdminProductImportPage = () => {
  const { showToast } = useToast();

  // Uploaded files
  const [dataFile, setDataFile] = useState(null);
  const [zipFile, setZipFile] = useState(null);
  const [isDataDragging, setIsDataDragging] = useState(false);
  const [isZipDragging, setIsZipDragging] = useState(false);

  // Import options
  const [importMode, setImportMode] = useState('update'); // 'skip' | 'update' | 'replace'

  // Processing states
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);

  // Preview & Results state
  const [previewData, setPreviewData] = useState(null);
  const [importResults, setImportResults] = useState(null);

  // Download CSV template
  const handleDownloadTemplate = async () => {
    setIsDownloadingTemplate(true);
    try {
      const blob = await adminApi.downloadProductTemplate();
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'djangomart_product_template.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast('Template downloaded.', 'success');
    } catch (err) {
      showToast('Failed to download CSV template.', 'error');
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  // CSV Drag & Drop handlers
  const handleDataDrop = (e) => {
    e.preventDefault();
    setIsDataDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.xlsx'))) {
      setDataFile(file);
      setPreviewData(null);
      setImportResults(null);
    } else {
      showToast('Please upload a valid .csv or .xlsx file.', 'error');
    }
  };

  const handleDataFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setDataFile(file);
      setPreviewData(null);
      setImportResults(null);
    }
  };

  // ZIP Drag & Drop handlers
  const handleZipDrop = (e) => {
    e.preventDefault();
    setIsZipDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith('.zip')) {
      setZipFile(file);
      setPreviewData(null);
      setImportResults(null);
    } else {
      showToast('Please upload a valid .zip archive.', 'error');
    }
  };

  const handleZipFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setZipFile(file);
      setPreviewData(null);
      setImportResults(null);
    }
  };

  // Build FormData helper
  const createImportFormData = () => {
    const formData = new FormData();
    formData.append('file', dataFile);
    formData.append('import_mode', importMode);
    if (zipFile) {
      formData.append('images_zip', zipFile);
    }
    return formData;
  };

  // 1. Dry run: Validate & Preview
  const handleValidateAndPreview = async () => {
    if (!dataFile) {
      showToast('Please select a product CSV or Excel file first.', 'error');
      return;
    }

    setIsValidating(true);
    setPreviewData(null);
    setImportResults(null);

    try {
      const formData = createImportFormData();
      const res = await adminApi.previewProductImport(formData);

      if (res && res.preview) {
        setPreviewData(res);
        showToast('File validated. Review preview details below.', 'info');
      } else {
        showToast('Validation failed or returned empty preview.', 'error');
      }
    } catch (err) {
      console.error('Validation error:', err);
      const errMsg =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        'Failed to validate import file.';
      showToast(errMsg, 'error');
    } finally {
      setIsValidating(false);
    }
  };

  // 2. Commit Import
  const handleExecuteImport = async () => {
    if (!dataFile) {
      showToast('Please select a product data file.', 'error');
      return;
    }

    setIsImporting(true);
    try {
      const formData = createImportFormData();
      formData.delete('dry_run');
      formData.delete('validate_only');

      const res = await adminApi.importProducts(formData);
      setImportResults(res);
      showToast(`Import completed: ${res.imported} created, ${res.updated} updated.`, 'success');
    } catch (err) {
      console.error('Import error:', err);
      const errMsg =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        'Import failed due to server error.';
      showToast(errMsg, 'error');
    } finally {
      setIsImporting(false);
    }
  };

  // Download Failed Rows CSV report
  const handleDownloadFailedReport = () => {
    if (!importResults?.failed_rows || !importResults.failed_rows.length) return;

    const headers = ['Row', 'Product Name', 'SKU', 'Error Reason'];
    const rows = importResults.failed_rows.map((r) => [
      r.row,
      `"${(r.name || '').replace(/"/g, '""')}"`,
      `"${(r.sku || '').replace(/"/g, '""')}"`,
      `"${(r.reason || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'failed_import_rows_report.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '4rem' }}>
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
          onMouseEnter={(e) => (e.currentTarget.style.color = '#000000')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#71717a')}
        >
          <ArrowLeft size={14} />
          <span>Back to Products</span>
        </Link>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <h1
              style={{
                fontSize: '1.75rem',
                fontWeight: 800,
                color: '#000000',
                margin: 0,
                letterSpacing: '-0.025em',
              }}
            >
              Import Products
            </h1>
            <p
              style={{
                color: '#71717a',
                fontSize: '0.875rem',
                marginTop: '0.25rem',
                marginBottom: 0,
              }}
            >
              Import your catalog and product images in bulk.
            </p>
          </div>

          <button
            type="button"
            onClick={handleDownloadTemplate}
            disabled={isDownloadingTemplate}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.625rem 1.125rem',
              borderRadius: '8px',
              border: '1px solid #000000',
              backgroundColor: '#ffffff',
              color: '#000000',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: isDownloadingTemplate ? 'not-allowed' : 'pointer',
              transition: 'background-color 150ms ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f4f4f5')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
          >
            <Download size={16} />
            <span>{isDownloadingTemplate ? 'Downloading...' : 'Download CSV Template'}</span>
          </button>
        </div>
      </div>

      {/* Upload & Configuration Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        {/* Section 1: CSV Upload */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e5e7eb',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <FileSpreadsheet size={20} color="#000000" />
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#000000', margin: 0 }}>
              1. Catalog Data File (.csv / .xlsx) <span style={{ color: '#dc2626' }}>*</span>
            </h2>
          </div>
          <p style={{ color: '#71717a', fontSize: '0.8125rem', margin: '0 0 1rem 0' }}>
            Contains product names, SKU, prices, categories, and image filenames.
          </p>

          {/* Drag & Drop Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDataDragging(true);
            }}
            onDragLeave={() => setIsDataDragging(false)}
            onDrop={handleDataDrop}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2rem 1rem',
              borderRadius: '8px',
              border: `2px dashed ${isDataDragging ? '#000000' : '#e5e7eb'}`,
              backgroundColor: isDataDragging ? '#f4f4f5' : '#fafafa',
              transition: 'all 150ms ease',
              textAlign: 'center',
              minHeight: '160px',
            }}
          >
            {dataFile ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <FileCheck size={36} color="#166534" style={{ marginBottom: '0.5rem' }} />
                <div style={{ fontWeight: 600, color: '#000000', fontSize: '0.875rem' }}>
                  {dataFile.name}
                </div>
                <div style={{ color: '#71717a', fontSize: '0.75rem', marginTop: '0.125rem' }}>
                  {formatFileSize(dataFile.size)}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDataFile(null);
                    setPreviewData(null);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    marginTop: '0.75rem',
                    padding: '0.25rem 0.625rem',
                    borderRadius: '6px',
                    border: '1px solid #e5e7eb',
                    backgroundColor: '#ffffff',
                    color: '#dc2626',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <X size={12} />
                  <span>Remove file</span>
                </button>
              </div>
            ) : (
              <>
                <Upload size={28} color="#71717a" style={{ marginBottom: '0.5rem' }} />
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#000000' }}>
                  Drag & drop your CSV or Excel file here
                </div>
                <div style={{ fontSize: '0.75rem', color: '#71717a', margin: '0.25rem 0 0.875rem 0' }}>
                  Accepted format: .csv, .xlsx
                </div>
                <label
                  htmlFor="csv-file-input"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '0.45rem 0.875rem',
                    borderRadius: '6px',
                    border: '1px solid #000000',
                    backgroundColor: '#000000',
                    color: '#ffffff',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Browse Files
                </label>
                <input
                  id="csv-file-input"
                  type="file"
                  accept=".csv, .xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, text/csv"
                  onChange={handleDataFileChange}
                  style={{ display: 'none' }}
                />
              </>
            )}
          </div>
        </div>

        {/* Section 2: ZIP Images Upload */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e5e7eb',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <FileArchive size={20} color="#000000" />
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#000000', margin: 0 }}>
              2. Product Images ZIP (Optional)
            </h2>
          </div>
          <p style={{ color: '#71717a', fontSize: '0.8125rem', margin: '0 0 1rem 0' }}>
            ZIP archive with images matching filenames in CSV (e.g. <code>mouse.jpg</code>).
          </p>

          {/* Drag & Drop Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsZipDragging(true);
            }}
            onDragLeave={() => setIsZipDragging(false)}
            onDrop={handleZipDrop}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2rem 1rem',
              borderRadius: '8px',
              border: `2px dashed ${isZipDragging ? '#000000' : '#e5e7eb'}`,
              backgroundColor: isZipDragging ? '#f4f4f5' : '#fafafa',
              transition: 'all 150ms ease',
              textAlign: 'center',
              minHeight: '160px',
            }}
          >
            {zipFile ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <FileCheck size={36} color="#166534" style={{ marginBottom: '0.5rem' }} />
                <div style={{ fontWeight: 600, color: '#000000', fontSize: '0.875rem' }}>
                  {zipFile.name}
                </div>
                <div style={{ color: '#71717a', fontSize: '0.75rem', marginTop: '0.125rem' }}>
                  {formatFileSize(zipFile.size)}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setZipFile(null);
                    setPreviewData(null);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    marginTop: '0.75rem',
                    padding: '0.25rem 0.625rem',
                    borderRadius: '6px',
                    border: '1px solid #e5e7eb',
                    backgroundColor: '#ffffff',
                    color: '#dc2626',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <X size={12} />
                  <span>Remove archive</span>
                </button>
              </div>
            ) : (
              <>
                <FileArchive size={28} color="#71717a" style={{ marginBottom: '0.5rem' }} />
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#000000' }}>
                  Drag & drop product images ZIP
                </div>
                <div style={{ fontSize: '0.75rem', color: '#71717a', margin: '0.25rem 0 0.875rem 0' }}>
                  Max 10 MB per image, up to 100 MB total
                </div>
                <label
                  htmlFor="zip-file-input"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '0.45rem 0.875rem',
                    borderRadius: '6px',
                    border: '1px solid #e5e7eb',
                    backgroundColor: '#ffffff',
                    color: '#000000',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Browse ZIP
                </label>
                <input
                  id="zip-file-input"
                  type="file"
                  accept=".zip, application/zip, application/x-zip-compressed"
                  onChange={handleZipFileChange}
                  style={{ display: 'none' }}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Section 3: Import Options & Actions Bar */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          border: '1px solid #e5e7eb',
          padding: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#000000', margin: '0 0 1rem 0' }}>
          3. Matching & Update Strategy
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              cursor: 'pointer',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              border: `1px solid ${importMode === 'update' ? '#000000' : '#e5e7eb'}`,
              backgroundColor: importMode === 'update' ? '#fafafa' : '#ffffff',
            }}
          >
            <input
              type="radio"
              name="import_mode"
              value="update"
              checked={importMode === 'update'}
              onChange={() => {
                setImportMode('update');
                setPreviewData(null);
              }}
              style={{ marginTop: '2px', accentColor: '#000000' }}
            />
            <div>
              <div style={{ fontWeight: 600, color: '#000000', fontSize: '0.875rem' }}>
                Create new &amp; update existing products (Recommended)
              </div>
              <div style={{ color: '#71717a', fontSize: '0.75rem', marginTop: '0.125rem' }}>
                Matches products by SKU (or Product Name). Existing products have pricing, description, and stock updated.
              </div>
            </div>
          </label>

          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              cursor: 'pointer',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              border: `1px solid ${importMode === 'skip' ? '#000000' : '#e5e7eb'}`,
              backgroundColor: importMode === 'skip' ? '#fafafa' : '#ffffff',
            }}
          >
            <input
              type="radio"
              name="import_mode"
              value="skip"
              checked={importMode === 'skip'}
              onChange={() => {
                setImportMode('skip');
                setPreviewData(null);
              }}
              style={{ marginTop: '2px', accentColor: '#000000' }}
            />
            <div>
              <div style={{ fontWeight: 600, color: '#000000', fontSize: '0.875rem' }}>
                Create new products only (Skip existing)
              </div>
              <div style={{ color: '#71717a', fontSize: '0.75rem', marginTop: '0.125rem' }}>
                Any product matching an existing SKU or Name will be preserved unchanged.
              </div>
            </div>
          </label>

          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              cursor: 'pointer',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              border: `1px solid ${importMode === 'replace' ? '#000000' : '#e5e7eb'}`,
              backgroundColor: importMode === 'replace' ? '#fafafa' : '#ffffff',
            }}
          >
            <input
              type="radio"
              name="import_mode"
              value="replace"
              checked={importMode === 'replace'}
              onChange={() => {
                setImportMode('replace');
                setPreviewData(null);
              }}
              style={{ marginTop: '2px', accentColor: '#000000' }}
            />
            <div>
              <div style={{ fontWeight: 600, color: '#000000', fontSize: '0.875rem' }}>
                Create, update &amp; replace gallery photos
              </div>
              <div style={{ color: '#71717a', fontSize: '0.75rem', marginTop: '0.125rem' }}>
                Existing gallery images are replaced with the new photos included in the ZIP archive.
              </div>
            </div>
          </label>
        </div>

        {/* Section 4: Action Buttons */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid #f4f4f5',
          }}
        >
          <button
            type="button"
            disabled={!dataFile || isValidating || isImporting}
            onClick={handleValidateAndPreview}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.625rem 1.25rem',
              borderRadius: '8px',
              border: '1px solid #000000',
              backgroundColor: '#ffffff',
              color: '#000000',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: !dataFile || isValidating || isImporting ? 'not-allowed' : 'pointer',
              opacity: !dataFile || isValidating || isImporting ? 0.6 : 1,
            }}
          >
            {isValidating ? (
              <>
                <LoadingSpinner size="14px" />
                <span>Validating File...</span>
              </>
            ) : (
              <>
                <Eye size={16} />
                <span>Validate &amp; Preview Import</span>
              </>
            )}
          </button>

          <button
            type="button"
            disabled={!previewData || isImporting || isValidating}
            onClick={handleExecuteImport}
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
              cursor: !previewData || isImporting || isValidating ? 'not-allowed' : 'pointer',
              opacity: !previewData || isImporting || isValidating ? 0.6 : 1,
            }}
          >
            {isImporting ? (
              <>
                <LoadingSpinner size="14px" />
                <span>Importing Products...</span>
              </>
            ) : (
              <>
                <Upload size={16} />
                <span>Commit &amp; Import Products</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Section 5: Preview Summary & Table */}
      {previewData && (
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#000000', margin: 0 }}>
                Import Preview
              </h2>
              <p style={{ color: '#71717a', fontSize: '0.8125rem', margin: '0.25rem 0 0 0' }}>
                Dry-run results. No database changes have been saved yet.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPreviewData(null)}
              style={{
                background: 'none',
                border: 'none',
                color: '#71717a',
                cursor: 'pointer',
                fontSize: '0.8125rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              <X size={14} />
              <span>Dismiss Preview</span>
            </button>
          </div>

          {/* Metric Summary Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '0.875rem',
              marginBottom: '1.25rem',
            }}
          >
            <div style={{ padding: '1rem', borderRadius: '8px', border: '1px solid #e5e7eb', backgroundColor: '#ffffff' }}>
              <div style={{ fontSize: '0.75rem', color: '#71717a', fontWeight: 600, textTransform: 'uppercase' }}>
                Total Rows
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#000000', marginTop: '0.25rem' }}>
                {previewData.summary?.total_rows || 0}
              </div>
            </div>

            <div style={{ padding: '1rem', borderRadius: '8px', border: '1px solid #e5e7eb', backgroundColor: '#ffffff' }}>
              <div style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 600, textTransform: 'uppercase' }}>
                Valid Rows
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#166534', marginTop: '0.25rem' }}>
                {previewData.summary?.valid_rows || 0}
              </div>
            </div>

            <div style={{ padding: '1rem', borderRadius: '8px', border: '1px solid #e5e7eb', backgroundColor: '#ffffff' }}>
              <div style={{ fontSize: '0.75rem', color: '#991b1b', fontWeight: 600, textTransform: 'uppercase' }}>
                Invalid Rows
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#991b1b', marginTop: '0.25rem' }}>
                {previewData.summary?.invalid_rows || 0}
              </div>
            </div>

            <div style={{ padding: '1rem', borderRadius: '8px', border: '1px solid #e5e7eb', backgroundColor: '#ffffff' }}>
              <div style={{ fontSize: '0.75rem', color: '#71717a', fontWeight: 600, textTransform: 'uppercase' }}>
                New Products
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#000000', marginTop: '0.25rem' }}>
                {previewData.summary?.new_products || 0}
              </div>
            </div>

            <div style={{ padding: '1rem', borderRadius: '8px', border: '1px solid #e5e7eb', backgroundColor: '#ffffff' }}>
              <div style={{ fontSize: '0.75rem', color: '#71717a', fontWeight: 600, textTransform: 'uppercase' }}>
                To Update
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#000000', marginTop: '0.25rem' }}>
                {previewData.summary?.products_to_update || 0}
              </div>
            </div>

            <div style={{ padding: '1rem', borderRadius: '8px', border: '1px solid #e5e7eb', backgroundColor: '#ffffff' }}>
              <div style={{ fontSize: '0.75rem', color: '#71717a', fontWeight: 600, textTransform: 'uppercase' }}>
                Images Found
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#000000', marginTop: '0.25rem' }}>
                {previewData.summary?.images_found || 0}
              </div>
            </div>
          </div>

          {/* Preview Table */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '10px',
              border: '1px solid #e5e7eb',
              overflow: 'hidden',
            }}
          >
            <div style={{ overflowX: 'auto', maxHeight: '420px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#f9fafb' }}>
                  <tr style={{ borderBottom: '1px solid #e5e7eb', color: '#71717a', textTransform: 'uppercase', fontSize: '0.6875rem' }}>
                    <th style={{ padding: '0.75rem 1rem' }}>Row</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Product Name</th>
                    <th style={{ padding: '0.75rem 1rem' }}>SKU</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Price</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Stock</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Category</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Brand</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Image Status</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Action</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Validation Status</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.preview?.map((row) => {
                    const hasErrors = row.errors && row.errors.length > 0;
                    return (
                      <tr
                        key={row.row}
                        style={{
                          borderBottom: '1px solid #f4f4f5',
                          backgroundColor: hasErrors ? '#fffbfa' : 'transparent',
                        }}
                      >
                        <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace' }}>#{row.row}</td>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#000000' }}>{row.name || '—'}</td>
                        <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace' }}>{row.sku || '—'}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>₹{row.price}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>{row.stock}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>{row.category || '—'}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>{row.brand || '—'}</td>
                        <td style={{ padding: '0.75rem 1rem', color: '#52525b' }}>{row.image_status}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.6875rem',
                              fontWeight: 700,
                              backgroundColor:
                                row.action === 'CREATE'
                                  ? '#dcfce7'
                                  : row.action === 'UPDATE'
                                  ? '#e0e7ff'
                                  : row.action === 'SKIP'
                                  ? '#f4f4f5'
                                  : '#fee2e2',
                              color:
                                row.action === 'CREATE'
                                  ? '#166534'
                                  : row.action === 'UPDATE'
                                  ? '#3730a3'
                                  : row.action === 'SKIP'
                                  ? '#71717a'
                                  : '#991b1b',
                            }}
                          >
                            {row.action}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          {hasErrors ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                              {row.errors.map((err, errIdx) => (
                                <span
                                  key={errIdx}
                                  style={{
                                    fontSize: '0.75rem',
                                    color: '#b91c1c',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                  }}
                                >
                                  <AlertTriangle size={12} />
                                  <span>{err}</span>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span
                              style={{
                                fontSize: '0.75rem',
                                color: '#166534',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                              }}
                            >
                              <CheckCircle2 size={13} />
                              <span>Valid</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Section 6: Post-Import Results Report */}
      {importResults && (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e5e7eb',
            padding: '1.75rem',
            marginBottom: '2rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <CheckCircle2 size={24} color="#166534" />
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#000000', margin: 0 }}>
                Import Finished Successfully
              </h2>
              <div style={{ color: '#71717a', fontSize: '0.8125rem', marginTop: '0.125rem' }}>
                Completed in {importResults.execution_time}s
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '1rem',
              marginBottom: '1.5rem',
            }}
          >
            <div style={{ padding: '0.875rem', borderRadius: '8px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: '0.75rem', color: '#71717a', fontWeight: 600 }}>Created</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#166534' }}>
                {importResults.imported || 0}
              </div>
            </div>

            <div style={{ padding: '0.875rem', borderRadius: '8px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: '0.75rem', color: '#71717a', fontWeight: 600 }}>Updated</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#000000' }}>
                {importResults.updated || 0}
              </div>
            </div>

            <div style={{ padding: '0.875rem', borderRadius: '8px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: '0.75rem', color: '#71717a', fontWeight: 600 }}>Skipped</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#71717a' }}>
                {importResults.skipped || 0}
              </div>
            </div>

            <div style={{ padding: '0.875rem', borderRadius: '8px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: '0.75rem', color: '#71717a', fontWeight: 600 }}>Failed</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: importResults.failed > 0 ? '#dc2626' : '#000000' }}>
                {importResults.failed || 0}
              </div>
            </div>

            {importResults.main_images_imported !== undefined && (
              <div style={{ padding: '0.875rem', borderRadius: '8px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}>
                <div style={{ fontSize: '0.75rem', color: '#71717a', fontWeight: 600 }}>Images Added</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#000000' }}>
                  {(importResults.main_images_imported || 0) + (importResults.gallery_images_imported || 0)}
                </div>
              </div>
            )}
          </div>

          {/* Failed rows section */}
          {importResults.failed_rows && importResults.failed_rows.length > 0 && (
            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #f4f4f5' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div style={{ fontWeight: 700, color: '#dc2626', fontSize: '0.875rem' }}>
                  Failed Rows ({importResults.failed_rows.length})
                </div>
                <button
                  type="button"
                  onClick={handleDownloadFailedReport}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    padding: '0.375rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid #dc2626',
                    backgroundColor: '#ffffff',
                    color: '#dc2626',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <Download size={13} />
                  <span>Download Failed Rows CSV</span>
                </button>
              </div>

              <div style={{ overflowX: 'auto', maxHeight: '240px', border: '1px solid #fee2e2', borderRadius: '6px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                  <thead style={{ backgroundColor: '#fff5f5' }}>
                    <tr style={{ textAlign: 'left', color: '#991b1b', borderBottom: '1px solid #fecaca' }}>
                      <th style={{ padding: '0.5rem 0.75rem' }}>Row</th>
                      <th style={{ padding: '0.5rem 0.75rem' }}>Product Name</th>
                      <th style={{ padding: '0.5rem 0.75rem' }}>SKU</th>
                      <th style={{ padding: '0.5rem 0.75rem' }}>Failure Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importResults.failed_rows.map((r, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #fef2f2' }}>
                        <td style={{ padding: '0.5rem 0.75rem', fontFamily: 'monospace' }}>#{r.row}</td>
                        <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>{r.name || '—'}</td>
                        <td style={{ padding: '0.5rem 0.75rem', fontFamily: 'monospace' }}>{r.sku || '—'}</td>
                        <td style={{ padding: '0.5rem 0.75rem', color: '#b91c1c' }}>{r.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem' }}>
            <Link
              to="/admin/products"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.625rem 1.25rem',
                borderRadius: '8px',
                backgroundColor: '#000000',
                color: '#ffffff',
                fontSize: '0.875rem',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              <span>View Product Inventory</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProductImportPage;
