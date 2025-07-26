import React from 'react';
import { MessageCircle } from 'lucide-react';

const ChatButton = ({ onClick, isOpen }) => {
  return (
    <button
      onClick={onClick}
      className={`fixed bottom-4 right-4 w-14 h-14 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 z-40 ${
        isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      title="Chat with AI Assistant"
    >
      <MessageCircle className="w-6 h-6 mx-auto" />
    </button>
  );
};

export default ChatButton; 