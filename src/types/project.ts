export interface Project {
  id: string;
  name: string;
  location: string;
  capacity: number;
  total_plots: number;
  buying_price: number;
  description?: string;
  tenant_id?: string;
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
  tenant_id?: string;
  created_at: string;
  updated_at: string;
  // Joined fields (partial)
  project?: Partial<Project> & { id: string; name: string; location: string };
  client?: {
    id: string;
    name: string;
    phone?: string;
  };
}
