import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VisibilitySelector, type Visibility } from '@/components/VisibilitySelector';
import { Save, X } from 'lucide-react';
import { LIFE_EVENT_CATEGORIES, type LifeEventCategory, type LifeEvent, type LifeEventInput } from '@/hooks/useLifeEvents';

interface LifeEventFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (eventData: LifeEventInput) => Promise<boolean>;
  editingEvent?: LifeEvent | null;
}

const getCategoryFields = (category: LifeEventCategory) => {
  switch (category) {
    case 'Work & Education':
      return {
        label: 'Company/School',
        type: 'input' as const,
        placeholder: 'Enter company or school name'
      };
    case 'Family & Relationships':
      return {
        label: "Person's Name",
        type: 'input' as const,
        placeholder: 'Enter person\'s name'
      };
    case 'Travel & Living':
      return {
        label: 'Location',
        type: 'input' as const,
        placeholder: 'Enter location'
      };
    case 'Health & Wellness':
      return {
        label: 'Description',
        type: 'textarea' as const,
        placeholder: 'Describe your health & wellness milestone'
      };
    case 'Milestones & Achievements':
      return {
        label: 'Description',
        type: 'textarea' as const,
        placeholder: 'Describe your milestone or achievement'
      };
    default:
      return {
        label: 'Details',
        type: 'input' as const,
        placeholder: 'Enter details'
      };
  }
};

export const LifeEventForm: React.FC<LifeEventFormProps> = ({
  open,
  onClose,
  onSave,
  editingEvent
}) => {
  const [formData, setFormData] = useState<LifeEventInput>({
    category: 'Work & Education',
    title: '',
    extra_info: '',
    visibility: 'friends'
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editingEvent) {
      setFormData({
        category: editingEvent.category,
        title: editingEvent.title,
        extra_info: editingEvent.extra_info || '',
        visibility: editingEvent.visibility
      });
    } else {
      setFormData({
        category: 'Work & Education',
        title: '',
        extra_info: '',
        visibility: 'friends'
      });
    }
    setErrors({});
  }, [editingEvent, open]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const success = await onSave({
        ...formData,
        title: formData.title.trim(),
        extra_info: formData.extra_info?.trim() || undefined
      });

      if (success) {
        onClose();
      }
    } finally {
      setLoading(false);
    }
  };

  const categoryField = getCategoryFields(formData.category as LifeEventCategory);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingEvent ? 'Edit Life Event' : 'Add Life Event'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Category Selection */}
          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => {
                setFormData(prev => ({ ...prev, category: value, extra_info: '' }));
                setErrors(prev => ({ ...prev, category: '' }));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {LIFE_EVENT_CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && (
              <p className="text-sm text-destructive">{errors.category}</p>
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, title: e.target.value }));
                setErrors(prev => ({ ...prev, title: '' }));
              }}
              placeholder="Enter event title"
              className={errors.title ? 'border-destructive' : ''}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title}</p>
            )}
          </div>

          {/* Dynamic Field */}
          <div className="space-y-2">
            <Label htmlFor="extra_info">{categoryField.label}</Label>
            {categoryField.type === 'textarea' ? (
              <Textarea
                id="extra_info"
                value={formData.extra_info || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, extra_info: e.target.value }))}
                placeholder={categoryField.placeholder}
                rows={3}
              />
            ) : (
              <Input
                id="extra_info"
                value={formData.extra_info || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, extra_info: e.target.value }))}
                placeholder={categoryField.placeholder}
              />
            )}
          </div>

          {/* Visibility */}
          <div className="space-y-2">
            <Label htmlFor="visibility">Who can see this?</Label>
            <VisibilitySelector
              value={formData.visibility}
              onChange={(value: Visibility) => setFormData(prev => ({ ...prev, visibility: value }))}
              className="w-full"
            />
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading}
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};