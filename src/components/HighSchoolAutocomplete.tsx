import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { School, Loader2, X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHighSchools, type HighSchool } from '@/hooks/useHighSchools';

interface HighSchoolAutocompleteProps {
  label: string;
  placeholder: string;
  value: HighSchool | null; // Selected high school object
  onChange: (highSchool: HighSchool | null) => void;
  className?: string;
}

export const HighSchoolAutocomplete = ({ 
  label, 
  placeholder, 
  value, 
  onChange,
  className 
}: HighSchoolAutocompleteProps) => {
  const [inputValue, setInputValue] = useState('');
  const [filteredHighSchools, setFilteredHighSchools] = useState<HighSchool[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newHighSchoolName, setNewHighSchoolName] = useState('');
  const { highSchools, loading, searchHighSchools, createHighSchool } = useHighSchools();
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const handleAddHighSchool = async () => {
    if (!newHighSchoolName.trim()) return;
    
    const newHighSchool = await createHighSchool(newHighSchoolName.trim());
    if (newHighSchool) {
      onChange(newHighSchool);
      setNewHighSchoolName('');
      setShowAddForm(false);
    }
  };

  return (
    <div className={cn("relative", className)}>
      <Label htmlFor={label.toLowerCase().replace(/\s+/g, '-')}>
        {label}
      </Label>
      
      {showAddForm && (
        <div className="mb-2 p-3 border rounded-md bg-muted/50">
          <div className="flex gap-2">
            <Input
              placeholder="Enter high school name"
              value={newHighSchoolName}
              onChange={(e) => setNewHighSchoolName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddHighSchool();
                } else if (e.key === 'Escape') {
                  setShowAddForm(false);
                  setNewHighSchoolName('');
                }
              }}
            />
            <Button size="sm" onClick={handleAddHighSchool} disabled={!newHighSchoolName.trim()}>
              Add
            </Button>
            <Button size="sm" variant="outline" onClick={() => {
              setShowAddForm(false);
              setNewHighSchoolName('');
            }}>
              Cancel
            </Button>
          </div>
        </div>
      )}
      
      <div className="relative">
        {value ? (
          // Show selected high school
          <div className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm">
            <School className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="font-medium">{value.name}</span>
            </div>
            <button
              type="button"
              className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground rounded-sm flex items-center justify-center"
              onClick={() => onChange(null)}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          // Show input for searching
          <Input
            ref={inputRef}
            id={label.toLowerCase().replace(/\s+/g, '-')}
            type="text"
            value={inputValue}
            onChange={(e) => {
              const newValue = e.target.value;
              setInputValue(newValue);
              
              if (newValue.length >= 2) {
                searchHighSchools(newValue);
                setShowSuggestions(true);
              } else {
                setFilteredHighSchools([]);
                setShowSuggestions(false);
              }
            }}
            onFocus={() => {
              if (inputValue.length >= 2) {
                setShowSuggestions(true);
              }
            }}
            onBlur={(e) => {
              setTimeout(() => {
                if (!suggestionsRef.current?.contains(e.relatedTarget as Node)) {
                  setShowSuggestions(false);
                }
              }, 200);
            }}
            placeholder={placeholder}
            className="pr-8"
          />
        )}
        
        {loading && !value && (
          <Loader2 className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
        {!loading && !value && inputValue && (
          <School className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        )}
      </div>

      {showSuggestions && (
        <Card 
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-auto border bg-popover p-1 shadow-lg"
        >
          {loading ? (
            <div className="p-3 text-center text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1" />
              Searching high schools...
            </div>
          ) : highSchools.length > 0 ? (
            <div className="py-1">
              {highSchools.map((highSchool, index) => (
                <button
                  key={highSchool.id}
                  type="button"
                  onClick={() => {
                    onChange(highSchool);
                    setInputValue('');
                    setShowSuggestions(false);
                  }}
                  className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-accent transition-colors"
                >
                  <School className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="truncate">{highSchool.name}</span>
                </button>
              ))}
            </div>
          ) : inputValue.length >= 2 ? (
            <div className="p-3 text-center">
              <p className="text-muted-foreground text-sm mb-2">No high schools found</p>
              <button
                type="button"
                onClick={async () => {
                  const newHighSchool = await createHighSchool(inputValue.trim());
                  if (newHighSchool) {
                    onChange(newHighSchool);
                    setInputValue('');
                    setShowSuggestions(false);
                  }
                }}
                className="text-primary hover:underline text-sm font-medium"
              >
                Create "{inputValue}"
              </button>
            </div>
          ) : null}
        </Card>
      )}

      {!showAddForm && (
        <button
          type="button"
          className="mt-2 text-sm text-primary hover:text-primary/80 flex items-center gap-1"
          onClick={() => setShowAddForm(true)}
        >
          <Plus className="h-3 w-3" />
          Add your high school
        </button>
      )}
    </div>
  );
};