import React, { useState, useEffect } from 'react';
import { EBook } from '../types';
import { ChevronLeft, ChevronRight, Menu, Download, Bookmark, Type, Minus, Plus, Settings, ImageIcon, Sparkles, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { jsPDF } from 'jspdf';

interface EBookReaderProps {
  book: EBook;
  onSaveProject?: () => void;
  onGenerateImage?: (chapterIndex: number, prompt: string) => Promise<string>;
}

// Helper to convert image URL to base64 for PDF
const getDataUri = async (url: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg'));
      } else {
        resolve('');
      }
    };
    img.onerror = () => resolve('');
    img.src = url;
  });
};

export const EBookReader: React.FC<EBookReaderProps> = ({ book, onSaveProject, onGenerateImage }) => {
  const [currentChapter, setCurrentChapter] = useState(-1);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [fontSize, setFontSize] = useState(20);
  const [fontFamily, setFontFamily] = useState<'serif' | 'sans' | 'mono'>('serif');
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [generatingImageFor, setGeneratingImageFor] = useState<number | null>(null);

  // Reset scroll on chapter change
  useEffect(() => {
    const contentArea = document.getElementById('reader-content');
    if (contentArea) contentArea.scrollTop = 0;
  }, [currentChapter]);

  const isComic = book.format === 'comic';

  const themeStyles = {
    modern: 'bg-white text-slate-900',
    classic: 'bg-[#fdfbf7] text-slate-900',
    fantasy: 'bg-slate-900 text-slate-100',
    technical: 'bg-slate-50 text-slate-900',
    'sci-fi': 'bg-slate-950 text-cyan-50',
    horror: 'bg-[#0a0505] text-stone-300',
    romance: 'bg-[#fff0f5] text-slate-900',
    historical: 'bg-[#f5e6d3] text-[#2c1810]',
    comic: 'bg-white text-black',
    cyberpunk: 'bg-zinc-950 text-emerald-400 border-2 border-emerald-900/50',
    steampunk: 'bg-[#e3dac9] text-[#2c1810] border-4 border-double border-[#8b4513]/30',
    minimalist: 'bg-white text-slate-800 tracking-wide'
  };

  const getFontClass = () => {
    if (isComic) return 'font-sans';
    if (fontFamily === 'serif') return 'font-serif';
    if (fontFamily === 'sans') return 'font-sans';
    return 'font-mono';
  };

  const activeTheme = isComic ? themeStyles.comic : (themeStyles[book.theme] || themeStyles.modern);

  const nextChapter = () => {
    if (currentChapter < book.chapters.length - 1) {
      setCurrentChapter(c => c + 1);
    }
  };

  const prevChapter = () => {
    if (currentChapter > -1) {
      setCurrentChapter(c => c - 1);
    }
  };

  const handleGenerateImageClick = async (idx: number, prompt: string) => {
    if (!onGenerateImage) return;
    setGeneratingImageFor(idx);
    try {
      await onGenerateImage(idx, prompt);
    } catch (e) {
      console.error("Failed to generate", e);
    } finally {
      setGeneratingImageFor(null);
    }
  };

  const downloadPDF = async () => {
    setIsLoadingPdf(true);
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const maxLineWidth = pageWidth - margin * 2;
    const lineHeight = 7;

    try {
      // --- Title Page ---
      const coverUrl = `https://picsum.photos/seed/${book.title.replace(/\s/g, '')}/800/600`;
      const coverData = await getDataUri(coverUrl);

      if (coverData) {
        try {
          // Centered Image
          doc.addImage(coverData, 'JPEG', margin, margin + 40, maxLineWidth, 120);
        } catch (e) {
          console.warn("Could not add image to PDF", e);
        }
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(24);
      doc.text(book.title, pageWidth / 2, margin + 20, { align: "center", maxWidth: maxLineWidth });

      doc.setFontSize(16);
      doc.setFont("helvetica", "normal");
      doc.text(`By ${book.author}`, pageWidth / 2, pageHeight - margin - 20, { align: "center" });

      // --- Chapters ---
      book.chapters.forEach((chapter, index) => {
        doc.addPage();

        // Chapter Title
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.text(`Chapter ${index + 1}: ${chapter.title}`, margin, margin + 10);

        // Chapter Content
        doc.setFont("times", "normal");
        doc.setFontSize(12);

        const cleanContent = chapter.content
          .replace(/\*\*/g, '')
          .replace(/#/g, '')
          .replace(/\n\n/g, '\n');

        const paragraphs = cleanContent.split('\n');

        let cursorY = margin + 30;

        paragraphs.forEach(para => {
          if (!para.trim()) {
            cursorY += lineHeight / 2;
            return;
          }

          const lines = doc.splitTextToSize(para, maxLineWidth);

          lines.forEach((line: string) => {
            if (cursorY > pageHeight - margin) {
              doc.addPage();
              cursorY = margin;
            }
            doc.text(line, margin, cursorY);
            cursorY += lineHeight;
          });
          cursorY += lineHeight / 2;
        });
      });

      doc.save(`${book.title.replace(/\s+/g, '_')}.pdf`);
    } catch (e) {
      console.error("PDF Generation failed", e);
      alert("Could not generate PDF. Please try again.");
    } finally {
      setIsLoadingPdf(false);
    }
  };

  return (
    <div className="h-full flex flex-col md:flex-row relative overflow-hidden bg-slate-950">

      {/* Mobile Toggle */}
      <button
        className="md:hidden absolute top-4 left-4 z-20 p-2 bg-slate-800 rounded-full text-white shadow-lg"
        onClick={() => setSidebarOpen(!isSidebarOpen)}
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Sidebar */}
      <div className={`
        fixed md:relative inset-y-0 left-0 w-64 bg-slate-900 border-r border-slate-800 z-10 transition-transform duration-300 flex flex-col shadow-2xl
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm">
          <h3 className="font-bold text-white truncate text-lg tracking-tight">{book.title}</h3>
          <p className="text-xs text-slate-400 capitalize mt-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand-500"></span>
            {book.format} • {book.chapters.length} Ch
          </p>
        </div>
        <div className="overflow-y-auto flex-1 p-3 space-y-1">
          <button
            onClick={() => { setCurrentChapter(-1); setSidebarOpen(false); }}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all font-medium ${currentChapter === -1 ? 'bg-brand-600 text-white shadow-lg shadow-brand-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
          >
            Cover
          </button>
          {book.chapters.map((chapter, idx) => (
            <button
              key={idx}
              onClick={() => { setCurrentChapter(idx); setSidebarOpen(false); }}
              className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all truncate font-medium group flex items-center gap-3 ${currentChapter === idx ? 'bg-brand-600 text-white shadow-lg shadow-brand-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            >
              <span className={`text-xs opacity-50 font-mono ${currentChapter === idx ? 'text-brand-200' : 'text-slate-600 group-hover:text-slate-500'}`}>{(idx + 1).toString().padStart(2, '0')}</span>
              <span className="truncate">{chapter.title}</span>
            </button>
          ))}
        </div>
        <div className="p-4 border-t border-slate-800 space-y-3 bg-slate-900/50">
          {onSaveProject && (
            <button
              onClick={onSaveProject}
              className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white py-2.5 rounded-xl transition-colors text-sm font-semibold border border-slate-700"
            >
              <Bookmark className="w-4 h-4" /> Save Project
            </button>
          )}
          <button
            onClick={downloadPDF}
            disabled={isLoadingPdf}
            className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 text-white py-2.5 rounded-xl transition-colors text-sm font-semibold shadow-lg shadow-brand-900/20 disabled:opacity-50"
          >
            {isLoadingPdf ? 'Generating...' : <><Download className="w-4 h-4" /> Download PDF</>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 h-full overflow-hidden relative flex flex-col bg-slate-950">

        {/* Top Controls */}
        <div className="h-16 flex items-center justify-end px-6 gap-3 z-20 absolute top-0 right-0 left-0 pointer-events-none">
          <div className="pointer-events-auto bg-slate-900/90 backdrop-blur border border-slate-800 shadow-xl rounded-full p-1.5 flex gap-1">
            <button
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className={`p-2 rounded-full transition-colors ${isSettingsOpen ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
              title="Reader Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {isSettingsOpen && (
          <div className="absolute top-20 right-6 w-72 bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 p-5 rounded-2xl shadow-2xl z-30 animate-in slide-in-from-top-2 fade-in duration-200">
            <h4 className="text-white font-bold mb-4 text-sm flex items-center gap-2">
              <Type className="w-4 h-4 text-brand-400" /> Appearance
            </h4>

            <div className="space-y-4">
              <div className="space-y-2">
                <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Font Style</span>
                <div className="grid grid-cols-3 gap-1 bg-slate-950 rounded-lg p-1 border border-slate-800">
                  <button onClick={() => setFontFamily('serif')} className={`px-2 py-1.5 rounded-md text-sm font-serif transition-colors ${fontFamily === 'serif' ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>Serif</button>
                  <button onClick={() => setFontFamily('sans')} className={`px-2 py-1.5 rounded-md text-sm font-sans transition-colors ${fontFamily === 'sans' ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>Sans</button>
                  <button onClick={() => setFontFamily('mono')} className={`px-2 py-1.5 rounded-md text-sm font-mono transition-colors ${fontFamily === 'mono' ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>Mono</button>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Font Size</span>
                <div className="flex items-center gap-3 bg-slate-950 rounded-lg p-1.5 border border-slate-800">
                  <button onClick={() => setFontSize(s => Math.max(14, s - 2))} className="p-1.5 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white transition-colors"><Minus className="w-4 h-4" /></button>
                  <span className="flex-1 text-center text-sm font-mono text-white">{fontSize}px</span>
                  <button onClick={() => setFontSize(s => Math.min(32, s + 2))} className="p-1.5 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white transition-colors"><Plus className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reader Area */}
        <div
          id="reader-content"
          className="flex-1 overflow-y-auto bg-slate-950 scroll-smooth p-4 md:p-8"
        >
          {/* Main Book Page Container - "The White Screen" */}
          <div className={`w-full max-w-[800px] min-h-[90vh] mx-auto rounded-sm shadow-2xl transition-all duration-500 ease-in-out relative ${activeTheme} ${isComic ? 'border-4 border-black' : ''}`}>

            {/* FORCE BACKGROUND if theme fails */}
            <div className={`absolute inset-0 -z-10 ${activeTheme.includes('bg-') ? '' : 'bg-white'}`}></div>

            {/* Cover View */}
            {currentChapter === -1 && (
              <div className="w-full h-full min-h-[90vh] flex flex-col relative overflow-hidden group">
                {/* Full Cover Image Background */}
                <div className="absolute inset-0 z-0">
                  <img
                    src={`https://image.pollinations.ai/prompt/book cover for ${encodeURIComponent(book.title)} ${encodeURIComponent(book.theme)} style?width=800&height=1200&nologo=true`}
                    alt="Cover"
                    className={`w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105 ${isComic ? 'grayscale contrast-125' : ''}`}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${book.title.replace(/\s/g, '')}/800/1200`;
                    }}
                  />
                  {/* Cinematic Gradient Overlays */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
                  <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-transparent opacity-60"></div>
                </div>

                {/* Cover Content (Overlay) */}
                <div className="relative z-10 flex-1 flex flex-col justify-between p-8 md:p-12 text-center">
                  <div className="mt-8">
                    <p className="text-white/80 font-serif italic text-lg tracking-widest uppercase mb-4 opacity-0 animate-[fadeIn_1s_ease-out_0.5s_forwards]">Bestseller</p>
                    <h1 className="text-5xl md:text-7xl font-serif font-black text-white leading-tight drop-shadow-2xl animate-[slideUp_1s_ease-out_forwards]">
                      {book.title}
                    </h1>
                  </div>

                  <div className="mb-12">
                    <div className="w-16 h-1 bg-brand-500 mx-auto mb-6 rounded-full shadow-[0_0_10px_rgba(14,165,233,0.5)]"></div>
                    <p className="text-xl md:text-2xl text-white font-medium drop-shadow-lg tracking-wide animate-[fadeIn_1s_ease-out_0.8s_forwards]">
                      <span className="opacity-70">By</span> {book.author}
                    </p>
                    <p className="text-white/60 text-sm mt-2 uppercase tracking-widest">{book.theme} Edition</p>
                  </div>
                </div>
              </div>
            )}

            {/* Chapter View */}
            {currentChapter >= 0 && (
              <div className="w-full">
                {/* Chapter Content Container */}
                <div className="max-w-3xl mx-auto px-8 md:px-12 py-16 md:py-20" style={{ fontSize: `${fontSize}px`, lineHeight: 1.9 }}>

                  {/* Chapter Header */}
                  <div className="mb-12 text-center">
                    <div className="inline-block px-4 py-1.5 mb-6 text-xs font-bold tracking-[0.2em] uppercase border border-current/20 rounded-full opacity-60">
                      Chapter {currentChapter + 1}
                    </div>
                    <h2 className={`text-4xl md:text-5xl font-black mb-8 leading-tight text-current ${isComic ? 'uppercase tracking-tighter' : 'tracking-tight font-serif'}`}>
                      {book.chapters[currentChapter].title}
                    </h2>
                    <div className="w-24 h-1 bg-current opacity-10 mx-auto rounded-full"></div>
                  </div>

                  {/* Chapter Image (Pollinations) */}
                  <div className="w-full mb-12 rounded-lg overflow-hidden shadow-lg border border-current/10 relative group bg-gray-100">
                    <div className="aspect-video w-full relative overflow-hidden">
                      <img
                        key={currentChapter}
                        src={book.chapters[currentChapter].imageUrl || `https://image.pollinations.ai/prompt/${encodeURIComponent(book.chapters[currentChapter].imageKeyword || book.chapters[currentChapter].title)} cinematic lighting?width=1200&height=800&nologo=true`}
                        alt={book.chapters[currentChapter].imageKeyword}
                        className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 ${isComic ? 'grayscale contrast-125' : ''}`}
                        loading="lazy"
                      />
                      {/* Interaction hint */}
                      {!book.chapters[currentChapter].imageUrl && onGenerateImage && (
                        <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleGenerateImageClick(currentChapter, book.chapters[currentChapter].imageKeyword)}
                            className="bg-black/50 hover:bg-black/70 backdrop-blur text-white p-2 rounded-full shadow-lg border border-white/20 transition-all hover:scale-110"
                            title="Regenerate this image"
                          >
                            <Sparkles className="w-5 h-5 text-brand-400" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Simplified Caption - Always Visible */}
                    <div className="px-6 py-4 bg-black/5 border-t border-black/5 flex items-start gap-3">
                      <ImageIcon className="w-5 h-5 text-current opacity-50 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold opacity-80 uppercase tracking-wide text-current">Visual Concept</p>
                        <p className="text-sm italic opacity-70 leading-relaxed text-current">
                          "{book.chapters[currentChapter].imageKeyword}"
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Prose Content */}
                  <div className={`
                      prose prose-lg max-w-none 
                      prose-headings:text-current prose-headings:font-serif prose-headings:font-black prose-headings:tracking-tight
                      prose-p:text-current prose-p:opacity-95 prose-p:leading-loose
                      prose-blockquote:border-l-4 prose-blockquote:border-current/30 prose-blockquote:pl-6 prose-blockquote:italic prose-blockquote:text-current/80
                      prose-li:text-current prose-li:opacity-90
                      ${getFontClass()}
                      ${isComic ? 'prose-p:font-bold prose-p:uppercase prose-p:tracking-wide' : ''}
                  `}>
                    {book.chapters[currentChapter].content ? (
                      isComic ? (
                        <ReactMarkdown
                          components={{
                            p: ({ node, ...props }) => {
                              const text = String(props.children);
                              if (text.trim().startsWith('Panel') || text.trim().startsWith('**Panel')) {
                                return (
                                  <div className="bg-slate-100 border-2 border-black p-3 font-black uppercase text-xs mt-10 mb-4 tracking-widest w-fit text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transform -rotate-1">
                                    {props.children}
                                  </div>
                                );
                              }
                              return <p className="mb-6 font-medium text-lg border-l-4 border-transparent pl-4 hover:border-black/20 transition-colors">{props.children}</p>
                            },
                          }}
                        >
                          {book.chapters[currentChapter].content}
                        </ReactMarkdown>
                      ) : (
                        <ReactMarkdown
                          components={{
                            // Custom typography requested by user
                            h1: ({ node, ...props }) => <h1 className="text-3xl font-black mt-16 mb-6 opacity-100 leading-tight" {...props} />,
                            h2: ({ node, ...props }) => <h2 className="text-2xl font-black mt-12 mb-5 opacity-100 leading-tight border-b border-current/10 pb-2" {...props} />,
                            h3: ({ node, ...props }) => <h3 className="text-xl font-black mt-10 mb-4 opacity-100 uppercase tracking-wide text-sm" {...props} />,
                            p: ({ node, ...props }) => <p className="mb-6 text-justify md:text-left" {...props} />,
                          }}
                        >
                          {book.chapters[currentChapter].content}
                        </ReactMarkdown>
                      )
                    ) : (
                      <div className="flex flex-col items-center justify-center py-32 text-center opacity-60">
                        <Loader2 className="w-12 h-12 animate-spin mb-6 text-current" />
                        <p className="text-lg font-medium animate-pulse">Writing magic...</p>
                        <p className="text-sm opacity-70 mt-2">The AI is crafting this chapter for you.</p>
                      </div>
                    )}
                  </div>

                  {/* End of chapter marker */}
                  <div className="mt-20 flex justify-center opacity-30">
                    <div className="flex gap-2">
                      <span className="w-2 h-2 rounded-full bg-current"></span>
                      <span className="w-2 h-2 rounded-full bg-current"></span>
                      <span className="w-2 h-2 rounded-full bg-current"></span>
                    </div>
                  </div>

                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="h-20 bg-slate-900 border-t border-slate-800 flex items-center justify-between px-6 z-10 shrink-0">
          <button
            onClick={prevChapter}
            disabled={currentChapter === -1}
            className="flex items-center gap-3 px-4 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-all font-medium"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="hidden md:inline">Previous Chapter</span>
          </button>

          <div className="flex flex-col items-center">
            <span className="text-white font-bold text-sm">
              {currentChapter === -1 ? 'Cover' : `Chapter ${currentChapter + 1}`}
            </span>
            <div className="w-32 h-1 bg-slate-800 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-brand-500 transition-all duration-300"
                style={{ width: `${((currentChapter + 1) / book.chapters.length) * 100}%` }}
              ></div>
            </div>
          </div>

          <button
            onClick={nextChapter}
            disabled={currentChapter === book.chapters.length - 1}
            className="flex items-center gap-3 px-4 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-all font-medium"
          >
            <span className="hidden md:inline">Next Chapter</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};