import { useLocation, useNavigate } from 'react-router-dom';
import CreateStoryDialog from '@/components/CreateStoryDialog';

const StoryEditor = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const media = (location.state as { media?: { url: string; type?: string } } | null)?.media ?? null;

  const handleClose = () => {
    navigate(-1);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black">
      <CreateStoryDialog
        open
        variant="page"
        initialMedia={media}
        onOpenChange={(o) => {
          if (!o) handleClose();
        }}
      />
    </div>
  );
};

export default StoryEditor;
