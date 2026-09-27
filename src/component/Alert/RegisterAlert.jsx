export default function RegisterAlert({ message, onClose }) {
    return (
      <div className="absolute bottom-2 right-2 animate-fade-in">
        <div className="bg-gradient-to-br from-[#B301B3] to-[#6D28D9] text-white text-xs px-4 py-2 rounded-lg shadow-lg flex items-center justify-between space-x-2 max-w-xs">
          <span className="truncate">{message}</span>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 text-sm"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }
  