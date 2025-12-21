import { customAlphabet } from "nanoid";

// Generate a 6-character alphanumeric session PIN
const nanoid = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 6);
export const generateSessionPin = () => nanoid();

// Format question key for tracking revealed questions
export const getQuestionKey = (categoryIndex: number, pointValue: number) =>
  `${categoryIndex}-${pointValue}`;

// Format date for display
export const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

// Check if a value is a valid point value
export const isValidPointValue = (value: number): boolean => {
  return [200, 400, 600, 800, 1000].includes(value);
};
