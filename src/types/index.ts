export type TicketStatus = 'pending' | 'confirmed' | 'rejected' | string;

export interface Cicle {
  title?: string;
  [key: string]: unknown;
}

export interface Ticket {
  id: string;
  movie_id: string;
  user_id: string;
  recipt_url?: string;
  status: TicketStatus;
  created_at?: string;
  [key: string]: unknown;
}

export interface MovieScreening {
  id: string;
  title: string;
  description?: string;
  date_time: string;
  mins_duration: number;
  max_capacity: number;
  poster_url?: string;
  cicles?: Cicle | null;
  tickets?: Ticket[];
  ticket?: Ticket[];
  [key: string]: unknown;
}

export interface BookingTicketParams {
  movieId: string;
  userId: string;
  fileVoucher: File;
  getMember: boolean;
}

export interface Profile {
  id: string;
  email?: string;
  role?: string;
  rol?: string;
  address?: string;
  apartamento?: string;
  torre?: string;
  [key: string]: unknown;
}
