import { BarChart3, MessageCircleQuestion, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface StoryInteractiveStickersProps {
  onCreatePoll: (question: string, options: string[]) => void;
  onCreateQuestion: (question: string) => void;
}

const StoryInteractiveStickers = ({ onCreatePoll, onCreateQuestion }: StoryInteractiveStickersProps) => {
  const [open, setOpen] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [questionText, setQuestionText] = useState('');

  const handleAddPollOption = () => {
    if (pollOptions.length < 4) {
      setPollOptions([...pollOptions, '']);
    }
  };

  const handlePollOptionChange = (index: number, value: string) => {
    const newOptions = [...pollOptions];
    newOptions[index] = value;
    setPollOptions(newOptions);
  };

  const handleCreatePoll = () => {
    const validOptions = pollOptions.filter(opt => opt.trim());
    if (pollQuestion.trim() && validOptions.length >= 2) {
      onCreatePoll(pollQuestion, validOptions);
      setPollQuestion('');
      setPollOptions(['', '']);
      setOpen(false);
    }
  };

  const handleCreateQuestion = () => {
    if (questionText.trim()) {
      onCreateQuestion(questionText);
      setQuestionText('');
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
          <Plus className="w-5 h-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Interactive Sticker</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="poll">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="poll">
              <BarChart3 className="w-4 h-4 mr-2" />
              Poll
            </TabsTrigger>
            <TabsTrigger value="question">
              <MessageCircleQuestion className="w-4 h-4 mr-2" />
              Question
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="poll" className="space-y-4">
            <div>
              <Label>Question</Label>
              <Input
                placeholder="Ask a question..."
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Options (2-4)</Label>
              {pollOptions.map((option, index) => (
                <Input
                  key={index}
                  placeholder={`Option ${index + 1}`}
                  value={option}
                  onChange={(e) => handlePollOptionChange(index, e.target.value)}
                />
              ))}
              {pollOptions.length < 4 && (
                <Button
                  variant="outline"
                  onClick={handleAddPollOption}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Option
                </Button>
              )}
            </div>
            <Button onClick={handleCreatePoll} className="w-full">
              Add Poll
            </Button>
          </TabsContent>
          
          <TabsContent value="question" className="space-y-4">
            <div>
              <Label>Question</Label>
              <Input
                placeholder="Ask your audience..."
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
              />
            </div>
            <Button onClick={handleCreateQuestion} className="w-full">
              Add Question
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default StoryInteractiveStickers;
