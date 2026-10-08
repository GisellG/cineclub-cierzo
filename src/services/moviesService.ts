import { supabase } from '../lib/supabaseClient';
import { MovieScreening, CreateMovieInput, Cicle } from '../types';

export const moviesService = {
  async getMovies(): Promise<MovieScreening[]> {
    const { data, error } = await supabase
      .from('movie_screening')
      .select(`
        *,
        cicles ( id, title ),
        tickets ( id, status, seats )
      `)
      .order('date_time', { ascending: false });

    if (error) throw error;
    return (data || []) as MovieScreening[];
  },

  async getCicles(): Promise<Cicle[]> {
    const { data, error } = await supabase
      .from('cicles')
      .select('id, title, description')
      .order('title', { ascending: true });

    if (error) {
      console.error('Error fetching cicles:', error);
      return [];
    }
    return (data || []) as Cicle[];
  },

  async uploadPoster(file: File): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `posters/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('receipt')
      .upload(fileName, file);

    if (uploadError) {
      throw new Error(`Error al subir el cartel: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from('receipt')
      .getPublicUrl(fileName);

    return publicUrl;
  },

  async createMovie(input: CreateMovieInput, posterFile?: File): Promise<MovieScreening> {
    let poster_url = input.poster_url || '';

    if (posterFile) {
      poster_url = await this.uploadPoster(posterFile);
    }

    const movieData = {
      title: input.title,
      description: input.description || '',
      date_time: input.date_time,
      mins_duration: input.mins_duration,
      max_capacity: input.max_capacity,
      poster_url: poster_url,
      cicle_id: input.cicle_id || null
    };

    const { data, error } = await supabase
      .from('movie_screening')
      .insert([movieData])
      .select(`
        *,
        cicles ( id, title ),
        tickets ( id, status, seats )
      `)
      .single();

    if (error) throw new Error(`Error al crear la película: ${error.message}`);
    return data as MovieScreening;
  },

  async updateMovie(id: string, input: Partial<CreateMovieInput>, posterFile?: File): Promise<MovieScreening> {
    let poster_url = input.poster_url;

    if (posterFile) {
      poster_url = await this.uploadPoster(posterFile);
    }

    const updateData: Record<string, unknown> = { ...input };
    if (poster_url !== undefined) {
      updateData.poster_url = poster_url;
    }

    const { data, error } = await supabase
      .from('movie_screening')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        cicles ( id, title ),
        tickets ( id, status, seats )
      `)
      .single();

    if (error) throw new Error(`Error al actualizar la película: ${error.message}`);
    return data as MovieScreening;
  },

  async deleteMovie(id: string): Promise<void> {
    const { error } = await supabase
      .from('movie_screening')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Error al eliminar la película: ${error.message}`);
  }
};
