
import React from 'react';
import { 
  Bold, Italic, Underline, Strikethrough, 
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Type, Palette, ArrowUpDown
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const FONT_FAMILIES = [
  { value: 'SimSun, 宋体, serif', label: '宋体 (SimSun)' },
  { value: 'Microsoft YaHei, 微软雅黑, sans-serif', label: '微软雅黑 (YaHei)' },
  { value: 'SimHei, 黑体, sans-serif', label: '黑体 (SimHei)' },
  { value: 'KaiTi, 楷体, serif', label: '楷体 (KaiTi)' },
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: 'Times New Roman, serif', label: 'Times New Roman' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: 'Verdana, sans-serif', label: 'Verdana' },
];

const FONT_SIZES = ['12px', '14px', '16px', '18px', '20px', '22px', '24px', '26px', '28px', '30px'];
const LINE_HEIGHTS = ['1.0', '1.5', '2.0', '2.5', '3.0'];

const EditorSettingsPanel = ({ settings, onUpdate, onFormat }) => {
  
  // Helper to prevent focus loss when clicking buttons
  const handleMouseDown = (e, action) => {
    e.preventDefault();
    action();
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-8 bg-white text-slate-900 border-l border-slate-200 shadow-xl">
      <div>
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-800">
           <Type className="w-5 h-5 text-accent-600" /> Typography
        </h3>
        
        <div className="space-y-4">
           {/* Font Family */}
           <div className="space-y-2">
             <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Font Family</Label>
             <Select value={settings.fontFamily} onValueChange={(val) => onUpdate('fontFamily', val)}>
                <SelectTrigger className="w-full border-slate-300 bg-white">
                   <SelectValue placeholder="Select Font" />
                </SelectTrigger>
                <SelectContent>
                   {FONT_FAMILIES.map(font => (
                      <SelectItem key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                        {font.label}
                      </SelectItem>
                   ))}
                </SelectContent>
             </Select>
           </div>

           {/* Font Size & Color */}
           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Size</Label>
                <Select value={settings.fontSize} onValueChange={(val) => onUpdate('fontSize', val)}>
                    <SelectTrigger className="w-full border-slate-300 bg-white">
                    <SelectValue placeholder="Size" />
                    </SelectTrigger>
                    <SelectContent>
                    {FONT_SIZES.map(size => (
                        <SelectItem key={size} value={size}>{size}</SelectItem>
                    ))}
                    </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Color</Label>
                <div className="flex gap-2">
                   <div className="relative w-10 h-10 overflow-hidden rounded border border-slate-300 shadow-sm">
                      <Input 
                        type="color" 
                        value={settings.fontColor} 
                        onChange={(e) => onUpdate('fontColor', e.target.value)}
                        className="absolute -top-2 -left-2 w-16 h-16 p-0 border-0 cursor-pointer"
                      />
                   </div>
                   <Input 
                     type="text" 
                     value={settings.fontColor} 
                     onChange={(e) => onUpdate('fontColor', e.target.value)}
                     className="flex-1 border-slate-300 font-mono text-xs uppercase"
                   />
                </div>
              </div>
           </div>
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-800">
           <ArrowUpDown className="w-5 h-5 text-accent-600" /> Paragraph
        </h3>
        
        <div className="space-y-6">
            {/* Line Height */}
            <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Line Height</Label>
                <div className="flex flex-wrap gap-2">
                    {LINE_HEIGHTS.map(lh => (
                        <Button
                           key={lh}
                           variant={settings.lineHeight === lh ? "default" : "outline"}
                           size="sm"
                           onClick={() => onUpdate('lineHeight', lh)}
                           className={cn(
                             "w-12 h-9 font-medium transition-all",
                             settings.lineHeight === lh ? "bg-accent-600 hover:bg-accent-700 text-white border-transparent shadow-md" : "text-slate-600 border-slate-300 hover:bg-slate-100"
                           )}
                        >
                            {lh}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Text Align */}
            <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Alignment</Label>
                <div className="flex bg-slate-100 p-1 rounded-md border border-slate-200">
                    {[
                        { value: 'left', icon: AlignLeft },
                        { value: 'center', icon: AlignCenter },
                        { value: 'right', icon: AlignRight },
                        { value: 'justify', icon: AlignJustify },
                    ].map((align) => (
                        <Button
                            key={align.value}
                            variant="ghost"
                            size="sm"
                            onClick={() => onUpdate('textAlign', align.value)}
                            className={cn(
                                "flex-1 h-8 rounded transition-all",
                                settings.textAlign === align.value ? "bg-white shadow-sm text-accent-600" : "text-slate-500 hover:text-slate-900"
                            )}
                        >
                            <align.icon className="w-4 h-4" />
                        </Button>
                    ))}
                </div>
            </div>
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-800">
           <Palette className="w-5 h-5 text-accent-600" /> Formatting
        </h3>
        
        <div className="space-y-2">
             <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Style</Label>
             <div className="flex gap-2">
                {[
                    { cmd: 'bold', icon: Bold, label: 'Bold' },
                    { cmd: 'italic', icon: Italic, label: 'Italic' },
                    { cmd: 'underline', icon: Underline, label: 'Underline' },
                    { cmd: 'strikethrough', icon: Strikethrough, label: 'Strike' },
                ].map((format) => (
                    <Button
                        key={format.cmd}
                        variant="outline"
                        onMouseDown={(e) => handleMouseDown(e, () => onFormat(format.cmd))}
                        className="flex-1 h-10 border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-accent-600 transition-colors"
                        title={format.label}
                    >
                        <format.icon className="w-5 h-5" />
                    </Button>
                ))}
             </div>
             <p className="text-[10px] text-slate-400 mt-2">Select text in the editor to apply formatting.</p>
        </div>
      </div>

    </div>
  );
};

export default EditorSettingsPanel;
