import { Routes, Route, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileSignature, ArrowRight, ShieldCheck, Zap, Layers } from 'lucide-react';
import Dashboard from './Dashboard';
import Login from './Login';
import Register from './Register';
import PublicSign from './PublicSign';

function Home() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-primary/20">
      {/* Navbar */}
      <nav className="fixed top-0 inset-x-0 h-16 bg-white/80 backdrop-blur-md border-b border-border z-50 flex items-center justify-between px-6 lg:px-12">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-slate-900">
          <div className="bg-primary/10 p-1.5 rounded-lg text-primary">
            <FileSignature className="w-5 h-5" />
          </div>
          DocuFlow
        </div>
        <div className="flex items-center gap-4">
          <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
            Log in
          </Link>
          <Link to="/register" className="text-sm font-medium bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-all shadow-sm">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center pt-32 pb-20 px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl space-y-8"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4 ring-1 ring-primary/20">
            <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse"></span>
            DocuFlow 2.0 is now live
          </div>
          
          <h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-slate-900 leading-[1.1]">
            Agreement workflows, <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">simplified.</span>
          </h1>
          
          <p className="text-lg lg:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Send, sign, and manage your documents securely in one place. Experience the fastest way to get your agreements executed.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link to="/register" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-primary text-white px-8 py-3.5 rounded-xl font-medium hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 group">
              Start signing for free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link to="/dashboard" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white text-slate-700 border border-slate-200 px-8 py-3.5 rounded-xl font-medium hover:bg-slate-50 transition-all shadow-sm">
              Go to Dashboard
            </Link>
          </div>
        </motion.div>

        {/* Feature Highlights */}
        <div className="grid sm:grid-cols-3 gap-8 max-w-5xl mx-auto mt-32 text-left">
          {[
            { icon: <ShieldCheck className="w-6 h-6 text-emerald-500" />, title: 'Enterprise Grade Security', desc: 'Bank-level encryption ensures your documents remain private and legally binding.' },
            { icon: <Zap className="w-6 h-6 text-amber-500" />, title: 'Lightning Fast', desc: 'Optimized performance for a seamless signing experience on any device.' },
            { icon: <Layers className="w-6 h-6 text-blue-500" />, title: 'Powerful Workflows', desc: 'Automate your document routing with intelligent tracking and notifications.' },
          ].map((feature, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1 + 0.3 }}
              className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center mb-4 border border-slate-100">
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">{feature.title}</h3>
              <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 text-center text-slate-500 text-sm">
        <p>© {new Date().getFullYear()} DocuFlow. All rights reserved.</p>
      </footer>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/sign/:token" element={<PublicSign />} />
    </Routes>
  );
}

export default App;
