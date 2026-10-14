import PocketBase from 'pocketbase';

// Apne Render instance ka URL yahan check/update kar lena
export const pb = new PocketBase('https://salaryzapp-pb.onrender.com');

// Auto-cancellation disable karna sensible rehta hai debounced autosave ke liye
pb.autoCancellation(false);