export interface Exercise {
    id: string;
    name: string;
    description: string;
    submittedByF3Name: string;
    isApproved: boolean;
    category?: string; // Undefined for back-compatability
}