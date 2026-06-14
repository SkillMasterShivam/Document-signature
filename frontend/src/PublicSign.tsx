import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import { motion } from 'framer-motion';
import { FileSignature, ShieldCheck, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
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
  const [isSigning, setIsSigning] = useState(false);

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
    setIsSigning(true);
    try {
      const res = await fetch(`http://localhost:5000/api/signatures/public/${token}/sign`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        setSigned(true);
        toast.success('Document signed successfully!');
      } else {
        toast.error(data.message || 'Failed to sign.');
      }
    } catch (err) {
      toast.error('Network error while signing.');
    } finally {
      setIsSigning(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-slate-500 font-medium animate-pulse">Establishing secure connection...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-8 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 max-w-md w-full text-center"
      >
        <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-semibold text-slate-900 mb-2 tracking-tight">Invalid Link</h2>
        <p className="text-slate-500 mb-6">{error}</p>
        <button onClick={() => window.location.reload()} className="w-full bg-slate-900 text-white font-medium py-3 rounded-xl hover:bg-slate-800 transition-all">
          Try Again
        </button>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100/50 flex flex-col font-sans selection:bg-primary/20">
      <Toaster position="top-center" />
      
      {/* Top Navigation Bar */}
      <nav className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-white/10 text-white rounded-lg flex items-center justify-center border border-white/10">
            <FileSignature className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-white/90">Review & Sign Document</h1>
            <p className="text-slate-400 text-xs font-medium flex items-center gap-1.5 mt-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Secure Encrypted Connection
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {signed ? (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-4 py-2.5 rounded-lg border border-emerald-500/20 font-medium"
            >
              <CheckCircle2 className="w-5 h-5" />
              Signed Successfully
            </motion.div>
          ) : (
            <button 
              onClick={handleSign}
              disabled={isSigning}
              className="bg-primary text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-all shadow-sm shadow-primary/20 focus:ring-4 focus:ring-primary/30 flex items-center gap-2 disabled:opacity-70"
            >
              {isSigning && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSigning ? 'Signing...' : 'Click to Sign'}
            </button>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col lg:flex-row gap-6 p-6 max-w-[1600px] mx-auto w-full h-[calc(100vh-76px)]">
        
        {/* Left Sidebar - Doc Info */}
        <div className="hidden lg:flex w-80 flex-col gap-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">Document Details</h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1">File Name</p>
                <p className="text-sm text-slate-900 font-medium truncate" title={documentInfo?.originalName}>
                  {documentInfo?.originalName}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1">Status</p>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                  <span className={`w-2 h-2 rounded-full ${signed ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></span>
                  {signed ? 'Completed' : 'Awaiting Signature'}
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1">Sent to</p>
                <p className="text-sm text-slate-900 font-medium truncate">{invitation?.signerEmail}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 text-blue-800 rounded-2xl border border-blue-100 p-6 flex-1">
            <h3 className="font-semibold mb-2">Instructions</h3>
            <p className="text-sm text-blue-700/80 leading-relaxed">
              Please review the document carefully. Once you are ready, click the "Click to Sign" button at the top right to legally bind your signature.
            </p>
          </div>
        </div>

        {/* PDF Viewer */}
        <div className="flex-1 bg-slate-200/50 rounded-2xl border border-slate-200 overflow-hidden flex flex-col relative shadow-inner">
          <div className="flex-1 overflow-auto p-4 md:p-8 flex justify-center items-start custom-scrollbar">
            <Document
              file={`http://localhost:5000/uploads/${documentInfo?.fileName}`}
              onLoadSuccess={({ numPages }) => setNumPages(numPages)}
              loading={
                <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <p className="font-medium">Rendering document...</p>
                </div>
              }
            >
              <div className="relative shadow-xl border border-slate-200 bg-white ring-1 ring-black/5 mx-auto transition-all">
                <Page 
                  pageNumber={pageNumber} 
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  width={Math.min(window.innerWidth * 0.85, 850)}
                  className="rounded"
                />
                {!signed && (
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.5, type: "spring" }}
                    className="absolute border-2 border-primary bg-primary/10 text-primary font-semibold px-6 py-3 rounded-lg shadow-lg backdrop-blur-sm"
                    style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
                  >
                    Signature Required
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-ping"></div>
                  </motion.div>
                )}
                {signed && (
                  <motion.div 
                    initial={{ scale: 1.5, opacity: 0, rotate: -10 }}
                    animate={{ scale: 1, opacity: 1, rotate: -5 }}
                    className="absolute font-bold text-3xl text-slate-800 px-6 py-3 select-none flex flex-col items-center"
                    style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontFamily: 'cursive' }}
                  >
                    <span className="opacity-80 italic">{invitation?.signerEmail}</span>
                    <div className="text-xs font-sans text-emerald-600 not-italic mt-2 text-center bg-white/95 backdrop-blur-sm rounded-md px-3 py-1.5 shadow-sm border border-emerald-100 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Verified Digital Signature
                    </div>
                  </motion.div>
                )}
              </div>
            </Document>
          </div>

          {/* PDF Toolbar */}
          {numPages > 0 && (
            <div className="h-16 bg-white border-t border-slate-200 px-6 flex items-center justify-center gap-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
              <button 
                disabled={pageNumber <= 1} 
                onClick={() => setPageNumber(prev => prev - 1)}
                className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="text-sm font-medium text-slate-600 bg-slate-100 px-4 py-1.5 rounded-full">
                Page {pageNumber} of {numPages}
              </div>
              <button 
                disabled={pageNumber >= numPages} 
                onClick={() => setPageNumber(prev => prev + 1)}
                className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default PublicSign;
