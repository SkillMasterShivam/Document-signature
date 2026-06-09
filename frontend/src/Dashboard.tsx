import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

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

const Dashboard = () => {
  const [documents, setDocuments] = useState<DocMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Preview State
  const [selectedDoc, setSelectedDoc] = useState<DocMetadata | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

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

  const openPreview = (doc: DocMetadata) => {
    setSelectedDoc(doc);
    setPageNumber(1);
    setPreviewError(null);
  };

  const closePreview = () => {
    setSelectedDoc(null);
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
      <h1 className="text-3xl font-bold mb-8 text-gray-800">My Documents Dashboard</h1>
      
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
              <button 
                onClick={() => openPreview(doc)}
                className="mt-5 w-full bg-blue-600 text-white py-2.5 px-4 rounded font-medium hover:bg-blue-700 transition-colors focus:ring-4 focus:ring-blue-200"
              >
                Preview PDF
              </button>
            </div>
          ))}
        </div>
      )}

      {selectedDoc && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            
            <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
              <h2 className="font-semibold text-lg truncate pr-4 text-gray-800">{selectedDoc.originalName}</h2>
              <button 
                onClick={closePreview}
                className="text-gray-500 hover:text-red-500 font-bold text-2xl px-2 leading-none"
                aria-label="Close"
              >
                &times;
              </button>
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
                  <Page 
                    pageNumber={pageNumber} 
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    className="shadow-lg border border-gray-300"
                    width={Math.min(window.innerWidth * 0.8, 800)}
                  />
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
