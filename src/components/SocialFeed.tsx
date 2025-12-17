"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

const feedTypeConfig: Record<
  string,
  { icon: string; bgColor: string; borderColor: string }
> = {
  birdie: {
    icon: "🐦",
    bgColor: "bg-green-500/20",
    borderColor: "border-green-500/40",
  },
  eagle: {
    icon: "🦅",
    bgColor: "bg-yellow-500/20",
    borderColor: "border-yellow-500/40",
  },
  snake: {
    icon: "🐍",
    bgColor: "bg-red-500/20",
    borderColor: "border-red-500/40",
  },
  sabotage: {
    icon: "💣",
    bgColor: "bg-purple-500/20",
    borderColor: "border-purple-500/40",
  },
  powerup: {
    icon: "⚡",
    bgColor: "bg-blue-500/20",
    borderColor: "border-blue-500/40",
  },
  score: {
    icon: "⛳",
    bgColor: "bg-white/10",
    borderColor: "border-white/20",
  },
  info: {
    icon: "📢",
    bgColor: "bg-white/10",
    borderColor: "border-white/20",
  },
};

function formatTimestamp(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(timestamp).toLocaleDateString();
}

export function SocialFeed() {
  const feed = useQuery(api.feed.getLatestFeed, { limit: 50 });

  if (feed === undefined) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse text-white/60">Loading feed...</div>
      </div>
    );
  }

  if (feed.length === 0) {
    return (
      <div className="h-full flex items-center justify-center px-4">
        <div className="text-center text-white/60">
          <p className="text-4xl mb-2">🏌️</p>
          <p>No activity yet!</p>
          <p className="text-sm">Start playing to see the action here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-3">
      <h2 className="font-[var(--font-fredoka)] text-lg font-semibold text-white mb-3 flex items-center gap-2">
        📣 Live Feed
      </h2>

      <div className="space-y-3">
        {feed.map((item) => {
          const config = feedTypeConfig[item.type] || feedTypeConfig.info;

          return (
            <div
              key={item._id}
              className={`card-christmas p-4 ${config.bgColor} border ${config.borderColor} transition-all hover:scale-[1.01]`}
            >
              <div className="flex items-start gap-3">
                {/* Avatar or Icon */}
                <div className="flex-shrink-0 relative">
                  {item.player?.avatarUrl ? (
                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#ffd700]/50 shadow-[0_0_10px_rgba(255,215,0,0.2)] bg-gradient-to-br from-[#c41e3a] to-[#228b22]">
                      <img
                        src={item.player.avatarUrl}
                        alt={item.player.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : item.player ? (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#c41e3a] to-[#228b22] border-2 border-white/30 flex items-center justify-center text-lg font-bold text-white">
                      {item.player.name.charAt(0).toUpperCase()}
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-2xl">
                      {config.icon}
                    </div>
                  )}
                  {/* Event badge */}
                  {item.player && (
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white/90 flex items-center justify-center text-sm shadow-md">
                      {config.icon}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm">{item.message}</p>

                  <div className="flex items-center gap-2 mt-1">
                    {item.team && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${item.team.color}40`,
                          color: item.team.color,
                        }}
                      >
                        {item.team.name}
                      </span>
                    )}
                    <span className="text-white/40 text-xs">
                      {formatTimestamp(item.timestamp)}
                    </span>
                  </div>
                </div>

                {/* Type Icon - only show if no player avatar */}
                {!item.player && (
                  <div className="text-2xl">{config.icon}</div>
                )}
              </div>

              {/* Media (if any) */}
              {item.mediaUrl && (
                <div className="mt-3 rounded-lg overflow-hidden">
                  <img
                    src={item.mediaUrl}
                    alt=""
                    className="w-full h-auto max-h-48 object-cover"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
