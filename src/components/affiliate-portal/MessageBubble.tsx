import { format } from "date-fns";
import { FileText, Download, Image as ImageIcon } from "lucide-react";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_type?: string | null;
}

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
}

export const MessageBubble = ({ message, isOwn }: MessageBubbleProps) => {
  const isImage = message.attachment_type?.startsWith('image/');
  const hasAttachment = !!message.attachment_url;

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2 ${
          isOwn
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-muted rounded-bl-md"
        }`}
      >
        {hasAttachment && (
          <div className="mb-2">
            {isImage ? (
              <a 
                href={message.attachment_url!} 
                target="_blank" 
                rel="noopener noreferrer"
                className="block"
              >
                <img 
                  src={message.attachment_url!} 
                  alt={message.attachment_name || 'Image'} 
                  className="max-w-full rounded-lg max-h-64 object-contain cursor-pointer hover:opacity-90 transition-opacity"
                />
              </a>
            ) : (
              <a
                href={message.attachment_url!}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-2 p-2 rounded-lg ${
                  isOwn 
                    ? "bg-primary-foreground/10 hover:bg-primary-foreground/20" 
                    : "bg-background hover:bg-background/80"
                } transition-colors`}
              >
                <FileText className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm truncate flex-1">
                  {message.attachment_name || 'File'}
                </span>
                <Download className="w-4 h-4 flex-shrink-0" />
              </a>
            )}
          </div>
        )}
        {message.content && !message.content.startsWith('Shared a file:') && (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        )}
        <p
          className={`text-xs mt-1 ${
            isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
          }`}
        >
          {format(new Date(message.created_at), "HH:mm")}
        </p>
      </div>
    </div>
  );
};