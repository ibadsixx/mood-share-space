import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { StoryQuestion } from '@/hooks/useStoryQuestions';
import { Send } from 'lucide-react';

interface StoryQuestionStickerProps {
  question: StoryQuestion;
  onRespond: (response: string) => void;
}

const StoryQuestionSticker = ({ question, onRespond }: StoryQuestionStickerProps) => {
  const [response, setResponse] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (response.trim()) {
      onRespond(response);
      setSubmitted(true);
      setResponse('');
    }
  };

  return (
    <Card className="bg-background/90 backdrop-blur-sm p-4 space-y-3">
      <h4 className="font-semibold text-foreground text-center">{question.question}</h4>
      {!submitted ? (
        <div className="flex gap-2">
          <Input
            placeholder="Type your answer..."
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            className="bg-background/50"
          />
          <Button onClick={handleSubmit} size="icon">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <p className="text-sm text-center text-muted-foreground">
          Response sent! ✓
        </p>
      )}
    </Card>
  );
};

export default StoryQuestionSticker;
