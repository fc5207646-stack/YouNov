
import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { 
  Bold, Italic, Underline, Strikethrough, 
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Type, Palette, LayoutTemplate, Settings as SettingsIcon, X,
  Heading, MousePointerClick
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useEditorSettings } from '@/hooks/useEditorSettings';

const FONT_FAMILIES = [
  { label: '宋体 (SimSun)', value: 'SimSun, 宋体, serif' },
  { label: '微软雅黑 (YaHei)', value: '"Microsoft YaHei", 微软雅黑, sans-serif' },
  { label: '黑体 (SimHei)', value: 'SimHei, 黑体, sans-serif' },
  { label: '楷体 (KaiTi)', value: 'KaiTi, 楷体, serif' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Times New Roman', value: '"Times New Roman", serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Verdana', value: 'Verdana, sans-serif' }
];

const FONT_SIZES = [12, 14, 16, 18, 20, 22, 24, 26, 28, 30];
const LINE_HEIGHTS = ['1.0', '1.5', '2.0', '2.5', '3.0'];

const EditorPanel = forwardRef(({ 
  initialContent = '', 
  initialSettings = {}, 
  onSave 
}, ref) => {
  const { settings, updateSetting, loadSettings } = useEditorSettings(initialSettings);
  const editorRef = useRef(null);
  const [showSettings, setShowSettings] = useState(false); // Default hidden as per request? "toggle visibility"
  const [activeFormats, setActiveFormats] = useState({
    bold: false, italic: false, underline: false, strikethrough: false
  });

  // Expose save method to parent
  useImperativeHandle(ref, () => ({
    handleSave: () => {
      if (editorRef.current && onSave) {
        onSave(editorRef.current.innerHTML, settings);
      }
    }
  }));

  // Load initial content
  useEffect(() => {
    if (editorRef.current && initialContent) {
      editorRef.current.innerHTML = initialContent;
    }
  }, [initialContent]);

  // Sync settings
  useEffect(() => {
    loadSettings(initialSettings);
  }, [initialSettings, loadSettings]);

  const execCommand = (command, value = null) => {
    document.execCommand(command, false, value);
    checkFormats();
    if (editorRef.current) editorRef.current.focus();
  };

  const checkFormats = () => {
    setActiveFormats({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      strikethrough: document.queryCommandState('strikethrough'),
    });
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-slate-950">
      
      {/* LEFT: Editor Area */}
      <div className={cn("flex flex-col h-full transition-all duration-300", showSettings ? "w-[70%]" : "w-full")}>
        
        {/* Editor Toolbar */}
        <div className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 shrink-0">
           <div className="flex items-center gap-2">
              <span className="text-slate-400 text-sm font-medium mr-2">Editor</span>
              <div className="flex bg-slate-800 rounded-md p-1 gap-0.5 border border-slate-700">
                  <FormatButton active={activeFormats.bold} icon={Bold} onClick={() => execCommand('bold')} title="Bold" />
                  <FormatButton active={activeFormats.italic} icon={Italic} onClick={() => execCommand('italic')} title="Italic" />
                  <FormatButton active={activeFormats.underline} icon={Underline} onClick={() => execCommand('underline')} title="Underline" />
                  <FormatButton active={activeFormats.strikethrough} icon={Strikethrough} onClick={() => execCommand('strikeThrough')} title="Strikethrough" />
              </div>
           </div>

           <Button 
             variant="ghost" 
             size="sm" 
             onClick={() => setShowSettings(!showSettings)}
             className={cn("text-slate-400 hover:text-white hover:bg-slate-800", showSettings && "bg-slate-800 text-purple-400")}
           >
             <SettingsIcon className="w-4 h-4 mr-2" />
             Settings
           </Button>
        </div>

        {/* Editor Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-950 p-8">
            <div className="max-w-4xl mx-auto bg-white rounded-lg min-h-[500px] shadow-2xl p-0 overflow-hidden">
                <div 
                  ref={editorRef}
                  contentEditable={true}
                  onKeyUp={checkFormats}
                  onMouseUp={checkFormats}
                  className="w-full h-full min-h-[800px] outline-none p-12 chapter-content text-slate-900"
                  style={{
                    fontFamily: settings.fontFamily,
                    fontSize: settings.fontSize,
                    color: settings.fontColor,
                    lineHeight: settings.lineHeight,
                    textAlign: settings.textAlign,
                  }}
                  placeholder="Enter chapter content..."
                />
            </div>
        </div>
      </div>

      {/* RIGHT: Settings Panel */}
      {showSettings && (
        <div className="w-[30%] bg-slate-50 border-l border-slate-200 flex flex-col z-20 shadow-2xl h-full animate-in slide-in-from-right duration-300">
           <div className="p-4 border-b border-slate-200 bg-white flex justify-between items-center shrink-0">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                <LayoutTemplate className="w-4 h-4 text-purple-600" /> Style Settings
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setShowSettings(false)} className="h-6 w-6 text-slate-400 hover:text-slate-600">
                 <X className="w-4 h-4" />
              </Button>
           </div>

           <div className="flex-1 overflow-y-auto p-5 space-y-8">
              {/* Font Settings */}
              <section className="space-y-4">
                 <div className="flex items-center gap-2 pb-1 border-b border-slate-200">
                   <Type className="w-3.5 h-3.5 text-purple-500" />
                   <span className="text-xs font-bold text-slate-500 uppercase">Font Settings</span>
                 </div>
                 
                 <div className="space-y-3">
                    <div className="space-y-1.5">
                       <Label className="text-xs text-slate-500">Font Family</Label>
                       <Select value={settings.fontFamily} onValueChange={(val) => updateSetting('fontFamily', val)}>
                          <SelectTrigger className="h-9 bg-white border-slate-300"><SelectValue /></SelectTrigger>
                          <SelectContent>
                             {FONT_FAMILIES.map(f => (
                               <SelectItem key={f.value} value={f.value}><span style={{ fontFamily: f.value }}>{f.label}</span></SelectItem>
                             ))}
                          </SelectContent>
                       </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                       <div className="space-y-1.5">
                          <Label className="text-xs text-slate-500">Size</Label>
                          <Select value={String(settings.fontSize).replace('px','')} onValueChange={(val) => updateSetting('fontSize', `${val}px`)}>
                             <SelectTrigger className="h-9 bg-white border-slate-300"><SelectValue /></SelectTrigger>
                             <SelectContent>
                               {FONT_SIZES.map(s => <SelectItem key={s} value={String(s)}>{s}px</SelectItem>)}
                             </SelectContent>
                          </Select>
                       </div>
                       <div className="space-y-1.5">
                          <Label className="text-xs text-slate-500">Color</Label>
                          <div className="flex items-center h-9 bg-white border border-slate-300 rounded px-2 gap-2">
                             <input 
                               type="color" 
                               value={settings.fontColor} 
                               onChange={e => updateSetting('fontColor', e.target.value)} 
                               className="w-6 h-6 border-none bg-transparent cursor-pointer p-0" 
                             />
                             <span className="text-xs text-slate-500 font-mono">{settings.fontColor}</span>
                          </div>
                       </div>
                    </div>
                 </div>
              </section>

              {/* Paragraph Settings */}
              <section className="space-y-4">
                 <div className="flex items-center gap-2 pb-1 border-b border-slate-200">
                   <Heading className="w-3.5 h-3.5 text-purple-500" />
                   <span className="text-xs font-bold text-slate-500 uppercase">Paragraph Settings</span>
                 </div>
                 
                 <div className="space-y-3">
                    <div className="space-y-1.5">
                       <Label className="text-xs text-slate-500">Line Height</Label>
                       <div className="flex flex-wrap gap-2">
                          {LINE_HEIGHTS.map(lh => (
                             <button 
                               key={lh}
                               onClick={() => updateSetting('lineHeight', lh)}
                               className={cn(
                                 "px-3 py-1.5 text-xs border rounded transition-all font-medium",
                                 settings.lineHeight === lh 
                                  ? "bg-purple-100 border-purple-400 text-purple-700 shadow-sm" 
                                  : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                               )}
                             >
                                {lh}
                             </button>
                          ))}
                       </div>
                    </div>

                    <div className="space-y-1.5">
                       <Label className="text-xs text-slate-500">Alignment</Label>
                       <div className="flex bg-white border border-slate-300 rounded p-1 gap-1 shadow-sm">
                          <AlignButton active={settings.textAlign === 'left'} icon={AlignLeft} onClick={() => updateSetting('textAlign', 'left')} />
                          <AlignButton active={settings.textAlign === 'center'} icon={AlignCenter} onClick={() => updateSetting('textAlign', 'center')} />
                          <AlignButton active={settings.textAlign === 'right'} icon={AlignRight} onClick={() => updateSetting('textAlign', 'right')} />
                          <AlignButton active={settings.textAlign === 'justify'} icon={AlignJustify} onClick={() => updateSetting('textAlign', 'justify')} />
                       </div>
                    </div>
                 </div>
              </section>
              
              {/* Text Format Section */}
              <section className="space-y-4">
                 <div className="flex items-center gap-2 pb-1 border-b border-slate-200">
                   <MousePointerClick className="w-3.5 h-3.5 text-purple-500" />
                   <span className="text-xs font-bold text-slate-500 uppercase">Text Format</span>
                 </div>
                 <div className="flex bg-white border border-slate-300 rounded p-1 gap-1 shadow-sm">
                    <FormatButton active={activeFormats.bold} icon={Bold} onClick={() => execCommand('bold')} title="Bold (Ctrl+B)" />
                    <FormatButton active={activeFormats.italic} icon={Italic} onClick={() => execCommand('italic')} title="Italic (Ctrl+I)" />
                    <FormatButton active={activeFormats.underline} icon={Underline} onClick={() => execCommand('underline')} title="Underline (Ctrl+U)" />
                    <FormatButton active={activeFormats.strikethrough} icon={Strikethrough} onClick={() => execCommand('strikeThrough')} title="Strikethrough" />
                 </div>
              </section>
           </div>
        </div>
      )}
    </div>
  );
});

// Helper Components
const FormatButton = ({ active, icon: Icon, onClick, title }) => (
  <button
    type="button"
    title={title}
    onMouseDown={(e) => { e.preventDefault(); onClick(); }}
    className={cn(
      "flex-1 h-8 flex items-center justify-center rounded transition-all",
      active ? "bg-purple-100 text-purple-700 font-bold shadow-inner" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
    )}
  >
    <Icon className="w-4 h-4" />
  </button>
);

const AlignButton = ({ active, icon: Icon, onClick }) => (
   <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 h-8 flex items-center justify-center rounded transition-all",
        active ? "bg-purple-100 text-purple-700 shadow-inner" : "text-slate-400 hover:text-slate-700 hover:bg-slate-50"
      )}
   >
      <Icon className="w-4 h-4" />
   </button>
);

export default EditorPanel;
