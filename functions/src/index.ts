import { onDocumentDeleted } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

// Initialize the Admin SDK to get "God Mode" backend privileges
admin.initializeApp();

// This function listens for any deletion in the "users" collection
export const deleteAuthOnDocDelete = onDocumentDeleted("users/{userId}", async (event) => {
  // Grab the ID of the user that was just deleted from the database
  const userId = event.params.userId;

  try {
    // Delete their actual login credentials from Firebase Auth
    await admin.auth().deleteUser(userId);
    console.log(`Successfully deleted auth credentials for user: ${userId}`);
  } catch (error) {
    console.error(`Failed to delete auth user ${userId}:`, error);
  }
});