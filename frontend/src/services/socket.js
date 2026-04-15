import { io } from "socket.io-client";
import { api } from "./api";

const apiUrl = import.meta.env.VITE_API_URL || "https://vitap-connect.onrender.com";
let socket;

export function getSocket() {
  if (!socket) {
    socket = io(apiUrl, {
      autoConnect: false,
      auth: (cb) => {
        api.get("/auth/socket-ticket")
          .then(res => cb({ token: res.data.ticket }))
          .catch(() => cb({ token: "" }));
      }
    });
  }

  return socket;
}
