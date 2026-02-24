import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Loader2, X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCompanyOperations, type Company } from '@/hooks/useCompanyOperations';

interface CompanyAutocompleteProps {
  label: string;
  placeholder: string;
  value: Company | null; // Selected company object
  onChange: (company: Company | null) => void;
  className?: string;
}

export const CompanyAutocomplete = ({ 
  label, 
  placeholder, 
  value, 
  onChange,
  className 
}: CompanyAutocompleteProps) => {
  const [inputValue, setInputValue] = useState('');
  const [allCompanies, setAllCompanies] = useState<Company[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const { getAllCompanies, createCompany, loading } = useCompanyOperations();
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Load all companies on mount
  useEffect(() => {
    const loadCompanies = async () => {
      const companies = await getAllCompanies();
      setAllCompanies(companies);
    };
    loadCompanies();
  }, [getAllCompanies]);

  // Filter companies based on input value
  useEffect(() => {
    if (inputValue.length >= 1) {
      const filtered = allCompanies.filter(company =>
        company.name.toLowerCase().includes(inputValue.toLowerCase())
      );
      setFilteredCompanies(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setFilteredCompanies([]);
      setShowSuggestions(false);
    }
    setSelectedIndex(-1);
  }, [inputValue, allCompanies]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    // If user starts typing and there's a selected company, clear it
    if (value) {
      onChange(null);
    }
  };

  const handleSuggestionClick = (company: Company) => {
    onChange(company);
    setInputValue(''); // Clear input after selection
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  const handleClearSelection = () => {
    onChange(null);
    setInputValue('');
    inputRef.current?.focus();
  };


  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredCompanies.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredCompanies.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < filteredCompanies.length) {
          handleSuggestionClick(filteredCompanies[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleBlur = (e: React.FocusEvent) => {
    // Delay hiding suggestions to allow click events on suggestions
    setTimeout(() => {
      if (!suggestionsRef.current?.contains(e.relatedTarget as Node)) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    }, 200);
  };

  const handleFocus = () => {
    if (inputValue.length >= 1 && !value) {
      setShowSuggestions(filteredCompanies.length > 0);
    }
  };

  const handleAddCompany = async () => {
    if (!newCompanyName.trim()) return;
    
    const newCompany = await createCompany(newCompanyName.trim(), 'Company');
    if (newCompany) {
      setAllCompanies(prev => [...prev, newCompany]);
      onChange(newCompany);
      setNewCompanyName('');
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
              placeholder="Enter company name"
              value={newCompanyName}
              onChange={(e) => setNewCompanyName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCompany();
                } else if (e.key === 'Escape') {
                  setShowAddForm(false);
                  setNewCompanyName('');
                }
              }}
            />
            <Button size="sm" onClick={handleAddCompany} disabled={!newCompanyName.trim()}>
              Add
            </Button>
            <Button size="sm" variant="outline" onClick={() => {
              setShowAddForm(false);
              setNewCompanyName('');
            }}>
              Cancel
            </Button>
          </div>
        </div>
      )}
      
      <div className="relative">
        {value ? (
          // Show selected company
          <div className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm">
            <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="font-medium">{value.name}</span>
              {value.type && <span className="text-muted-foreground ml-1">({value.type})</span>}
            </div>
            <button
              type="button"
              className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground rounded-sm flex items-center justify-center"
              onClick={handleClearSelection}
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
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            onFocus={handleFocus}
            placeholder={placeholder}
            className="pr-8"
          />
        )}
        
        {loading && !value && (
          <Loader2 className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
        {!loading && !value && inputValue && (
          <Building2 className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        )}
      </div>

      {showSuggestions && filteredCompanies.length > 0 && (
        <Card 
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-auto border bg-popover p-1 shadow-lg"
        >
          {filteredCompanies.map((company, index) => (
            <div
              key={company.id}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm cursor-pointer transition-colors",
                index === selectedIndex
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent hover:text-accent-foreground"
              )}
              onClick={() => handleSuggestionClick(company)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{company.name}</p>
                {company.type && (
                  <p className="text-xs text-muted-foreground truncate">
                    {company.type}
                  </p>
                )}
              </div>
            </div>
          ))}
        </Card>
      )}

      {!showAddForm && (
        <button
          type="button"
          className="mt-2 text-sm text-primary hover:text-primary/80 flex items-center gap-1"
          onClick={() => setShowAddForm(true)}
        >
          <Plus className="h-3 w-3" />
          Add your company
        </button>
      )}
    </div>
  );
};