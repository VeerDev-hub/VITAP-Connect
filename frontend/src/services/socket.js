import { io } from "socket.io-client";

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
let socket;

export function getSocket() {
  const token = localStorage.getItem("vitap_connect_token");

  if (!socket) {
    socket = io(apiUrl, {
      autoConnect: false,
      auth: { token }
    });
  } else {
    socket.auth = { token };
  }

  return socket;
}
