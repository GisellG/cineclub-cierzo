export type TicketStatus = 'pending' | 'confirmed' | 'rejected' | string;

export interface Cicle {
  id?: string;
  title?: string;
  description?: string;
  [key: string]: unknown;
}

export interface Ticket {
  id: string;
  movie_id: string;
  user_id: string;
  recipt_url?: string;
  status: TicketStatus;
  seats?: string[];
  created_at?: string;
  movie_screening?: MovieScreening | null;
  profiles?: Profile | null;
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
  cicle_id?: string | null;
  cicles?: Cicle | null;
  tickets?: Ticket[];
  ticket?: Ticket[];
  [key: string]: unknown;
}

export interface CreateMovieInput {
  title: string;
  description?: string;
  date_time: string;
  mins_duration: number;
  max_capacity: number;
  poster_url?: string;
  cicle_id?: string | null;
}

export interface BookingTicketParams {
  movieId: string;
  userId: string;
  fileVoucher: File;
  getMember: boolean;
  seats?: string[];
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
