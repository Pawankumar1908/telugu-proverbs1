import axios from "axios";
import { API_BASE_URL } from "./config";

export const sendMessage = async (message) => {
  return axios.post(`${API_BASE_URL}/chat`, {
    message,
    user_id: "user1"
  });
};
