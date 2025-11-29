import PusherServer from "pusher";
import PusherClient from "pusher-js";

export const pusherServer = new PusherServer({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_APP_KEY!,
  secret: process.env.PUSHER_APP_SECRET!,
  cluster: "ap2",
  useTLS: true,
});

// Singleton pattern for Pusher client - only create on client side
let pusherClientInstance: PusherClient | null = null;

/**
 * Gets or creates the Pusher client instance.
 * Ensures singleton pattern and client-side only initialization.
 * 
 * @returns The Pusher client instance
 */
const getPusherClient = (): PusherClient => {
  // Only create on client side
  if (typeof window === "undefined") {
    throw new Error("Pusher client can only be used on the client side");
  }

  if (!pusherClientInstance) {
    const pusherKey = process.env.NEXT_PUBLIC_PUSHER_APP_KEY;
    
    if (!pusherKey) {
      throw new Error("NEXT_PUBLIC_PUSHER_APP_KEY is not set");
    }

    console.log("[Pusher] Initializing Pusher client...");
    
    pusherClientInstance = new PusherClient(pusherKey, {
      cluster: "ap2",
      // Enable automatic reconnection with exponential backoff
      enabledTransports: ["ws", "wss"],
      // Disable unavailable transport fallback to ensure we always use websockets
      disableStats: true,
      // Ensure connection is maintained with TLS
      forceTLS: true,
      // Pusher automatically handles reconnection on connection loss
    });

    // Connect immediately
    pusherClientInstance.connect();
    
    // Track reconnection attempts
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    
    // Log connection events for debugging
    pusherClientInstance.connection.bind("connected", () => {
      console.log("[Pusher] ✅ Client connected successfully");
      reconnectAttempts = 0; // Reset on successful connection
    });
    
    pusherClientInstance.connection.bind("disconnected", () => {
      console.log("[Pusher] ⚠️ Client disconnected - will attempt to reconnect");
      reconnectAttempts++;
    });
    
    pusherClientInstance.connection.bind("error", (error: any) => {
      console.error("[Pusher] ❌ Connection error:", error);
      
      // Log detailed error information
      if (error?.error) {
        console.error("[Pusher] Error details:", {
          type: error.type,
          error: error.error,
          message: error.error?.message || error.error?.type || "Unknown error",
        });
      }
      
      // Handle WebSocket errors specifically
      if (error?.type === "WebSocketError" || error?.error?.type === "WebSocketError") {
        console.warn("[Pusher] WebSocket error detected - Pusher will attempt to reconnect automatically");
        
        // If we've had too many reconnection attempts, log a warning
        if (reconnectAttempts >= maxReconnectAttempts) {
          console.error(`[Pusher] ⚠️ Multiple reconnection attempts (${reconnectAttempts}). Check network connection and Pusher configuration.`);
        }
      }
      
      // Pusher automatically handles reconnection, but we can force it if needed
      if (pusherClientInstance && pusherClientInstance.connection.state === "failed") {
        console.log("[Pusher] Connection failed, attempting manual reconnect...");
        setTimeout(() => {
          if (pusherClientInstance && pusherClientInstance.connection.state !== "connected") {
            pusherClientInstance.connect();
          }
        }, 2000);
      }
    });

    pusherClientInstance.connection.bind("state_change", (states: { previous: string; current: string }) => {
      console.log(`[Pusher] Connection state: ${states.previous} → ${states.current}`);
      
      // Reset reconnect attempts when we successfully connect
      if (states.current === "connected") {
        reconnectAttempts = 0;
      }
      
      // Log important state transitions
      if (states.current === "failed") {
        console.error("[Pusher] ⚠️ Connection failed - Pusher will attempt to reconnect");
      }
    });
    
    // Handle connection unavailable
    pusherClientInstance.connection.bind("unavailable", () => {
      console.warn("[Pusher] ⚠️ Connection unavailable - Pusher will retry");
    });
  }

  return pusherClientInstance;
};

/**
 * Exported Pusher client instance.
 * Only use this in client components (marked with "use client").
 * The client is lazily initialized on first access in a client component.
 */
export const pusherClient = new Proxy({} as PusherClient, {
  get(_target, prop, receiver) {
    if (typeof window === "undefined") {
      console.warn("[Pusher] Attempted to access Pusher client on server side");
      return undefined;
    }
    const client = getPusherClient();
    const value = Reflect.get(client, prop, receiver);
    // If it's a function, bind it to the client
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});
