
import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Settings, Type, Palette } from 'lucide-react';
import { Label } from '@/components/ui/label';

const BACKGROUND_COLORS = [
  { id: 'white', name: 'White', value: '#ffffff', textColor: '#1e293b' },
  { id: 'cream', name: 'Cream', value: '#fefce8', textColor: '#422006' },
  { id: 'light-gray', name: 'Light Gray', value: '#f1f5f9', textColor: '#1e293b' },
  { id: 'dark-gray', name: 'Dark Gray', value: '#1e293b', textColor: '#f1f5f9' },
  { id: 'dark-blue', name: 'Dark Blue', value: '#0f172a', textColor: '#e2e8f0' },
];

const ReaderSettings = ({ settings, onUpdate }) => {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="text-slate-600 hover:text-slate-800 hover:bg-stone-100">
          <Settings className="w-5 h-5" />
        </Button>
      </SheetTrigger>
      <SheetContent className="bg-white border-slate-200 text-slate-800 w-[350px] shadow-xl">
        <SheetHeader>
          <SheetTitle className="text-white text-xl">Reading Settings</SheetTitle>
        </SheetHeader>
        
        <div className="py-6 space-y-8">
          {/* Font Size */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base flex items-center gap-2">
                <Type className="w-4 h-4 text-accent-400" />
                Font Size
              </Label>
              <span className="text-sm font-mono bg-stone-100 px-2 py-1 rounded text-accent-600">
                {settings.fontSize}px
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Type className="w-4 h-4 text-slate-500" />
              <Slider
                value={[settings.fontSize]}
                min={12}
                max={24}
                step={1}
                onValueChange={([val]) => {
                  onUpdate({ ...settings, fontSize: val });
                  localStorage.setItem('readerFontSize', val.toString());
                }}
                className="flex-1"
              />
              <Type className="w-6 h-6 text-slate-300" />
            </div>
            <div className="text-xs text-slate-500 text-center">
              Adjust text size for comfortable reading
            </div>
          </div>

          {/* Line Height */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base">Line Spacing</Label>
              <span className="text-sm font-mono bg-stone-100 px-2 py-1 rounded text-accent-600">
                {settings.lineHeight.toFixed(1)}
              </span>
            </div>
            <Slider
              value={[settings.lineHeight * 10]}
              min={10}
              max={25}
              step={1}
              onValueChange={([val]) => onUpdate({ ...settings, lineHeight: val / 10 })}
            />
          </div>

          {/* Background Color */}
          <div className="space-y-4">
            <Label className="text-base flex items-center gap-2">
              <Palette className="w-4 h-4 text-accent-400" />
              Background Color
            </Label>
            <div className="grid grid-cols-2 gap-3">
              {BACKGROUND_COLORS.map((color) => (
                <button
                  key={color.id}
                  onClick={() => {
                    onUpdate({ ...settings, bgColor: color.value, textColor: color.textColor });
                    localStorage.setItem('readerBgColor', color.value);
                    localStorage.setItem('readerTextColor', color.textColor);
                  }}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    settings.bgColor === color.value
                      ? 'border-accent-500 ring-2 ring-accent-500/30 shadow-lg'
                      : 'border-slate-700 hover:border-slate-600'
                  }`}
                  style={{ 
                    backgroundColor: color.value,
                    color: color.textColor
                  }}
                >
                  <div className="text-sm font-medium mb-1">{color.name}</div>
                  <div className="text-xs opacity-70">Sample text</div>
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="p-4 rounded-lg border border-slate-200 bg-stone-50">
            <div className="text-xs text-slate-400 mb-2 uppercase tracking-wider">Preview</div>
            <div 
              className="p-4 rounded transition-colors"
              style={{ 
                backgroundColor: settings.bgColor || '#0f172a',
                color: settings.textColor || '#e2e8f0',
                fontSize: `${settings.fontSize}px`,
                lineHeight: settings.lineHeight
              }}
            >
              The quick brown fox jumps over the lazy dog. These settings will apply to your reading experience.
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ReaderSettings;
