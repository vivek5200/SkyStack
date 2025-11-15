// skystack/src/services/api.js
import axios from "axios";

// Workflow API (On-The-Fly Processing)
const WORKFLOW_API_BASE_URL = import.meta.env.VITE_WORKFLOW_API_BASE_URL || "http://api-lb-production-716552440.ap-south-1.elb.amazonaws.com";

// Data Conversion API (AWS App Runner)
const DATA_CONVERSION_API_BASE_URL = import.meta.env.VITE_DATA_CONVERSION_API_BASE_URL || "https://ma2dpgajdk.ap-south-1.awsapprunner.com";

// Default instance for Workflow API (On-The-Fly Processing)
const instance = axios.create({
  baseURL: WORKFLOW_API_BASE_URL, 
});

// Separate instance for Data Conversion API
export const dataConversionAPI = axios.create({
  baseURL: DATA_CONVERSION_API_BASE_URL,
});

export default instance;