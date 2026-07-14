import React, { useState, useEffect, useRef } from 'react';
import { 
  MapPin, 
  Camera, 
  Video, 
  Copy, 
  Save, 
  Trash2, 
  RefreshCw, 
  Settings, 
  Search, 
  Plus, 
  Eye, 
  Image as ImageIcon, 
  Database,
  X,
  Compass,
  CheckCircle,
  AlertTriangle,
  FolderOpen
} from 'lucide-react';
import { getSupabaseClient, updateSupabaseConfig, config } from './supabaseClient';

function App() {
  // App state
  const [activeTab, setActiveTab] = useState('survey'); // 'survey' | 'records'
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Supabase Configuration state
  const [showSettings, setShowSettings] = useState(!config.url || !config.key);
  const [dbUrl, setDbUrl] = useState(config.url);
  const [dbKey, setDbKey] = useState(config.key);
  const [dbTable, setDbTable] = useState(config.table || 'kiemtrahatang');
  const [isConnected, setIsConnected] = useState(false);

  // Form states
  const [diachiHam, setDiachiHam] = useState('');
  const [cable, setCable] = useState('');
  const [donvi, setDonvi] = useState('');
  const [lopi, setLopi] = useState('');
  const [ghichu, setGhichu] = useState('');
  const [gps, setGps] = useState(null); // { latitude, longitude, accuracy }
  const [gpsLoading, setGpsLoading] = useState(false);
  const [mediaFiles, setMediaFiles] = useState([]); // array of { file, type, previewUrl, isUploading, url }
  
  // Quick fill state (last record)
  const [lastRecord, setLastRecord] = useState(null);

  // Media preview modal state
  const [previewMedia, setPreviewMedia] = useState(null); // { url, type }

  // Toast notifications
  const [toasts, setToasts] = useState([]);
  const showToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const fileInputRef = useRef(null);

  // Fetch records and check connection on mount
  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    const client = getSupabaseClient();
    if (!client) {
      setIsConnected(false);
      return;
    }

    try {
      setLoading(true);
      // Try to select 1 record to check connection
      const { data, error } = await client
        .from(dbTable)
        .select('id')
        .limit(1);

      if (error) throw error;
      
      setIsConnected(true);
      fetchRecords();
    } catch (err) {
      console.error('Supabase connection error:', err);
      setIsConnected(false);
      showToast('Không thể kết nối Supabase: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecords = async () => {
    const client = getSupabaseClient();
    if (!client) return;

    try {
      setLoading(true);
      const { data, error } = await client
        .from(dbTable)
        .select('*')
        .order('id', { ascending: false });

      if (error) throw error;
      
      setRecords(data || []);
      
      // Store the last record for copy function
      if (data && data.length > 0) {
        setLastRecord(data[0]);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      showToast('Lỗi tải dữ liệu: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = () => {
    if (!dbUrl || !dbKey) {
      showToast('Vui lòng điền đầy đủ URL và Key', 'warning');
      return;
    }

    const res = updateSupabaseConfig(dbUrl, dbKey, dbTable);
    if (res.success) {
      showToast('Đã lưu cấu hình Supabase!', 'success');
      setShowSettings(false);
      setTimeout(() => {
        checkConnection();
      }, 500);
    } else {
      showToast('Cấu hình không hợp lệ', 'error');
    }
  };

  // GPS geolocation handler
  const getCoordinates = () => {
    if (!navigator.geolocation) {
      showToast('Trình duyệt không hỗ trợ GPS Geolocation', 'error');
      return;
    }

    setGpsLoading(true);
    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGps({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
        setGpsLoading(false);
        showToast('Đã định vị thành công!', 'success');
      },
      (error) => {
        console.error('GPS error:', error);
        setGpsLoading(false);
        let errorMsg = 'Lỗi lấy tọa độ';
        if (error.code === 1) errorMsg = 'Vui lòng cho phép quyền truy cập GPS';
        else if (error.code === 2) errorMsg = 'Không tìm thấy vị trí';
        else if (error.code === 3) errorMsg = 'Quá thời gian tìm vị trí';
        showToast(errorMsg, 'error');
      },
      options
    );
  };

  // Auto get location on form view if not present
  useEffect(() => {
    if (activeTab === 'survey' && !gps) {
      getCoordinates();
    }
  }, [activeTab]);

  // Copy data from previous record
  const handleCopyFromPrevious = () => {
    if (!lastRecord) {
      showToast('Không có dữ liệu khảo sát trước đó', 'warning');
      return;
    }
    setDiachiHam(lastRecord.diachi_ham || '');
    setCable(lastRecord.cable || '');
    setDonvi(lastRecord.donvi || '');
    setLopi(lastRecord.lopi || '');
    setGhichu(lastRecord.ghichu || '');
    showToast('Đã chép dữ liệu từ dòng trước!', 'info');
  };

  // Handling file capture/selection
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const newMediaFiles = files.map(file => {
      const type = file.type.startsWith('video/') ? 'video' : 'image';
      return {
        file,
        type,
        previewUrl: URL.createObjectURL(file),
        isUploading: false,
        url: '' // will be set after upload
      };
    });

    setMediaFiles(prev => [...prev, ...newMediaFiles]);
  };

  // Remove local preview media
  const handleRemoveMedia = (index) => {
    setMediaFiles(prev => {
      const copy = [...prev];
      URL.revokeObjectURL(copy[index].previewUrl);
      copy.splice(index, 1);
      return copy;
    });
  };

  // Upload multiple media files to Supabase Storage
  const uploadMediaToSupabase = async (mediaArray) => {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase client chưa được kết nối');

    const uploadedUrls = [];

    for (let i = 0; i < mediaArray.length; i++) {
      const item = mediaArray[i];
      
      // If it's already uploaded (e.g. editing, though here we do insertion mostly)
      if (item.url && !item.file) {
        uploadedUrls.push(item.url);
        continue;
      }

      // Mark uploader as uploading
      setMediaFiles(prev => {
        const copy = [...prev];
        if (copy[i]) copy[i].isUploading = true;
        return copy;
      });

      const fileExt = item.file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.floor(Math.random() * 100000)}.${fileExt}`;
      const filePath = `records/${fileName}`;

      // Upload to 'kiemtrahatang' bucket
      const { data, error } = await client.storage
        .from('kiemtrahatang')
        .upload(filePath, item.file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        // If bucket doesn't exist, we fallback to converting to base64, so it saves anyway!
        console.warn(`Lỗi upload Storage (có thể chưa tạo Bucket 'kiemtrahatang'):`, error);
        
        // Let's attempt Base64 fallback to prevent losing user survey data!
        try {
          const base64Data = await convertFileToBase64(item.file);
          uploadedUrls.push(base64Data);
          
          setMediaFiles(prev => {
            const copy = [...prev];
            if (copy[i]) {
              copy[i].isUploading = false;
              copy[i].url = base64Data;
            }
            return copy;
          });
        } catch (b64Err) {
          throw new Error(`Lỗi tải ảnh lên Storage và Base64 fallback thất bại: ${error.message}`);
        }
      } else {
        // Get Public URL
        const { data: publicUrlData } = client.storage
          .from('kiemtrahatang')
          .getPublicUrl(filePath);

        const publicUrl = publicUrlData.publicUrl;
        uploadedUrls.push(publicUrl);

        setMediaFiles(prev => {
          const copy = [...prev];
          if (copy[i]) {
            copy[i].isUploading = false;
            copy[i].url = publicUrl;
          }
          return copy;
        });
      }
    }

    return uploadedUrls;
  };

  // Helper helper to convert file to Base64 dataURL
  const convertFileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  // Submit form data
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isConnected) {
      showToast('Vui lòng kết nối Supabase trước khi lưu dữ liệu', 'error');
      setShowSettings(true);
      return;
    }

    if (!diachiHam.trim()) {
      showToast('Vui lòng nhập địa chỉ hầm khảo sát', 'warning');
      return;
    }

    const client = getSupabaseClient();
    if (!client) return;

    try {
      setSubmitting(true);
      showToast('Đang tải ảnh/video và lưu dữ liệu...', 'info');

      // 1. Upload media files
      let mediaUrls = [];
      if (mediaFiles.length > 0) {
        mediaUrls = await uploadMediaToSupabase(mediaFiles);
      }

      // 2. Format location
      // PostGIS Point format WKT: POINT(longitude latitude)
      let postGisToado = null;
      if (gps) {
        postGisToado = `POINT(${gps.longitude} ${gps.latitude})`;
      }

      // 3. Prepare row data
      const newRecord = {
        diachi_ham: diachiHam.trim(),
        cable: cable.trim() || null,
        donvi: donvi.trim() || null,
        lopi: lopi.trim() || null,
        toado: postGisToado,
        hinhanh: mediaUrls.length > 0 ? JSON.stringify(mediaUrls) : null,
        ghichu: ghichu.trim() || null
      };

      // 4. Save to table
      const { data, error } = await client
        .from(dbTable)
        .insert([newRecord])
        .select();

      if (error) throw error;

      showToast('Đã lưu dữ liệu khảo sát thành công!', 'success');
      
      // Reset form
      setDiachiHam('');
      setCable('');
      setDonvi('');
      setLopi('');
      setGhichu('');
      setMediaFiles([]);
      // Keep GPS but suggest getting coordinates again next time
      
      // Refresh list
      fetchRecords();
      
      // Switch tab to view lists
      setActiveTab('records');

    } catch (err) {
      console.error('Submit error:', err);
      showToast('Lỗi lưu dữ liệu: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper to extract GPS values from DB POINT string
  const parseDbCoordinate = (dbToado) => {
    if (!dbToado) return null;
    
    // Check if it's WKT text e.g. "POINT(106.629664 10.823099)"
    if (typeof dbToado === 'string' && dbToado.startsWith('POINT')) {
      const coords = dbToado.replace('POINT(', '').replace(')', '').split(' ');
      if (coords.length === 2) {
        return {
          longitude: parseFloat(coords[0]),
          latitude: parseFloat(coords[1])
        };
      }
    }
    // Check if GeoJSON object
    if (dbToado.coordinates && Array.isArray(dbToado.coordinates)) {
      return {
        longitude: dbToado.coordinates[0],
        latitude: dbToado.coordinates[1]
      };
    }
    return null;
  };

  // Delete a record
  const handleDeleteRecord = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bản ghi khảo sát này?')) return;

    const client = getSupabaseClient();
    if (!client) return;

    try {
      const { error } = await client
        .from(dbTable)
        .delete()
        .eq('id', id);

      if (error) throw error;

      showToast('Đã xóa bản ghi thành công', 'success');
      setRecords(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error('Delete error:', err);
      showToast('Không thể xóa: ' + err.message, 'error');
    }
  };

  // Render media preview (image or video)
  const renderMediaPreview = (url, index) => {
    // Try to guess type or check base64 encoding prefix
    const isVideo = url.includes('.mp4') || url.includes('.mov') || url.startsWith('data:video/');
    
    if (isVideo) {
      return (
        <video 
          key={index} 
          src={url} 
          className="record-media-preview" 
          onClick={() => setPreviewMedia({ url, type: 'video' })}
        />
      );
    }
    return (
      <img 
        key={index} 
        src={url} 
        alt="Khảo sát" 
        className="record-media-preview" 
        onClick={() => setPreviewMedia({ url, type: 'image' })}
      />
    );
  };

  // Filters records based on search term
  const filteredRecords = records.filter(record => {
    const term = searchTerm.toLowerCase();
    return (
      (record.diachi_ham && record.diachi_ham.toLowerCase().includes(term)) ||
      (record.cable && record.cable.toLowerCase().includes(term)) ||
      (record.donvi && record.donvi.toLowerCase().includes(term)) ||
      (record.lopi && record.lopi.toLowerCase().includes(term)) ||
      (record.ghichu && record.ghichu.toLowerCase().includes(term))
    );
  });

  return (
    <>
      {/* Toast Notification Area */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>
            {t.type === 'success' && <CheckCircle size={18} />}
            {t.type === 'error' && <AlertTriangle size={18} />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      {/* Main Header */}
      <header className="app-header">
        <h1 className="app-title">
          <Compass size={22} className="spin-slow" />
          <span>Khảo Sát Hạ Tầng</span>
        </h1>
        <div className="header-actions">
          <button 
            className="icon-btn" 
            onClick={() => checkConnection()} 
            title="Tải lại dữ liệu"
          >
            <RefreshCw size={18} className={loading ? 'spin' : ''} />
          </button>
          <button 
            className={`icon-btn ${!isConnected ? 'attention-glow' : ''}`}
            onClick={() => setShowSettings(true)} 
            title="Cấu hình Supabase"
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      {/* Connection warning banner */}
      {!isConnected && (
        <div style={{
          background: 'var(--danger-light)',
          color: 'var(--danger)',
          padding: '10px 16px',
          fontSize: '0.85rem',
          fontWeight: '600',
          textAlign: 'center',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}>
          <AlertTriangle size={16} />
          Chưa kết nối Supabase. Nhấn biểu tượng Bánh răng ở góc trên để cài đặt.
        </div>
      )}

      {/* Layout Tabs */}
      <div style={{ padding: '12px 16px 0 16px' }}>
        <nav className="tabs-nav">
          <button 
            className={`tab-btn ${activeTab === 'survey' ? 'active' : ''}`}
            onClick={() => setActiveTab('survey')}
          >
            <Plus size={18} />
            Khảo sát mới
          </button>
          <button 
            className={`tab-btn ${activeTab === 'records' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('records');
              fetchRecords();
            }}
          >
            <FolderOpen size={18} />
            Lịch sử ({records.length})
          </button>
        </nav>
      </div>

      <main className="main-content">
        {activeTab === 'survey' ? (
          /* FORM VIEW */
          <div className="card">
            <h2 className="card-title">
              <Database size={20} style={{ color: 'var(--primary)' }} />
              Nhập thông tin hạ tầng
            </h2>

            {/* Quick Fill suggestions banner */}
            {lastRecord && (
              <div className="quick-copy-bar">
                <div className="quick-copy-text">
                  Dòng trước: <strong>{lastRecord.diachi_ham}</strong>
                </div>
                <button 
                  type="button" 
                  className="btn btn-accent" 
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                  onClick={handleCopyFromPrevious}
                >
                  <Copy size={12} />
                  Chép nhanh
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Địa chỉ hầm / Cống *</label>
                <input 
                  type="text"
                  className="form-control"
                  placeholder="Nhập địa chỉ khảo sát..."
                  value={diachiHam}
                  onChange={(e) => setDiachiHam(e.target.value)}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Cáp (Cable)</label>
                  <input 
                    type="text"
                    className="form-control"
                    placeholder="VD: 96FO, 24FO..."
                    value={cable}
                    onChange={(e) => setCable(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Đơn vị quản lý</label>
                  <input 
                    type="text"
                    className="form-control"
                    placeholder="VD: VNPT, Viettel..."
                    value={donvi}
                    onChange={(e) => setDonvi(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Loại / Lớp hạ tầng (Lopi)</label>
                <input 
                  type="text"
                  className="form-control"
                  placeholder="VD: Hầm nhánh, cống bể chính..."
                  value={lopi}
                  onChange={(e) => setLopi(e.target.value)}
                />
              </div>

              {/* GPS Coordinates Section */}
              <div className="form-group">
                <label className="form-label">Tọa độ định vị (toado)</label>
                <div className="gps-input-container">
                  <div className="gps-value">
                    {gps ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MapPin size={16} style={{ color: 'var(--primary)' }} />
                        {gps.latitude.toFixed(6)}, {gps.longitude.toFixed(6)}
                      </span>
                    ) : (
                      <span className="gps-status inactive">Chưa lấy tọa độ</span>
                    )}
                    {gps && (
                      <span className="gps-status active" style={{ fontSize: '0.75rem' }}>
                        ±{gps.accuracy.toFixed(1)}m
                      </span>
                    )}
                  </div>
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={getCoordinates}
                    disabled={gpsLoading}
                    title="Cập nhật tọa độ GPS"
                  >
                    <RefreshCw size={16} className={gpsLoading ? 'spin' : ''} />
                    {gpsLoading ? '...' : 'GPS'}
                  </button>
                </div>
              </div>

              {/* Multimedia Upload Section */}
              <div className="form-group">
                <label className="form-label">Hình ảnh & Video khảo sát</label>
                <div 
                  className="media-uploader"
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                >
                  <input 
                    type="file"
                    ref={fileInputRef}
                    className="media-uploader-input"
                    multiple
                    accept="image/*,video/*"
                    capture="environment" // direct open camera on mobile!
                    onChange={handleFileChange}
                  />
                  <div className="uploader-prompt">
                    <Camera size={28} />
                    <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>Chụp ảnh hoặc Quay video</span>
                    <span style={{ fontSize: '0.75rem' }}>(Hỗ trợ tải lên nhiều file cùng lúc)</span>
                  </div>
                </div>

                {/* Display selected files thumbnails */}
                {mediaFiles.length > 0 && (
                  <div className="thumbnail-grid">
                    {mediaFiles.map((media, idx) => (
                      <div key={idx} className="thumbnail-wrapper">
                        {media.type === 'video' ? (
                          <video src={media.previewUrl} className="thumbnail-video" />
                        ) : (
                          <img src={media.previewUrl} alt="" className="thumbnail-img" />
                        )}
                        {media.isUploading && (
                          <div style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'rgba(0,0,0,0.5)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white'
                          }}>
                            <RefreshCw size={16} className="spin" />
                          </div>
                        )}
                        <button 
                          type="button" 
                          className="remove-media-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveMedia(idx);
                          }}
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Ghi chú thêm</label>
                <textarea 
                  className="form-control"
                  rows="3"
                  placeholder="Ghi chú thêm về trạng thái, hư hỏng..."
                  value={ghichu}
                  onChange={(e) => setGhichu(e.target.value)}
                ></textarea>
              </div>

              <button 
                type="submit" 
                className="btn btn-primary btn-block"
                disabled={submitting}
              >
                <Save size={18} />
                {submitting ? 'Đang lưu...' : 'Lưu bản ghi khảo sát'}
              </button>
            </form>
          </div>
        ) : (
          /* RECORDS LIST VIEW */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            {/* Search inputs */}
            <div className="search-filter-container">
              <div className="search-input-wrapper">
                <Search size={16} className="search-icon" />
                <input 
                  type="text" 
                  className="form-control search-input" 
                  placeholder="Tìm kiếm địa chỉ, cáp, đơn vị..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              {searchTerm && (
                <button 
                  className="btn btn-secondary"
                  onClick={() => setSearchTerm('')}
                  style={{ padding: '10px' }}
                >
                  Xóa
                </button>
              )}
            </div>

            {/* List */}
            {loading && records.length === 0 ? (
              <div className="empty-state">
                <RefreshCw size={32} className="spin" />
                <p>Đang tải dữ liệu...</p>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="empty-state">
                <Database size={32} />
                <p>{searchTerm ? 'Không tìm thấy bản ghi phù hợp' : 'Chưa có bản ghi khảo sát nào'}</p>
              </div>
            ) : (
              <div className="record-list">
                {filteredRecords.map((record) => {
                  const parsedCoords = parseDbCoordinate(record.toado);
                  let hinhanhList = [];
                  try {
                    if (record.hinhanh) {
                      hinhanhList = JSON.parse(record.hinhanh);
                    }
                  } catch (e) {
                    if (typeof record.hinhanh === 'string') {
                      hinhanhList = [record.hinhanh];
                    }
                  }

                  return (
                    <div key={record.id} className="record-card">
                      <div className="record-header">
                        <h3 className="record-address">
                          <MapPin size={16} style={{ color: 'var(--primary)' }} />
                          {record.diachi_ham}
                        </h3>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          #{record.id}
                        </span>
                      </div>

                      <div className="record-meta-grid">
                        <div className="meta-item">
                          <span>Đơn vị:</span>
                          <strong>{record.donvi || '—'}</strong>
                        </div>
                        <div className="meta-item">
                          <span>Cáp:</span>
                          <strong>{record.cable || '—'}</strong>
                        </div>
                        <div className="meta-item">
                          <span>Loại (Lopi):</span>
                          <strong>{record.lopi || '—'}</strong>
                        </div>
                      </div>

                      {parsedCoords && (
                        <div className="record-gps">
                          <Compass size={12} />
                          <span>{parsedCoords.latitude.toFixed(6)}, {parsedCoords.longitude.toFixed(6)}</span>
                          <a 
                            href={`https://www.google.com/maps/search/?api=1&query=${parsedCoords.latitude},${parsedCoords.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ marginLeft: '4px', textDecoration: 'underline', fontSize: '0.75rem' }}
                          >
                            Bản đồ
                          </a>
                        </div>
                      )}

                      {record.ghichu && (
                        <div className="record-note">
                          {record.ghichu}
                        </div>
                      )}

                      {/* Display media records attachments */}
                      {hinhanhList && hinhanhList.length > 0 && (
                        <div className="record-media-row">
                          {hinhanhList.map((url, idx) => renderMediaPreview(url, idx))}
                        </div>
                      )}

                      <div className="record-actions">
                        <button 
                          className="btn btn-accent"
                          style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                          onClick={() => {
                            // Copy this record values to Survey Form
                            setDiachiHam(record.diachi_ham || '');
                            setCable(record.cable || '');
                            setDonvi(record.donvi || '');
                            setLopi(record.lopi || '');
                            setGhichu(record.ghichu || '');
                            setActiveTab('survey');
                            showToast('Đã chép thông tin vào form khảo sát!', 'success');
                          }}
                        >
                          <Copy size={12} />
                          Sao chép thông tin
                        </button>
                        <button 
                          className="btn btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '0.8rem', color: 'var(--danger)' }}
                          onClick={() => handleDeleteRecord(record.id)}
                        >
                          <Trash2 size={12} />
                          Xóa
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Settings Modal (Supabase credentials configuration) */}
      {showSettings && (
        <div className="settings-overlay">
          <div className="settings-modal">
            <div className="modal-header">
              <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Settings size={20} />
                Cấu hình Kết nối Supabase
              </h2>
              {config.url && config.key && (
                <button className="icon-btn" style={{ color: 'var(--text-main)', background: 'none' }} onClick={() => setShowSettings(false)}>
                  <X size={20} />
                </button>
              )}
            </div>
            
            <div className="modal-body">
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Dữ liệu được lưu trữ trực tiếp vào cơ sở dữ liệu Supabase của bạn. Vui lòng nhập thông số kết nối.
              </p>
              
              <div className="form-group">
                <label className="form-label">Supabase URL</label>
                <input 
                  type="text"
                  className="form-control"
                  placeholder="https://xxxxxx.supabase.co"
                  value={dbUrl}
                  onChange={(e) => setDbUrl(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Supabase Anon Key (API key)</label>
                <input 
                  type="password"
                  className="form-control"
                  placeholder="eyJhbGciOiJIUzI1NiIsIn..."
                  value={dbKey}
                  onChange={(e) => setDbKey(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Tên Bảng Dữ Liệu (Table Name)</label>
                <input 
                  type="text"
                  className="form-control"
                  placeholder="kiemtrahatang"
                  value={dbTable}
                  onChange={(e) => setDbTable(e.target.value)}
                />
              </div>
            </div>

            <div className="modal-footer">
              {config.url && config.key && (
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowSettings(false)}
                >
                  Đóng
                </button>
              )}
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={handleSaveSettings}
              >
                Kết nối & Lưu cấu hình
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Media Viewer Modal */}
      {previewMedia && (
        <div className="media-viewer-overlay" onClick={() => setPreviewMedia(null)}>
          <div className="media-viewer-content" onClick={e => e.stopPropagation()}>
            <button className="media-viewer-close" onClick={() => setPreviewMedia(null)}>
              <X size={24} />
            </button>
            {previewMedia.type === 'video' ? (
              <video 
                src={previewMedia.url} 
                controls 
                autoPlay 
                className="media-viewer-video" 
              />
            ) : (
              <img 
                src={previewMedia.url} 
                alt="Xem ảnh lớn" 
                className="media-viewer-img" 
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default App;
