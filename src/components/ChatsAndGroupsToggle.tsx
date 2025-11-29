"use client";

import { FC } from "react";

interface ChatsAndGroupsToggleProps {
  onViewChange: (view: "chats" | "groups") => void;
  currentView: "chats" | "groups";
}

/**
 * Component that toggles between showing individual chats and groups.
 * 
 * @param onViewChange - Callback when view changes
 * @param currentView - Current view state ("chats" or "groups")
 */
const ChatsAndGroupsToggle: FC<ChatsAndGroupsToggleProps> = ({
  onViewChange,
  currentView,
}) => {
  return (
    <div className="flex gap-2 mb-4 border-b border-gray-200">
      <button
        onClick={() => onViewChange("chats")}
        className={`flex-1 py-2 px-4 text-sm font-semibold transition-colors ${
          currentView === "chats"
            ? "text-indigo-600 border-b-2 border-indigo-600"
            : "text-gray-500 hover:text-gray-700"
        }`}>
        Your chats
      </button>
      <button
        onClick={() => onViewChange("groups")}
        className={`flex-1 py-2 px-4 text-sm font-semibold transition-colors ${
          currentView === "groups"
            ? "text-indigo-600 border-b-2 border-indigo-600"
            : "text-gray-500 hover:text-gray-700"
        }`}>
        Your Groups
      </button>
    </div>
  );
};

export default ChatsAndGroupsToggle;

