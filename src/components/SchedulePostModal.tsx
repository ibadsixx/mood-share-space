import { useState } from 'react';
import { motion } from 'framer-motion';
import { format, addMinutes, isAfter, isBefore, addDays } from 'date-fns';
import { Calendar, Clock, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface ScheduleData {
  date: Date;
  time: string;
}

interface SchedulePostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSchedule: (scheduledAt: Date) => void;
}

const SchedulePostModal = ({ open, onOpenChange, onSchedule }: SchedulePostModalProps) => {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Generate time options (every 15 minutes)
  const timeOptions = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      timeOptions.push(timeString);
    }
  }

  const validateSchedule = (date: Date, timeStr: string): string | null => {
    if (!date || !timeStr) return 'Please select both date and time';

    const [hours, minutes] = timeStr.split(':').map(Number);
    const scheduledDateTime = new Date(date);
    scheduledDateTime.setHours(hours, minutes, 0, 0);

    const now = new Date();
    const minScheduleTime = addMinutes(now, 5);

    if (isBefore(scheduledDateTime, minScheduleTime)) {
      return 'Scheduled time must be at least 5 minutes in the future';
    }

    const maxScheduleTime = addDays(now, 365); // Max 1 year in future
    if (isAfter(scheduledDateTime, maxScheduleTime)) {
      return 'Posts can only be scheduled up to 1 year in advance';
    }

    return null;
  };

  const handleSchedule = () => {
    if (!selectedDate || !selectedTime) {
      setError('Please select both date and time');
      return;
    }

    const validationError = validateSchedule(selectedDate, selectedTime);
    if (validationError) {
      setError(validationError);
      return;
    }

    const [hours, minutes] = selectedTime.split(':').map(Number);
    const scheduledDateTime = new Date(selectedDate);
    scheduledDateTime.setHours(hours, minutes, 0, 0);

    onSchedule(scheduledDateTime);
    
    // Reset form
    setSelectedDate(undefined);
    setSelectedTime('');
    setError('');
    onOpenChange(false);
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setError('');
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setError('');
  };

  const getPreviewText = () => {
    if (!selectedDate || !selectedTime) return '';
    
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const scheduledDateTime = new Date(selectedDate);
    scheduledDateTime.setHours(hours, minutes, 0, 0);
    
    return `Your post will be published on ${format(scheduledDateTime, 'MMMM d, yyyy')} at ${format(scheduledDateTime, 'h:mm a')}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Schedule Post
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Date Picker */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Select Date</Label>
            <div className="border border-border rounded-lg p-3">
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                disabled={(date) => isBefore(date, new Date())}
                className={cn("w-full pointer-events-auto")}
                initialFocus
              />
            </div>
          </div>

          {/* Time Picker */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Select Time</Label>
            <Select value={selectedTime} onValueChange={handleTimeSelect}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose time" />
              </SelectTrigger>
              <SelectContent>
                <div className="max-h-60 overflow-y-auto">
                  {timeOptions.map((time) => (
                    <SelectItem key={time} value={time}>
                      {format(new Date(`2000-01-01T${time}`), 'h:mm a')}
                    </SelectItem>
                  ))}
                </div>
              </SelectContent>
            </Select>
          </div>

          {/* Preview */}
          {selectedDate && selectedTime && !error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-primary/5 border border-primary/20 rounded-lg p-4"
            >
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-primary">Scheduled for:</p>
                  <p className="text-sm text-muted-foreground">{getPreviewText()}</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Timezone Notice */}
          <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-3">
            <p>Times are shown in your local timezone. Your post will be published exactly at the scheduled time.</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSchedule}
            disabled={!selectedDate || !selectedTime || !!error}
            className="bg-primary hover:bg-primary/90"
          >
            Schedule Post
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SchedulePostModal;