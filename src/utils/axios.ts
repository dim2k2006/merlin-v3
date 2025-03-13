import axios from 'axios';

export const handleAxiosError = (error: unknown, url: string) => {
  if (axios.isAxiosError(error)) {
    if (error.response) {
      throw new Error(
        `API Error Detected. Url: ${url}. Status: ${error.response.status}. Data: ${JSON.stringify(
          error.response.data,
        )}`,
      );
    } else {
      throw new Error(`Network Error Detected. Url: ${url}`);
    }
  } else {
    throw error;
  }
};

export default handleAxiosError;
