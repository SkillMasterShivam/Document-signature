import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const PublicSign = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [documentInfo, setDocumentInfo] = useState<any>(null);
  const [invitation, setInvitation] = useState<any>(null);

  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [signed, setSigned] = useState(false);

  useEffect(() => {
    const fetchPublicDoc = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/signatures/public/${token}`);
        const data = await res.json();
        if (data.success) {
          setDocumentInfo(data.document);
          setInvitation(data.invitation);
        } else {
          setError(data.message || 'Invalid or expired link.');
        }
      } catch (err) {
        setError('Server error while verifying link.');
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchPublicDoc();
  }, [token]);

  const handleSign = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/signatures/public/${token}/sign`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        setSigned(true);
      } else {
        alert(data.message || 'Failed to sign.');
      }
    } catch (err) {
      alert('Network error while signing.');
    }
  };

  if (loading) return <div className="p-8 text-center text-xl text-gray-600">Verifying secure link...</div>;
  if (error) return <div className="p-8 text-center text-red-500 font-bold text-xl">{error}</div>;

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-xl overflow-hidden">
        
        <div className="bg-blue-600 text-white p-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Secure Document Signing</h1>
            <p className="opacity-90 mt-1">
              You've been invited to sign: <strong>{documentInfo?.originalName}</strong>
            </p>
          </div>
          {signed ? (
            <div className="bg-green-500 px-4 py-2 rounded font-bold">Signed Successfully!</div>
          ) : (
            <button 
              onClick={handleSign}
              className="bg-white text-blue-700 px-6 py-2 rounded-lg font-bold hover:bg-gray-10 transition-colors shadow"
            >
              Click to Sign
            </button>
          )}
        </div>

        <div className="p-4 bg-gray-200 flex flex-col items-center justify-start min-h-[60vh] overflow-auto">
          <Document
            file={`http://localhost:5000/uploads/${documentInfo?.fileName}`}
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            loading={<div className="p-8 font-medium">Loading document...</div>}
          >
            <div className="relative shadow-lg border border-gray-300">
              <Page 
                pageNumber={pageNumber} 
                renderTextLayer={false}
                renderAnnotationLayer={false}
                width={Math.min(window.innerWidth * 0.9, 800)}
              />
              {/* Dummy Placeholder for Day 9 requirements */}
              {!signed && (
                <div 
                  className="absolute border-2 border-blue-600 bg-blue-100/50 text-blue-800 font-bold px-4 py-2 rounded select-none shadow-xl animate-pulse"
                  style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
                >
                  Sign Here
                </div>
              )}
              {signed && (
                <div 
                  className="absolute font-bold text-xl text-blue-900 italic px-4 py-2 select-none"
                  style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontFamily: 'cursive' }}
                >
                  {invitation?.signerEmail} (Signed)
                </div>
              )}
            </div>
          </Document>
        </div>

        {numPages > 0 && (
          <div className="p-4 bg-gray-50 flex items-center justify-between border-t border-gray-200">
            <button 
              disabled={pageNumber <= 1} 
              onClick={() => setPageNumber(prev => prev - 1)}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded font-medium disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm font-medium text-gray-700">Page {pageNumber} of {numPages}</span>
            <button 
              disabled={pageNumber >= numPages} 
              onClick={() => setPageNumber(prev => prev + 1)}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded font-medium disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default PublicSign;
