import { useEffect, useState } from 'react';
import './App.css';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import heic2any from "heic2any";

// Draggable + selectable image card
function SortableImage({ src, id, onDelete, size, selectMode, selected, onSelect }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    border: selectMode && selected ? '3px solid #ff69b4' : 'none',
    cursor: selectMode ? 'pointer' : 'default'
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(selectMode ? {} : { ...attributes, ...listeners })}
      className={`thumbnail-wrapper ${size}`}
      onClick={() => {
        if (selectMode) onSelect(id);
      }}
    >
      <img src={src} alt="gallery" className={`thumbnail ${size}`} />
      {!selectMode && (
        <>
          <button
            className="delete-btn"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(id);
            }}
          >
            ✕
          </button>
          <a
            className="download-btn"
            href={src}
            download={`em-and-me-${size}.jpg`}
            onClick={(e) => e.stopPropagation()}
          >
            ⬇
          </a>
        </>
      )}
    </div>
  );
}

function App() {
  const [images, setImages] = useState([]);
  const [notes, setNotes] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [imageSize, setImageSize] = useState('grid2'); // ✅ NEW DEFAULT

  const [tab, setTab] = useState('gallery');
  const [imageUrl, setImageUrl] = useState('');
  const [selectMode, setSelectMode] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10, // Start dragging after finger moves 10px (prevents accidental drag)
      },
    })
  );
  const [isDragging, setIsDragging] = useState(false);



  

  // Load saved state on mount
  useEffect(() => {
    const savedNotes = localStorage.getItem('notes');
    const savedImages = localStorage.getItem('images');
    const savedTheme = localStorage.getItem('darkMode');
    const savedSize = localStorage.getItem('imageSize');

    if (savedNotes) setNotes(savedNotes);
    if (savedImages) {
      try {
        const parsed = JSON.parse(savedImages);
        if (Array.isArray(parsed)) setImages(parsed);
      } catch (err) {
        console.error('Failed to parse saved images:', err);
      }
    }
    if (savedTheme) setDarkMode(JSON.parse(savedTheme));
    if (savedSize) setImageSize(savedSize);
  }, []);

  // Save state on changes
  useEffect(() => {
    localStorage.setItem('notes', notes);
  }, [notes]);

  useEffect(() => {
    localStorage.setItem('images', JSON.stringify(images));
  }, [images]);

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('imageSize', imageSize);
  }, [imageSize]);

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
  
    const readFileAsDataURL = (file) =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
  
    const convertIfHeic = async (file) => {
      if (file.type === "image/heic" || file.name.endsWith(".heic")) {
        try {
          const convertedBlob = await heic2any({ blob: file, toType: "image/jpeg" });
          return await readFileAsDataURL(convertedBlob);
        } catch (err) {
          console.error("HEIC conversion failed:", err);
          return null;
        }
      } else {
        return await readFileAsDataURL(file);
      }
    };
  
    const imageData = await Promise.all(
      files.map((file) => convertIfHeic(file))
    );
  
    const validImages = imageData.filter(Boolean); // remove failed conversions
    setImages((prev) => [...prev, ...validImages]);
  };

  const handleAddImageUrl = () => {
    if (imageUrl.trim()) {
      setImages((prev) => [...prev, imageUrl.trim()]);
      setImageUrl('');
    }
  };

  const handleDeleteImage = (idToRemove) => {
    setImages((prev) => prev.filter(img => img.trim() !== idToRemove.trim()));
    setSelectedImages((prev) => prev.filter(id => id !== idToRemove));
  };

  const handleDragEnd = ({ active, over }) => {
    if (active.id !== over.id) {
      const oldIndex = images.findIndex(i => i === active.id);
      const newIndex = images.findIndex(i => i === over.id);
      setImages(arrayMove(images, oldIndex, newIndex));
    }
  };

  return (
    <div className={`container ${darkMode ? 'dark' : ''}`}>
      <img
        src="https://emandmestudio.com/cdn/shop/files/black_logo_2x_a2bcf09e-ea61-4b77-8ca2-4f82c02e5c3f_500x.png?v=1619480991"
        alt="Em & Me Studio Logo"
        style={{ height: '50px', marginBottom: '0.5rem' }}
      />

      <button className="toggle floating-toggle" onClick={() => setDarkMode(!darkMode)}>
        {darkMode ? '☀️ Light' : '🌙 Dark'}
      </button>

      <div className="tabs">
        <button onClick={() => setTab('gallery')} className={tab === 'gallery' ? 'active' : ''}>Gallery</button>
        <button onClick={() => setTab('notes')} className={tab === 'notes' ? 'active' : ''}>Notes</button>
      </div>

      {tab === 'gallery' && (
        <div>
          <input type="file" multiple onChange={handleImageUpload} />
          <div style={{ marginTop: '1rem' }}>
            <input
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="Paste image URL here"
              style={{ width: '80%', padding: '8px' }}
            />
            <button onClick={handleAddImageUrl} style={{ marginLeft: '8px', padding: '8px 12px' }}>
              Add
            </button>
          </div>

          <div
  className={`dropzone ${isDragging ? 'drag-active' : ''}`}
  onDragOver={(e) => {
    e.preventDefault();
    setIsDragging(true);
  }}
  onDragLeave={() => setIsDragging(false)}
  onDrop={(e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    handleImageUpload({ target: { files } });
  }}
  onClick={() => document.getElementById('fileInput').click()}
>
  <p>{isDragging ? '🎯 Drop to add' : '📎 Drag & drop images here or tap to upload'}</p>
  <input
    id="fileInput"
    type="file"
    accept="image/*"
    multiple
    onChange={handleImageUpload}
    style={{ display: 'none' }}
  />
</div>


          

          <div style={{ margin: '1rem 0' }}>
            <div className="view-buttons">
              <strong>View:</strong>{' '}
              <button onClick={() => setImageSize('small')}>Small</button>
              <button onClick={() => setImageSize('medium')}>Medium</button>
              <button onClick={() => setImageSize('large')}>Large</button>
              <button onClick={() => setImageSize('original')}>Original</button>
            </div>

            <button onClick={() => setSelectMode(!selectMode)}>
              {selectMode ? 'Cancel Select' : 'Select Images'}
            </button>

            {selectMode && selectedImages.length > 0 && (
              <button
                onClick={() => {
                  const remaining = images.filter(img => !selectedImages.includes(img));
                  setImages(remaining);
                  setSelectedImages([]);
                }}
                style={{ marginLeft: '10px', background: '#e60000', color: 'white', padding: '6px 12px' }}
              >
                Delete Selected ({selectedImages.length})
              </button>
            )}
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={images} strategy={verticalListSortingStrategy}>
              <div className="gallery">
                {images.map((src) => (
                  <SortableImage
                    key={src}
                    id={src}
                    src={src}
                    size={imageSize}
                    onDelete={handleDeleteImage}
                    selectMode={selectMode}
                    selected={selectedImages.includes(src)}
                    onSelect={(imgId) => {
                      setSelectedImages((prev) =>
                        prev.includes(imgId)
                          ? prev.filter(id => id !== imgId)
                          : [...prev, imgId]
                      );
                    }}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {tab === 'notes' && (
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Write your notes here..."
          className="notes"
        />
      )}
    </div>
  );
}

export default App;
