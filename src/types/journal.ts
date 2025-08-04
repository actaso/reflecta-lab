// collection name on firestore: "entries"
export type JournalEntry = {
  id: string;
  timestamp: Date; // created at
  content: string;
  uid: string; // user id from firebase auth & clerk (should be the same)
  lastUpdated: Date; // last time a change happened to this entry
  images?: ImageMetadata[]; // metadata of images contained in this entry
};

// Image metadata stored with journal entries
export type ImageMetadata = {
  filename: string; // filename in Firebase Storage
  url: string; // Firebase Storage download URL
  size: number; // file size in bytes
  type: string; // MIME type
  uploadedAt: Date; // when image was uploaded
};



// collection name on firestore: "users"
export type UserAccount = {
  uid: string;
  createdAt: Date;
  updatedAt: Date;
};