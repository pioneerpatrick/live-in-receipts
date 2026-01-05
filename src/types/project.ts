export interface Project {
  id: string;
  name: string;
  location: string;
  total_plots: number;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Plot {
  id: string;
  project_id: string;
  plot_number: string;
  size: string;
  price: number;
  status: 'available' | 'sold' | 'reserved';
  client_id?: string;
  sold_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  project?: Project;
  client?: {
    id: string;
    name: string;
    phone?: string;
  };
}
