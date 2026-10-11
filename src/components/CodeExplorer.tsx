import React, { useState, useEffect } from 'react';
import { PythonFileItem } from '../types';
import { FileCode, Copy, Check, Terminal, Folder, FileText } from 'lucide-react';

export const CodeExplorer: React.FC = () => {
  const [files, setFiles] = useState<PythonFileItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<PythonFileItem | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/python-files')
      .then(r => r.json())
      .then((data: PythonFileItem[]) => {
        setFiles(data);
        if (data.length > 0) {
          const defaultF = data.find(f => f.name === 'main.py') || data[0];
          setSelectedFile(defaultF);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleCopy = () => {
    if (!selectedFile) return;
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500 text-xs">Loading repository files...</div>;
  }

  return (
    <div className="space-y-6">
      {/* MacBook Local Run Guide */}
      <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg space-y-2">
        <div className="flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
            MacBook Terminal Deployment Guide
          </h3>
        </div>
        <p className="text-xs text-slate-400">
          Run the Python package locally with FastAPI, Streamlit, and pytest in 3 steps:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div className="p-3 bg-slate-950 rounded border border-slate-800/80 text-xs space-y-1">
            <span className="font-semibold text-slate-300">1. Install Dependencies</span>
            <pre className="text-[11px] text-slate-400 font-mono">pip install -r requirements.txt</pre>
          </div>
          <div className="p-3 bg-slate-950 rounded border border-slate-800/80 text-xs space-y-1">
            <span className="font-semibold text-slate-300">2. Run Pytest Suite</span>
            <pre className="text-[11px] text-slate-400 font-mono">pytest tests/ -v</pre>
          </div>
          <div className="p-3 bg-slate-950 rounded border border-slate-800/80 text-xs space-y-1">
            <span className="font-semibold text-slate-300">3. Launch Streamlit UI</span>
            <pre className="text-[11px] text-slate-400 font-mono">streamlit run dashboard/app.py</pre>
          </div>
        </div>
      </div>

      {/* Code Browser Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* File Tree Sidebar */}
        <div className="lg:col-span-1 bg-slate-900/60 border border-slate-800 rounded-lg p-3 space-y-2 max-h-[600px] overflow-y-auto">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2">
            Project Files ({files.length})
          </div>
          <div className="space-y-0.5">
            {files.map((file) => {
              const isSelected = selectedFile?.path === file.path;
              return (
                <button
                  key={file.path}
                  onClick={() => setSelectedFile(file)}
                  className={`w-full text-left px-2.5 py-1.5 rounded text-xs font-mono flex items-center space-x-2 transition-colors ${
                    isSelected
                      ? 'bg-slate-800 text-emerald-400 font-medium'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <FileCode className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-emerald-400' : 'text-slate-500'}`} />
                  <span className="truncate">{file.path}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Code Content Viewer */}
        <div className="lg:col-span-3 bg-slate-950 border border-slate-800 rounded-lg overflow-hidden flex flex-col max-h-[600px]">
          {selectedFile ? (
            <>
              <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs">
                  <span className="text-slate-400 font-mono">{selectedFile.path}</span>
                  <span className="text-slate-600">·</span>
                  <span className="text-slate-500 font-mono">{selectedFile.content.split('\n').length} lines</span>
                </div>
                <button
                  onClick={handleCopy}
                  className="px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors inline-flex items-center space-x-1"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy File'}</span>
                </button>
              </div>
              <div className="flex-1 overflow-auto p-4 text-xs font-mono text-slate-300 leading-relaxed">
                <pre>{selectedFile.content}</pre>
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs">Select a file from the sidebar to inspect.</div>
          )}
        </div>
      </div>
    </div>
  );
};
