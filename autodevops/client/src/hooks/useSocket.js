import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "../context/AuthContext";

const SOCKET_URL = "http://localhost:5000";

export function useSocket() {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [deployEvents, setDeployEvents] = useState([]);

  useEffect(() => {
    if (!user) return;

    const socket = io(SOCKET_URL);
    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      socket.emit("join", user.id);
    });

    socket.on("disconnect", () => setIsConnected(false));

    // Deploy lifecycle events
    const events = ["deploy:queued", "deploy:stage", "deploy:log", "deploy:complete", "deploy:failed"];
    events.forEach((event) => {
      socket.on(event, (data) => {
        setDeployEvents((prev) => [...prev.slice(-200), { event, data, timestamp: Date.now() }]);
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user]);

  const clearEvents = () => setDeployEvents([]);

  return { socket: socketRef.current, isConnected, deployEvents, clearEvents };
}
