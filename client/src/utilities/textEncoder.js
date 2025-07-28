// Text encoding/decoding utility
// Using Base64 encoding for simplicity - you can replace with more secure methods

export const encodeText = (text) => {
    try {
        // Convert text to Base64
        return btoa(unescape(encodeURIComponent(text)));
    } catch (error) {
        console.error('Error encoding text:', error);
        return text; // Return original text if encoding fails
    }
};

export const decodeText = (encodedText) => {
    try {
        // Convert Base64 back to text
        return decodeURIComponent(escape(atob(encodedText)));
    } catch (error) {
        console.error('Error decoding text:', error);
        return encodedText; // Return encoded text if decoding fails
    }
};

// Alternative: Simple Caesar cipher (less secure but demonstrates custom encoding)
export const caesarEncode = (text, shift = 3) => {
    return text.split('').map(char => {
        if (char.match(/[a-z]/i)) {
            const code = char.charCodeAt(0);
            const base = code >= 65 && code <= 90 ? 65 : 97;
            return String.fromCharCode(((code - base + shift) % 26) + base);
        }
        return char;
    }).join('');
};

export const caesarDecode = (encodedText, shift = 3) => {
    return caesarEncode(encodedText, -shift);
};

// XOR encoding (more secure than Caesar cipher)
export const xorEncode = (text, key = 'mySecretKey') => {
    let result = '';
    for (let i = 0; i < text.length; i++) {
        result += String.fromCharCode(
            text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
        );
    }
    return btoa(result); // Base64 encode the result for safe storage
};

export const xorDecode = (encodedText, key = 'mySecretKey') => {
    try {
        const decoded = atob(encodedText); // Base64 decode first
        let result = '';
        for (let i = 0; i < decoded.length; i++) {
            result += String.fromCharCode(
                decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length)
            );
        }
        return result;
    } catch (error) {
        console.error('Error decoding XOR text:', error);
        return encodedText;
    }
};
