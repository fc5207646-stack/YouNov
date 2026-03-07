
import { toast } from '@/components/ui/use-toast';

/**
 * Standardized error handling for the application.
 * Logs errors to console and displays user-friendly toast messages.
 */

export const handleError = (error, context = 'operation', options = {}) => {
  // 1. Log the full error for debugging
  console.error(`Error during ${context}:`, error);

  // 2. Extract a user-friendly message
  let title = "Error";
  let description = "An unexpected error occurred.";
  let variant = "destructive"; // 'default', 'destructive'

  // Supabase specific error codes
  if (error?.code) {
    switch (error.code) {
      case '42501': // RLS Policy Violation
        title = "Permission Denied";
        description = "You do not have permission to perform this action.";
        break;
      case '23505': // Unique Violation
        title = "Duplicate Entry";
        description = "This record already exists.";
        break;
      case '23503': // Foreign Key Violation
        title = "Operation Failed";
        description = "This record is referenced by other data and cannot be deleted/modified.";
        break;
      case 'PGRST116': // JSON result none
        title = "Not Found";
        description = "The requested data could not be found.";
        break;
      default:
        description = error.message || error.details || description;
    }
  } else if (error instanceof Error) {
    // Standard JS Errors
    description = error.message;
  } else if (typeof error === 'string') {
    description = error;
  }

  // 3. Allow override from options
  if (options.title) title = options.title;
  if (options.description) description = options.description;
  if (options.silent) return; // Don't show toast

  // 4. Show Toast
  toast({
    variant: variant,
    title: title,
    description: description,
  });
};

export const tryCatch = async (asyncFn, context, options) => {
  try {
    return await asyncFn();
  } catch (error) {
    handleError(error, context, options);
    return null; // Or rethrow if needed, but usually we want to handle it safely
  }
};
