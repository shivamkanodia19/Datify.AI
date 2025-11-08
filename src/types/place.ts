export interface Place {
  id: string;
  name: string;
  type: string;
  rating?: number;
  description: string;
  address: string;
  highlights: string[];
  userRating?: string;
  lat?: number;
  lng?: number;
  imageUrl?: string;
}
