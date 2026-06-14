import React, { useState, useEffect, useMemo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import { 
  FileText, LayoutDashboard, Settings, FileSignature, Shield, 
  Download, Upload, X, Search as SearchIcon, Filter, 
  Loader2, LogOut, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight,
  Send, MoreVertical, Clock, FileWarning
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

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
  rejectionReason?: string;
  signedAt?: string;
}

const StatusBadge = ({ status }: { status?: string }) => {
  const s = status || 'Pending';
  if (s === 'Signed') return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle2 className="w-3.5 h-3.5"/>Signed</span>;
  if (s === 'Rejected') return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200"><AlertCircle className="w-3.5 h-3.5"/>Rejected</span>;
  return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200"><Clock className="w-3.5 h-3.5"/>Pending</span>;
};

const StatCard = ({ title, value, icon, colorClass, delay }: any) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay }}
    className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group"
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <p className="text-3xl font-bold text-slate-800 mt-2 tracking-tight">{value}</p>
      </div>
      <div className={`p-4 rounded-xl ${colorClass} bg-opacity-10 transition-transform group-hover:scale-110`}>
        {icon}
      </div>
    </div>
  </motion.div>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<DocMetadata[]>([]);
  const [docStatuses, setDocStatuses] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, pending: 0, signed: 0, rejected: 0 });
  
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const [selectedDoc, setSelectedDoc] = useState<DocMetadata | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [previewError, setPreviewError] = useState<string | null>(null);
  
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [draggingSigId, setDraggingSigId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [signedPdfUrl, setSignedPdfUrl] = useState<string | null>(null);
  
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [showAudit, setShowAudit] = useState(false);
  
  const [rejectingSigId, setRejectingSigId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

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

  const fetchSignaturesForAllDocs = async (docs: DocMetadata[]) => {
    const newStatuses: Record<string, string> = {};
    let tTotal = docs.length;
    let tPending = 0;
    let tSigned = 0;
    let tRejected = 0;

    await Promise.all(docs.map(async (doc) => {
      try {
        const token = localStorage.getItem('token') || '';
        const res = await fetch(`http://localhost:5000/api/signatures/${doc._id}`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        let status = 'Pending';
        if (data.success && data.signatures.length > 0) {
          const sigs: Signature[] = data.signatures;
          if (sigs.some(s => s.status === 'Rejected')) status = 'Rejected';
          else if (sigs.every(s => s.status === 'Signed')) status = 'Signed';
          else status = 'Pending';
        }
        newStatuses[doc._id] = status;

        if (status === 'Pending') tPending++;
        else if (status === 'Signed') tSigned++;
        else if (status === 'Rejected') tRejected++;
      } catch (err) {
        newStatuses[doc._id] = 'Pending';
        tPending++;
      }
    }));
    
    setDocStatuses(newStatuses);
    setStats({ total: tTotal, pending: tPending, signed: tSigned, rejected: tRejected });
  };

  const fetchDocuments = async () => {
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch('http://localhost:5000/api/docs', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) {
        setDocuments(data.documents);
        await fetchSignaturesForAllDocs(data.documents);
      } else {
        toast.error(data.message || 'Failed to fetch documents');
      }
    } catch (err) {
      toast.error('Could not connect to the server');
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
      toast.loading('Uploading document...', { id: 'upload' });
      const token = localStorage.getItem('token') || '';
      const res = await fetch('http://localhost:5000/api/docs/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Document uploaded successfully', { id: 'upload' });
        fetchDocuments();
      } else {
        toast.error(data.message || 'Upload failed', { id: 'upload' });
      }
    } catch (err) {
      toast.error('Upload failed', { id: 'upload' });
    } finally {
      setUploading(false);
      e.target.value = '';
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
      console.error(err);
    }
  };

  const handlePdfClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!selectedDoc || draggingSigId) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const toastId = toast.loading('Adding signature field...');
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch('http://localhost:5000/api/signatures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fileId: selectedDoc._id, x, y, page: pageNumber })
      });
      const data = await res.json();
      if (data.success) {
        setSignatures(prev => [...prev, data.signature]);
        fetchSignaturesForAllDocs(documents);
        toast.success('Field added', { id: toastId });
      } else {
        toast.error('Failed to add field', { id: toastId });
      }
    } catch (err) {
      toast.error('Network error', { id: toastId });
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

    setSignatures(prev => prev.map(sig => sig._id === draggingSigId ? { ...sig, x: constrainedX, y: constrainedY } : sig));
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
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ id: movedSig._id, fileId: movedSig.fileId, x: movedSig.x, y: movedSig.y, page: movedSig.page })
        });
      } catch (err) {}
    }
  };

  const handleFinalize = async () => {
    if (!selectedDoc) return;
    setFinalizing(true);
    const toastId = toast.loading('Finalizing document...');
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch('http://localhost:5000/api/signatures/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fileId: selectedDoc._id })
      });
      const data = await res.json();
      if (data.success) {
        setSignedPdfUrl(`http://localhost:5000${data.signedPdfPath}`);
        toast.success('Document finalized!', { id: toastId });
      } else {
        toast.error(data.message || 'Failed to finalize', { id: toastId });
      }
    } catch (err) {
      toast.error('Error finalizing document', { id: toastId });
    } finally {
      setFinalizing(false);
    }
  };

  const handleStatusUpdate = async (sigId: string, status: string) => {
    if (status === 'Rejected' && (!rejectReason || rejectReason.trim() === '')) {
      toast.error("Please enter a rejection reason.");
      return;
    }

    const toastId = toast.loading('Updating status...');
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`http://localhost:5000/api/signatures/${sigId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, reason: status === 'Rejected' ? rejectReason : undefined })
      });
      const data = await res.json();
      if (data.success) {
        setSignatures(prev => prev.map(s => s._id === sigId ? data.signature : s));
        setRejectingSigId(null);
        setRejectReason('');
        fetchSignaturesForAllDocs(documents);
        toast.success(`Signature ${status.toLowerCase()}`, { id: toastId });
      } else {
        toast.error(data.message || "Failed to update status", { id: toastId });
      }
    } catch (err) {
      toast.error("Error updating status", { id: toastId });
    }
  };

  const handleInvite = async (documentId: string, email: string | null) => {
    if (!email) return;
    const toastId = toast.loading('Sending invitation...');
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch('http://localhost:5000/api/signatures/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ documentId, email })
      });
      const data = await res.json();
      if (data.success) toast.success('Invitation sent successfully!', { id: toastId });
      else toast.error(data.message || 'Failed to send invitation', { id: toastId });
    } catch (err) {
      toast.error('Error sending invitation', { id: toastId });
    }
  };

  const fetchAuditLogs = async (documentId: string) => {
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`http://localhost:5000/api/audit/${documentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setAuditLogs(data.auditLogs);
    } catch (err) {}
  };

  const openPreview = (doc: DocMetadata) => {
    setSelectedDoc(doc);
    setPageNumber(1);
    setPreviewError(null);
    setSignedPdfUrl(null);
    setShowAudit(false);
    fetchAuditLogs(doc._id);
  };

  const closePreview = () => {
    setSelectedDoc(null);
    setSignedPdfUrl(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredDocs = useMemo(() => {
    return documents.filter(doc => {
      const matchesSearch = doc.originalName.toLowerCase().includes(searchQuery.toLowerCase());
      const status = docStatuses[doc._id] || 'Pending';
      const matchesStatus = statusFilter === 'All' ? true : status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [documents, searchQuery, statusFilter, docStatuses]);

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden selection:bg-primary/20">
      <Toaster position="bottom-right" />
      
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-200 bg-white flex flex-col shadow-sm relative z-20">
        <div className="h-16 px-6 flex items-center gap-2 font-bold text-xl tracking-tight text-slate-800 border-b border-slate-100">
           <div className="bg-primary/10 p-1 rounded-md text-primary">
             <FileSignature className="w-5 h-5" />
           </div>
           DocuFlow
        </div>
        
        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
          <div className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 mt-4 first:mt-0">Menu</div>
          {[
            { name: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
            { name: 'Documents', icon: <FileText className="w-4 h-4" /> },
          ].map(tab => (
            <button
              key={tab.name}
              onClick={() => setActiveTab(tab.name)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.name 
                  ? 'bg-primary/10 text-primary shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {tab.icon}
              {tab.name}
            </button>
          ))}
          
          <div className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 mt-8">Organization</div>
          {[
            { name: 'Signatures', icon: <FileSignature className="w-4 h-4" /> },
            { name: 'Audit Trail', icon: <Shield className="w-4 h-4" /> },
            { name: 'Settings', icon: <Settings className="w-4 h-4" /> },
          ].map(tab => (
            <button
              key={tab.name}
              onClick={() => setActiveTab(tab.name)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.name 
                  ? 'bg-primary/10 text-primary shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {tab.icon}
              {tab.name}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
           <div className="flex items-center gap-3 mb-4">
             <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm shadow-sm ring-2 ring-white">
               U
             </div>
             <div className="flex-1 min-w-0">
               <p className="text-sm font-medium text-slate-900 truncate">Workspace User</p>
               <p className="text-xs text-slate-500 truncate">user@docuflow.app</p>
             </div>
           </div>
           <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100">
             <LogOut className="w-4 h-4" />
             Log out
           </button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Header */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 flex items-center justify-between z-10">
           <div className="flex items-center gap-2">
             <h1 className="text-lg font-semibold text-slate-900 tracking-tight">{activeTab}</h1>
             <ChevronRight className="w-4 h-4 text-slate-400" />
             <span className="text-sm font-medium text-slate-500">Overview</span>
           </div>
           
           {activeTab === 'Documents' && (
             <label className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 cursor-pointer shadow-sm shadow-primary/20 transition-all flex items-center gap-2 focus-within:ring-4 focus-within:ring-primary/20">
               {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
               {uploading ? 'Uploading...' : 'New Document'}
               <input type="file" accept="application/pdf" onChange={handleFileUpload} disabled={uploading} className="hidden" />
             </label>
           )}
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-6xl mx-auto space-y-8">
            
            <AnimatePresence mode="wait">
              {activeTab === 'Dashboard' && (
                <motion.div 
                  key="dashboard"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-8"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                     <StatCard delay={0.0} title="Total Documents" value={stats.total} icon={<FileText className="w-6 h-6 text-blue-600" />} colorClass="bg-blue-600 text-blue-600" />
                     <StatCard delay={0.1} title="Pending Signatures" value={stats.pending} icon={<FileSignature className="w-6 h-6 text-amber-600" />} colorClass="bg-amber-600 text-amber-600" />
                     <StatCard delay={0.2} title="Completed" value={stats.signed} icon={<Shield className="w-6 h-6 text-emerald-600" />} colorClass="bg-emerald-600 text-emerald-600" />
                     <StatCard delay={0.3} title="Needs Attention" value={stats.rejected} icon={<FileWarning className="w-6 h-6 text-rose-600" />} colorClass="bg-rose-600 text-rose-600" />
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm relative overflow-hidden">
                     <div className="absolute top-0 right-0 p-8 opacity-5">
                       <LayoutDashboard className="w-32 h-32" />
                     </div>
                     <div className="relative z-10 max-w-xl">
                       <h2 className="text-xl font-bold text-slate-900 mb-3 tracking-tight">Streamline your agreements</h2>
                       <p className="text-slate-600 text-base leading-relaxed mb-6">
                         You have {stats.pending} documents waiting for signatures. Upload new documents, assign signers, and track progress all in one place.
                       </p>
                       <button onClick={() => setActiveTab('Documents')} className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors shadow-sm">
                         Manage Documents
                       </button>
                     </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'Documents' && (
                <motion.div 
                  key="documents"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden"
                >
                   {/* Table Toolbar */}
                   <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-50/50">
                     <div className="relative w-full sm:w-80">
                       <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                       <input 
                          type="text" 
                          placeholder="Search files..." 
                          value={searchQuery} 
                          onChange={e => setSearchQuery(e.target.value)} 
                          className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm" 
                       />
                     </div>
                     <div className="flex items-center gap-2 w-full sm:w-auto">
                       <div className="p-2 border border-slate-200 bg-white rounded-lg shadow-sm">
                         <Filter className="w-4 h-4 text-slate-500" />
                       </div>
                       <select 
                          value={statusFilter} 
                          onChange={e => setStatusFilter(e.target.value)} 
                          className="w-full sm:w-auto border border-slate-200 bg-white rounded-lg text-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer shadow-sm font-medium text-slate-700"
                        >
                          <option value="All">All Statuses</option>
                          <option value="Pending">Pending</option>
                          <option value="Signed">Signed</option>
                          <option value="Rejected">Rejected</option>
                       </select>
                     </div>
                   </div>
                   
                   {/* Table */}
                   <div className="overflow-x-auto">
                     {filteredDocs.length === 0 ? (
                       <div className="p-16 text-center flex flex-col items-center justify-center">
                         <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 border border-slate-100">
                           <FileText className="w-8 h-8 text-slate-300" />
                         </div>
                         <h3 className="text-lg font-semibold text-slate-900 tracking-tight">No documents found</h3>
                         <p className="text-slate-500 text-sm mt-1 max-w-sm">
                           Get started by uploading your first PDF document to request signatures.
                         </p>
                       </div>
                     ) : (
                       <table className="w-full text-left text-sm whitespace-nowrap">
                         <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500">
                           <tr>
                             <th className="px-6 py-4 font-semibold">Document Name</th>
                             <th className="px-6 py-4 font-semibold">Upload Date</th>
                             <th className="px-6 py-4 font-semibold">Status</th>
                             <th className="px-6 py-4 font-semibold">Size</th>
                             <th className="px-6 py-4 font-semibold text-right">Actions</th>
                           </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-100">
                           {filteredDocs.map(doc => (
                             <tr key={doc._id} className="hover:bg-slate-50/80 transition-colors group">
                               <td className="px-6 py-4">
                                 <div className="flex items-center gap-3">
                                   <div className="p-2 bg-rose-50 text-rose-500 rounded-lg">
                                     <FileText className="w-4 h-4" />
                                   </div>
                                   <span className="text-slate-900 font-medium truncate max-w-[200px] xl:max-w-xs">{doc.originalName}</span>
                                 </div>
                               </td>
                               <td className="px-6 py-4 text-slate-500">{new Date(doc.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                               <td className="px-6 py-4"><StatusBadge status={docStatuses[doc._id]} /></td>
                               <td className="px-6 py-4 text-slate-500">{formatSize(doc.fileSize)}</td>
                               <td className="px-6 py-4">
                                 <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                   <button 
                                     onClick={() => handleInvite(doc._id, prompt("Enter signer's email address:"))} 
                                     className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors tooltip-trigger"
                                     title="Send Invitation"
                                   >
                                     <Send className="w-4 h-4" />
                                   </button>
                                   <button 
                                     onClick={() => openPreview(doc)} 
                                     className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition-colors shadow-sm"
                                   >
                                     Open
                                   </button>
                                 </div>
                               </td>
                             </tr>
                           ))}
                         </tbody>
                       </table>
                     )}
                   </div>
                </motion.div>
              )}

              {['Signatures', 'Audit Trail', 'Settings'].includes(activeTab) && (
                 <motion.div 
                   key="placeholder"
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   className="flex flex-col items-center justify-center h-[50vh] text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl"
                 >
                   <Shield className="w-12 h-12 mb-4 opacity-20" />
                   <h3 className="text-lg font-semibold text-slate-700">Enterprise Feature</h3>
                   <p className="font-medium text-slate-500 mt-2 text-sm">Upgrade your workspace to access this module.</p>
                 </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* PDF Editor / Preview Modal */}
      <AnimatePresence>
        {selectedDoc && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 md:p-6"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[95vh] md:h-[90vh] flex flex-col overflow-hidden border border-slate-200"
            >
              {/* Modal Toolbar */}
              <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-white shrink-0 z-20 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-rose-50 text-rose-500 rounded-lg">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <h2 className="font-semibold text-slate-900 truncate max-w-xs md:max-w-md" title={selectedDoc.originalName}>
                      {selectedDoc.originalName}
                    </h2>
                    <span className="text-xs text-slate-500 font-medium">Document Workspace</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setShowAudit(!showAudit)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${showAudit ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                  >
                    <Shield className="w-4 h-4" />
                    <span className="hidden sm:inline">{showAudit ? 'Back to Document' : 'Audit Trail'}</span>
                  </button>
                  
                  {!showAudit && (
                    signedPdfUrl ? (
                      <a href={signedPdfUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm">
                        <Download className="w-4 h-4" /> <span className="hidden sm:inline">Download</span>
                      </a>
                    ) : (
                      <button 
                        onClick={handleFinalize} 
                        disabled={finalizing || signatures.length === 0} 
                        className="px-6 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm shadow-primary/20 flex items-center gap-2"
                      >
                        {finalizing && <Loader2 className="w-4 h-4 animate-spin" />}
                        {finalizing ? 'Processing...' : 'Finalize'}
                      </button>
                    )
                  )}
                  
                  <div className="w-px h-8 bg-slate-200 mx-1"></div>
                  <button onClick={closePreview} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-hidden bg-slate-100 relative flex flex-col">
                {showAudit ? (
                  <div className="flex-1 overflow-y-auto p-6 md:p-8">
                    <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                      <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                          <Shield className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-slate-900 tracking-tight">Security Audit Log</h3>
                          <p className="text-xs text-slate-500 font-medium mt-0.5">Cryptographically verifiable event history</p>
                        </div>
                      </div>
                      
                      {auditLogs.length === 0 ? (
                        <div className="p-12 text-center flex flex-col items-center">
                           <Clock className="w-12 h-12 text-slate-200 mb-3" />
                           <p className="text-slate-500 font-medium">No events logged yet.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm">
                            <thead className="bg-white border-b border-slate-100 text-slate-500">
                              <tr>
                                <th className="px-6 py-4 font-semibold">Action</th>
                                <th className="px-6 py-4 font-semibold">User</th>
                                <th className="px-6 py-4 font-semibold">Timestamp</th>
                                <th className="px-6 py-4 font-semibold">IP Address</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {auditLogs.map((log, i) => (
                                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                                    {log.action}
                                  </td>
                                  <td className="px-6 py-4 text-slate-600">{log.userId?.name || log.userId?.email || log.signerEmail || 'System'}</td>
                                  <td className="px-6 py-4 text-slate-500">{new Date(log.createdAt).toLocaleString()}</td>
                                  <td className="px-6 py-4 font-mono text-xs text-slate-400 bg-slate-50 rounded px-2">{log.ipAddress}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                ) : previewError ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-rose-500 font-medium gap-3">
                    <AlertCircle className="w-8 h-8" />
                    {previewError}
                  </div>
                ) : (
                  <div className="flex-1 overflow-auto flex flex-col items-center p-8 custom-scrollbar">
                    <Document
                      file={`http://localhost:5000/uploads/${selectedDoc.fileName}`}
                      onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                      onLoadError={() => setPreviewError('Failed to load PDF. It might be corrupted or missing.')}
                      loading={
                        <div className="flex flex-col items-center gap-4 text-slate-400 mt-20">
                          <Loader2 className="w-8 h-8 animate-spin text-primary" />
                          <p className="font-medium animate-pulse">Processing document canvas...</p>
                        </div>
                      }
                    >
                      <div 
                        className="relative inline-block cursor-crosshair shadow-2xl bg-white ring-1 ring-black/5 transition-all mb-8" 
                        onClick={handlePdfClick}
                      >
                        <Page 
                          pageNumber={pageNumber} 
                          renderTextLayer={false} 
                          renderAnnotationLayer={false} 
                          width={850} 
                          className="rounded-sm" 
                        />
                        {signatures.filter(sig => sig.page === pageNumber).map(sig => {
                          const isPending = sig.status === 'Pending' || !sig.status;
                          const isSigned = sig.status === 'Signed';
                          const isRejected = sig.status === 'Rejected';
                          return (
                            <div 
                              key={sig._id}
                              className="absolute flex flex-col items-center justify-center select-none z-40"
                              style={{
                                left: `${sig.x}%`, top: `${sig.y}%`,
                                transform: draggingSigId === sig._id ? 'translate(-50%, -50%) scale(1.05)' : 'translate(-50%, -50%)',
                                minWidth: '180px', touchAction: 'none'
                              }}
                            >
                              <div 
                                className={`border-2 flex flex-col items-center justify-center font-semibold px-4 py-3 rounded-xl w-full transition-all shadow-md backdrop-blur-sm ${
                                  isSigned ? 'border-emerald-500 bg-emerald-50/90 text-emerald-700' :
                                  isRejected ? 'border-rose-500 bg-rose-50/90 text-rose-700' :
                                  draggingSigId === sig._id ? 'border-primary bg-primary/10 text-primary shadow-xl shadow-primary/20 cursor-grabbing z-50' :
                                  'border-primary/60 bg-primary/5 text-primary cursor-grab hover:bg-primary/10 hover:border-primary border-dashed'
                                }`}
                                onPointerDown={isPending ? (e) => handlePointerDown(e, sig._id) : undefined}
                                onPointerMove={isPending ? handlePointerMove : undefined}
                                onPointerUp={isPending ? handlePointerUp : undefined}
                              >
                                <span className="flex items-center gap-2">
                                  {isSigned && <CheckCircle2 className="w-4 h-4" />}
                                  {isRejected && <AlertCircle className="w-4 h-4" />}
                                  {isSigned ? 'Verified Signature' : isRejected ? 'Rejected' : 'Signature Block'}
                                </span>
                                
                                {isPending && <span className="text-[10px] font-medium opacity-70 mt-0.5">Drag to move</span>}
                              </div>

                              <AnimatePresence>
                                {isPending && (
                                  <motion.div 
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="absolute top-full mt-3 bg-white shadow-xl rounded-xl border border-slate-200 p-3 z-50 w-64 ring-1 ring-black/5" 
                                    onPointerDown={e => e.stopPropagation()}
                                  >
                                    {rejectingSigId === sig._id ? (
                                      <div className="flex flex-col gap-2.5">
                                        <textarea 
                                          className="border border-slate-200 rounded-lg p-2.5 w-full text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none h-20 bg-slate-50 transition-all placeholder:text-slate-400" 
                                          placeholder="State reason for rejection..." 
                                          value={rejectReason}
                                          onChange={e => setRejectReason(e.target.value)}
                                          autoFocus
                                        />
                                        <div className="flex justify-between gap-2">
                                          <button onClick={() => setRejectingSigId(null)} className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium flex-1 transition-colors">Cancel</button>
                                          <button onClick={() => handleStatusUpdate(sig._id, 'Rejected')} className="py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-medium flex-1 transition-colors shadow-sm">Confirm</button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex flex-col gap-2">
                                        <div className="text-xs font-medium text-slate-500 mb-1 text-center">Review Action</div>
                                        <div className="flex gap-2">
                                          <button onClick={() => handleStatusUpdate(sig._id, 'Signed')} className="py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium flex-1 transition-colors shadow-sm flex items-center justify-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5"/> Accept</button>
                                          <button onClick={() => setRejectingSigId(sig._id)} className="py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-medium flex-1 transition-colors flex items-center justify-center gap-1.5"><AlertCircle className="w-3.5 h-3.5"/> Reject</button>
                                        </div>
                                      </div>
                                    )}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                              
                              {isRejected && sig.rejectionReason && (
                                <div className="absolute top-full mt-2 text-xs text-rose-700 font-medium bg-rose-50 px-3 py-2 rounded-lg shadow-lg border border-rose-200 w-48 text-center break-words">
                                  {sig.rejectionReason}
                                </div>
                              )}
                              
                              {isSigned && sig.signedAt && (
                                <div className="absolute top-full mt-2 text-[10px] text-emerald-700 font-medium bg-emerald-50 px-2 py-1 rounded-md shadow-sm border border-emerald-100 whitespace-nowrap">
                                  {new Date(sig.signedAt).toLocaleString()}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </Document>
                  </div>
                )}
                
                {/* PDF Pagination Bar */}
                {!previewError && !showAudit && numPages > 0 && (
                  <div className="h-14 bg-white border-t border-slate-200 px-6 flex items-center justify-center gap-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)] shrink-0 z-10">
                    <button 
                      disabled={pageNumber <= 1} onClick={() => setPageNumber(p => p - 1)}
                      className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-sm font-medium text-slate-600 bg-slate-100 px-4 py-1 rounded-full">Page {pageNumber} of {numPages}</span>
                    <button 
                      disabled={pageNumber >= numPages} onClick={() => setPageNumber(p => p + 1)}
                      className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
