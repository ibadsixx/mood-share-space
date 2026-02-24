import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Users, UserPlus, X, ChevronRight, Loader2 } from "lucide-react";
import { useRef } from "react";
import { Link } from "react-router-dom";
import { usePeopleYouMayKnow } from "@/hooks/usePeopleYouMayKnow";

export const PeopleYouMayKnow = () => {
  const { suggestions, loading, removeSuggestion, sendFriendRequest } = usePeopleYouMayKnow(10);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleAddFriend = async (personId: string) => {
    await sendFriendRequest(personId);
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  return (
    <Card className="p-4 bg-card border-border shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Users className="h-5 w-5 text-muted-foreground" />
        <h3 className="font-semibold text-foreground">People you may know</h3>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : suggestions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Users className="h-10 w-10 text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">No suggestions available right now</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Check back later for new connections</p>
        </div>
      ) : (
        <>
          {/* Horizontal scrollable cards */}
          <div className="relative">
            <div 
              ref={scrollRef}
              className="flex gap-3 overflow-x-auto scrollbar-hide pb-2"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {suggestions.map((person) => (
                <div
                  key={person.id}
                  className="relative flex-shrink-0 w-[140px] bg-muted/30 rounded-xl overflow-hidden border border-border/50"
                >
                  {/* Close button */}
                  <button
                    onClick={() => removeSuggestion(person.id)}
                    className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
                    aria-label="Remove suggestion"
                  >
                    <X className="h-3.5 w-3.5 text-white" />
                  </button>

                  {/* Cover/Profile Image */}
                  <Link to={`/profile/${person.username || person.id}`} className="block h-[160px] w-full bg-muted cursor-pointer">
                    {person.profile_pic ? (
                      <img
                        src={person.profile_pic}
                        alt={person.display_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/40">
                        <span className="text-4xl font-bold text-primary/60">
                          {person.display_name?.charAt(0).toUpperCase() || '?'}
                        </span>
                      </div>
                    )}
                  </Link>

                  {/* Info section */}
                  <div className="p-2.5 text-center">
                    <Link to={`/profile/${person.username || person.id}`} className="font-medium text-sm text-foreground truncate block hover:underline">
                      {person.display_name}
                    </Link>
                    {person.mutual_friends_count > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {person.mutual_friends_count} mutual friend{person.mutual_friends_count > 1 ? 's' : ''}
                      </p>
                    )}
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-full mt-2 gap-1.5 text-primary border-primary hover:bg-primary/10"
                      onClick={() => handleAddFriend(person.id)}
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      Add friend
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Scroll right button */}
            {suggestions.length > 3 && (
              <button
                onClick={scrollRight}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-background/90 border border-border shadow-md hover:bg-muted transition-colors"
                aria-label="See more"
              >
                <ChevronRight className="h-5 w-5 text-foreground" />
              </button>
            )}
          </div>

          {/* See all link */}
          <button className="w-full text-center text-primary text-sm font-medium mt-3 hover:underline">
            See all
          </button>
        </>
      )}
    </Card>
  );
};
