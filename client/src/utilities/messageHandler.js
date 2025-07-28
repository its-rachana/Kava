// Message handler utility for batch operations
import { encodeText, decodeText } from './textEncoder';

// Function to encode multiple messages (useful for bulk operations)
export const encodeMessages = (messages) => {
    return messages.map(message => ({
        ...message,
        text: message.text ? encodeText(message.text) : message.text
    }));
};

// Function to decode multiple messages (useful for bulk operations)
export const decodeMessages = (messages) => {
    return messages.map(message => ({
        ...message,
        text: message.text ? decodeText(message.text) : message.text
    }));
};

// Function to handle message encryption for different message types
export const processOutgoingMessage = (messageData) => {
    const processedMessage = { ...messageData };

    // Encode text content
    if (processedMessage.text) {
        processedMessage.text = encodeText(processedMessage.text);
    }

    // Handle location messages - don't encode the location data
    if (processedMessage.isLocation && processedMessage.locationData) {
        // Keep location data as is, but encode the text part
        if (processedMessage.text) {
            processedMessage.text = encodeText(processedMessage.text);
        }
    }

    return processedMessage;
};

// Function to handle message decryption for different message types
export const processIncomingMessage = (messageData) => {
    const processedMessage = { ...messageData };

    // Decode text content
    if (processedMessage.text) {
        processedMessage.text = decodeText(processedMessage.text);
    }

    return processedMessage;
};

// Function to safely handle message processing with error handling
export const safeProcessMessage = (message, isOutgoing = false) => {
    try {
        return isOutgoing
            ? processOutgoingMessage(message)
            : processIncomingMessage(message);
    } catch (error) {
        console.error('Error processing message:', error);
        return message; // Return original message if processing fails
    }
};
