import axios from 'axios';
import { API_BASE_URL, REQUEST_TIMEOUT } from '../config.js';

export const httpClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT,
});
