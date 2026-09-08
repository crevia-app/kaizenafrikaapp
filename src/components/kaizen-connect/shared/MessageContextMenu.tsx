import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Trash2,
  Star,
  Forward,
  Copy,
  Pin,
  PinOff,
  StarOff,
  MoreVertical,
} from "lucide-react";
import { toast } from "sonner";

interface MessageContextMenuProps {
  messageId: string;
  roomId: string;
  content: string | null;
  isMine: boolean;
  currentUserId: string;
  isPinned: boolean;
  isFavorited: boolean;
  onDeleteForMe: (messageId: string) => void;
  onDeleteForEveryone: (messageId: string) => void;
  onForward: (messageId: string) => void;
  onPinToggle: (messageId: string, isPinned: boolean) => void;
  onFavoriteToggle: (messageId: string, isFavorited: boolean) => void;
}

const MessageContextMenu = ({
  messageId,
  roomId,
  content,
  isMine,
  currentUserId,
  isPinned,
  isFavorited,
  onDeleteForMe,
  onDeleteForEveryone,
  onForward,
  onPinToggle,
  onFavoriteToggle,
}: MessageContextMenuProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDeleteForMeDialog, setShowDeleteForMeDialog] = useState(false);

  const handleCopy = () => {
    if (content) {
      navigator.clipboard.writeText(content);
      toast.success("Message copied");
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-muted/50">
            <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={isMine ? "end" : "start"} side="top" sideOffset={6} className="w-48">
          {content && (
            <DropdownMenuItem onClick={handleCopy}>
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => onForward(messageId)}>
            <Forward className="h-4 w-4 mr-2" />
            Forward
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onFavoriteToggle(messageId, isFavorited)}>
            {isFavorited ? (
              <>
                <StarOff className="h-4 w-4 mr-2" />
                Remove from Favorites
              </>
            ) : (
              <>
                <Star className="h-4 w-4 mr-2" />
                Add to Favorites
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onPinToggle(messageId, isPinned)}>
            {isPinned ? (
              <>
                <PinOff className="h-4 w-4 mr-2" />
                Unpin Message
              </>
            ) : (
              <>
                <Pin className="h-4 w-4 mr-2" />
                Pin Message
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setShowDeleteForMeDialog(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete for Me
          </DropdownMenuItem>
          {isMine && (
            <DropdownMenuItem
              onClick={() => setShowDeleteDialog(true)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete for Everyone
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeleteForMeDialog} onOpenChange={setShowDeleteForMeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete for you?</AlertDialogTitle>
            <AlertDialogDescription>
              This message will be removed from your view only. Others can still see it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDeleteForMe(messageId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete for Me
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete for everyone?</AlertDialogTitle>
            <AlertDialogDescription>
              This message will be deleted for all participants. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDeleteForEveryone(messageId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete for Everyone
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default MessageContextMenu;
