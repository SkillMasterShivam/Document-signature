import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set worker source for react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

interface DocMetadata {
  _id: string;
  originalName: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  createdAt: string;
}

interface Signature {
  _id: string;
  fileId: string;
  x: number;
  y: number;
  page: number;
  status?: string;
}

const Dashboard = () => {
  const [documents, setDocuments] = useState<DocMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Preview State
  const [selectedDoc, setSelectedDoc] = useState<DocMetadata | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [draggingSigId, setDraggingSigId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [signedPdfUrl, setSignedPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  useEffect(() => {
    if (selectedDoc) {
      fetchSignatures(selectedDoc._id);
    } else {
      setSignatures([]);
    }
  }, [selectedDoc]);

  const fetchDocuments = async () => {
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch('http://localhost:5000/api/docs', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      const data = await res.json();
      if (data.success) {
        setDocuments(data.documents);
      } else {
        setError(data.message || 'Failed to fetch documents');
      }
    } catch (err) {
      setError('API failure: Could not connect to the server');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      setUploading(true);
      const token = localStorage.getItem('token') || '';
      const res = await fetch('http://localhost:5000/api/docs/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        fetchDocuments(); // Refresh list
      } else {
        alert(data.message || 'Upload failed');
      }
    } catch (err) {
      console.error('Upload error', err);
      alert('Upload failed');
    } finally {
      setUploading(false);
      e.target.value = ''; // Reset input
    }
  };

  const fetchSignatures = async (documentId: string) => {
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`http://localhost:5000/api/signatures/${documentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setSignatures(data.signatures);
      }
    } catch (err) {
      console.error('Failed to fetch signatures', err);
    }
  };

  const handlePdfClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!selectedDoc || draggingSigId) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch('http://localhost:5000/api/signatures', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          fileId: selectedDoc._id,
          x,
          y,
          page: pageNumber
        })
      });
      const data = await res.json();
      if (data.success) {
        setSignatures(prev => [...prev, data.signature]);
      }
    } catch (err) {
      console.error('Failed to save signature', err);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>, sigId: string) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDraggingSigId(sigId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingSigId) return;
    
    const parentRect = e.currentTarget.parentElement?.getBoundingClientRect();
    if (!parentRect) return;

    const x = ((e.clientX - parentRect.left) / parentRect.width) * 100;
    const y = ((e.clientY - parentRect.top) / parentRect.height) * 100;

    const constrainedX = Math.max(0, Math.min(100, x));
    const constrainedY = Math.max(0, Math.min(100, y));

    setSignatures(prev => prev.map(sig => 
      sig._id === draggingSigId 
        ? { ...sig, x: constrainedX, y: constrainedY } 
        : sig
    ));
  };

  const handlePointerUp = async (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingSigId) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    
    const movedSig = signatures.find(s => s._id === draggingSigId);
    setDraggingSigId(null);
    
    if (movedSig) {
      try {
        const token = localStorage.getItem('token') || '';
        await fetch('http://localhost:5000/api/signatures', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            id: movedSig._id,
            fileId: movedSig.fileId,
            x: movedSig.x,
            y: movedSig.y,
            page: movedSig.page
          })
        });
      } catch (err) {
        console.error('Failed to update signature', err);
      }
    }
  };

  const handleFinalize = async () => {
    if (!selectedDoc) return;
    try {
      setFinalizing(true);
      const token = localStorage.getItem('token') || '';
      const res = await fetch('http://localhost:5000/api/signatures/finalize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ fileId: selectedDoc._id })
      });
      const data = await res.json();
      if (data.success) {
        setSignedPdfUrl(`http://localhost:5000${data.signedPdfPath}`);
      } else {
        alert(data.message || 'Failed to finalize');
      }
    } catch (err) {
      console.error(err);
      alert('Error finalizing document');
    } finally {
      setFinalizing(false);
    }
  };

  const handleInvite = async (documentId: string, email: string) => {
    if (!email) return;
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch('http://localhost:5000/api/signatures/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ documentId, email })
      });
      const data = await res.json();
      if (data.success) {
        alert('Invitation sent successfully!');
      } else {
        alert(data.message || 'Failed to send invitation');
      }
    } catch (err) {
      console.error(err);
      alert('Error sending invitation');
    }
  };

  const openPreview = (doc: DocMetadata) => {
    setSelectedDoc(doc);
    setPageNumber(1);
    setPreviewError(null);
    setSignedPdfUrl(null);
  };

  const closePreview = () => {
    setSelectedDoc(null);
    setSignedPdfUrl(null);
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPreviewError(null);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('PDF Load Error:', error);
    setPreviewError('Failed to load PDF file. The file may be missing or invalid.');
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) return <div className="p-8 text-center text-xl text-gray-600">Loading your documents...</div>;
  if (error) return <div className="p-8 text-center text-red-500 font-bold text-xl">{error}</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">My Documents Dashboard</h1>
        <div>
          <label className="bg-green-600 text-white px-4 py-2 rounded font-medium hover:bg-green-700 cursor-pointer shadow-sm">
            {uploading ? 'Uploading...' : 'Upload PDF'}
            <input 
              type="file" 
              accept="application/pdf" 
              onChange={handleFileUpload} 
              disabled={uploading}
              className="hidden" 
            />
          </label>
        </div>
      </div>
      
      {documents.length === 0 ? (
        <div className="text-center p-12 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-500 text-lg">You haven't uploaded any documents yet.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => (
            <div key={doc._id} className="border border-gray-200 p-5 rounded-lg shadow-sm hover:shadow-md transition-shadow bg-white flex flex-col justify-between">
              <div>
                <h3 className="font-semibold text-lg truncate mb-3 text-gray-800" title={doc.originalName}>
                  {doc.originalName}
                </h3>
                <div className="space-y-1">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Size:</span> {formatSize(doc.fileSize)}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Uploaded:</span> {new Date(doc.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="mt-5 space-y-2">
                <button 
                  onClick={() => openPreview(doc)}
                  className="w-full bg-blue-600 text-white py-2.5 px-4 rounded font-medium hover:bg-blue-700 transition-colors focus:ring-4 focus:ring-blue-200"
                >
                  Preview PDF
                </button>
                <div className="flex gap-2">
                  <input 
                    type="email" 
                    placeholder="Signer email" 
                    className="flex-1 border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyDown={(e) => {
                      if(e.key === 'Enter') {
                        handleInvite(doc._id, e.currentTarget.value);
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                  <button 
                    onClick={(e) => {
                      const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                      handleInvite(doc._id, input.value);
                      input.value = '';
                    }}
                    className="bg-gray-800 text-white px-3 rounded text-sm hover:bg-gray-900 transition-colors"
                  >
                    Invite
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedDoc && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            
            <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
              <h2 className="font-semibold text-lg truncate pr-4 text-gray-800">{selectedDoc.originalName}</h2>
              <div className="flex items-center gap-4">
                {signedPdfUrl ? (
                  <a href={signedPdfUrl} target="_blank" rel="noreferrer" className="text-green-600 font-bold underline text-sm">
                    Download Signed PDF
                  </a>
                ) : (
                  <button 
                    onClick={handleFinalize} 
                    disabled={finalizing || signatures.length === 0} 
                    className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700"
                  >
                    {finalizing ? 'Finalizing...' : 'Finalize Document'}
                  </button>
                )}
                <button 
                  onClick={closePreview}
                  className="text-gray-500 hover:text-red-500 font-bold text-2xl px-2 leading-none"
                  aria-label="Close"
                >
                  &times;
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 bg-gray-200 flex flex-col items-center justify-start min-h-[50vh]">
              {previewError ? (
                <div className="text-red-500 text-center p-8 font-medium bg-white rounded shadow-sm mt-8">
                  {previewError}
                </div>
              ) : (
                <Document
                  file={`http://localhost:5000/uploads/${selectedDoc.fileName}`}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={onDocumentLoadError}
                  loading={<div className="p-8 text-gray-600 font-medium">Loading PDF document...</div>}
                >
                  <div className="relative inline-block cursor-crosshair shadow-lg border border-gray-300" onClick={handlePdfClick}>
                    <Page 
                      pageNumber={pageNumber} 
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                      width={Math.min(window.innerWidth * 0.8, 800)}
                    />
                    {signatures
                      .filter(sig => sig.page === pageNumber)
                      .map(sig => (
                        <div 
                          key={sig._id}
                          onPointerDown={(e) => handlePointerDown(e, sig._id)}
                          onPointerMove={handlePointerMove}
                          onPointerUp={handlePointerUp}
                          className={`absolute border-2 border-dashed flex items-center justify-center font-bold px-4 py-2 rounded select-none ${
                            draggingSigId === sig._id 
                              ? 'border-blue-800 bg-blue-200/70 text-blue-900 cursor-grabbing z-50 shadow-xl scale-105 transition-transform' 
                              : 'border-blue-600 bg-blue-100/50 text-blue-800 cursor-grab hover:bg-blue-200/60 z-40 transition-colors'
                          }`}
                          style={{
                            left: `${sig.x}%`,
                            top: `${sig.y}%`,
                            transform: draggingSigId === sig._id ? 'translate(-50%, -50%) scale(1.05)' : 'translate(-50%, -50%)',
                            minWidth: '100px',
                            touchAction: 'none'
                          }}
                        >
                          Sign Here
                        </div>
                      ))}
                  </div>
                </Document>
              )}
            </div>

            {!previewError && numPages > 0 && (
              <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                <button 
                  disabled={pageNumber <= 1} 
                  onClick={() => setPageNumber(prev => prev - 1)}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded shadow-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                >
                  Previous
                </button>
                
                <span className="text-sm font-medium text-gray-700">
                  Page {pageNumber} of {numPages}
                </span>

                <button 
                  disabled={pageNumber >= numPages} 
                  onClick={() => setPageNumber(prev => prev + 1)}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded shadow-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                >
                  Next
                </button>
              </div>
            )}
            
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
