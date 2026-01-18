import { supabase } from '@/integrations/supabase/client';

const DEMO_TENANT_SLUG = 'demo-company';

// Check if demo tenant already exists
export const checkDemoTenantExists = async (): Promise<boolean> => {
  const { data, error } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', DEMO_TENANT_SLUG)
    .maybeSingle();

  if (error) {
    console.error('Error checking demo tenant:', error);
    return false;
  }

  return !!data;
};

// Get demo tenant
export const getDemoTenant = async () => {
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('slug', DEMO_TENANT_SLUG)
    .maybeSingle();

  if (error) {
    console.error('Error fetching demo tenant:', error);
    return null;
  }

  return data;
};

// Create demo tenant with full sample data
export const createDemoTenant = async (): Promise<string | null> => {
  try {
    // Double-check if demo tenant already exists to prevent duplicates
    const existingTenant = await getDemoTenant();
    if (existingTenant) {
      console.log('Demo tenant already exists, skipping creation');
      return existingTenant.id;
    }

    // 1. Create the demo tenant (no custom domain - uses system domain with ?tenant= parameter)
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name: 'Techno Panaly (Demo)',
        slug: DEMO_TENANT_SLUG,
        domain: null, // No custom domain - accessed via system domain with ?tenant=demo-company
        status: 'active',
        primary_color: '#1e40af',
        secondary_color: '#3b82f6',
        accent_color: '#60a5fa',
        contact_email: 'demo@technopanaly.com',
        contact_phone: '+254 700 000 000',
        address: 'Nairobi, Kenya',
        max_users: 10,
        subscription_plan: 'premium',
      })
      .select()
      .single();

    if (tenantError) {
      // Check if it's a duplicate key error (tenant already exists)
      if (tenantError.code === '23505') {
        console.log('Demo tenant already exists (duplicate key), fetching existing');
        const existing = await getDemoTenant();
        return existing?.id || null;
      }
      throw tenantError;
    }

    const tenantId = tenant.id;

    // 2. Create company settings for the demo tenant (ignore if already exists)
    const { error: settingsError } = await supabase.from('company_settings').insert({
      tenant_id: tenantId,
      company_name: 'Techno Panaly',
      company_tagline: 'Receipt Management System Demo',
      phone: '+254 700 000 000',
      email: 'demo@technopanaly.com',
      address: 'Nairobi, Kenya',
      po_box: 'P.O. Box 00100',
      website: 'https://technopanalyrecieptsystem.lovable.app',
      receipt_footer_message: 'This is a demo environment. Thank you for exploring Techno Panaly!',
    });
    
    if (settingsError && settingsError.code !== '23505') {
      console.error('Error creating company settings:', settingsError);
    }

    // 3. Create demo projects
    const projects = [
      {
        tenant_id: tenantId,
        name: 'Sunset Gardens',
        location: 'Kitengela, Kajiado',
        description: 'Premium residential plots with ready title deeds near the bypass.',
        total_plots: 50,
        capacity: 50,
        buying_price: 500000,
      },
      {
        tenant_id: tenantId,
        name: 'Green Valley Estate',
        location: 'Joska, Machakos',
        description: 'Affordable plots in a serene environment with excellent road access.',
        total_plots: 80,
        capacity: 80,
        buying_price: 350000,
      },
      {
        tenant_id: tenantId,
        name: 'Hilltop Heights',
        location: 'Ruiru, Kiambu',
        description: 'Exclusive gated community with panoramic views and modern amenities.',
        total_plots: 30,
        capacity: 30,
        buying_price: 1200000,
      },
    ];

    const { data: insertedProjects, error: projectsError } = await supabase
      .from('projects')
      .insert(projects)
      .select();

    if (projectsError) throw projectsError;

    // 4. Create demo plots for each project
    const plots: any[] = [];
    insertedProjects.forEach((project) => {
      const plotCount = project.name === 'Hilltop Heights' ? 30 : project.name === 'Sunset Gardens' ? 50 : 80;
      const prefix = project.name === 'Sunset Gardens' ? 'A' : project.name === 'Green Valley Estate' ? 'B' : 'C';
      
      for (let i = 1; i <= plotCount; i++) {
        plots.push({
          tenant_id: tenantId,
          project_id: project.id,
          plot_number: `${prefix}-${String(i).padStart(2, '0')}`,
          size: '50x100',
          price: project.buying_price,
          status: 'available',
        });
      }
    });

    const { data: insertedPlots, error: plotsError } = await supabase
      .from('plots')
      .insert(plots)
      .select();

    if (plotsError) throw plotsError;

    // 5. Create demo clients with varying statuses

    const clients = [
      {
        tenant_id: tenantId,
        name: 'John Kamau Mwangi',
        phone: '+254 712 345 678',
        project_name: 'Sunset Gardens',
        plot_number: 'A-01',
        unit_price: 500000,
        number_of_plots: 1,
        total_price: 500000,
        discount: 0,
        total_paid: 500000,
        balance: 0,
        status: 'completed',
        percent_paid: 100,
        sales_agent: 'Sarah Wanjiru',
        payment_type: 'cash',
        sale_date: '2024-01-05',
        completion_date: '2024-01-05',
        commission: 25000,
        commission_received: 25000,
        commission_balance: 0,
      },
      {
        tenant_id: tenantId,
        name: 'Mary Wanjiku Njoroge',
        phone: '+254 723 456 789',
        project_name: 'Green Valley Estate',
        plot_number: 'B-15',
        unit_price: 350000,
        number_of_plots: 1,
        total_price: 350000,
        discount: 10000,
        total_paid: 170000,
        balance: 170000,
        status: 'ongoing',
        percent_paid: 50,
        sales_agent: 'James Ochieng',
        payment_type: 'installments',
        payment_period: '12 months',
        installment_months: 12,
        sale_date: '2024-01-10',
        next_payment_date: '2024-02-15',
        commission: 17500,
        commission_received: 8750,
        commission_balance: 8750,
      },
      {
        tenant_id: tenantId,
        name: 'Peter Ochieng Otieno',
        phone: '+254 734 567 890',
        project_name: 'Sunset Gardens',
        plot_number: 'A-05, A-06',
        unit_price: 500000,
        number_of_plots: 2,
        total_price: 1000000,
        discount: 50000,
        total_paid: 380000,
        balance: 570000,
        status: 'ongoing',
        percent_paid: 40,
        sales_agent: 'Sarah Wanjiru',
        payment_type: 'installments',
        payment_period: '18 months',
        installment_months: 18,
        sale_date: '2023-12-20',
        next_payment_date: '2024-02-01',
        commission: 50000,
        commission_received: 20000,
        commission_balance: 30000,
      },
      {
        tenant_id: tenantId,
        name: 'Grace Njeri Kariuki',
        phone: '+254 745 678 901',
        project_name: 'Hilltop Heights',
        plot_number: 'C-08',
        unit_price: 1200000,
        number_of_plots: 1,
        total_price: 1200000,
        discount: 0,
        total_paid: 300000,
        balance: 900000,
        status: 'ongoing',
        percent_paid: 25,
        sales_agent: 'David Mwangi',
        payment_type: 'installments',
        payment_period: '24 months',
        installment_months: 24,
        sale_date: '2024-01-15',
        next_payment_date: '2024-02-20',
        commission: 60000,
        commission_received: 15000,
        commission_balance: 45000,
      },
      {
        tenant_id: tenantId,
        name: 'David Mwangi Kimani',
        phone: '+254 756 789 012',
        project_name: 'Green Valley Estate',
        plot_number: 'B-22',
        unit_price: 350000,
        number_of_plots: 1,
        total_price: 350000,
        discount: 0,
        total_paid: 262500,
        balance: 87500,
        status: 'ongoing',
        percent_paid: 75,
        sales_agent: 'James Ochieng',
        payment_type: 'installments',
        payment_period: '6 months',
        installment_months: 6,
        sale_date: '2023-11-15',
        next_payment_date: '2024-01-30',
        commission: 17500,
        commission_received: 13125,
        commission_balance: 4375,
      },
      {
        tenant_id: tenantId,
        name: 'Elizabeth Akinyi Oloo',
        phone: '+254 767 890 123',
        project_name: 'Sunset Gardens',
        plot_number: 'A-12',
        unit_price: 500000,
        number_of_plots: 1,
        total_price: 500000,
        discount: 20000,
        total_paid: 480000,
        balance: 0,
        status: 'completed',
        percent_paid: 100,
        sales_agent: 'Sarah Wanjiru',
        payment_type: 'installments',
        payment_period: '12 months',
        installment_months: 12,
        sale_date: '2023-06-01',
        completion_date: '2024-01-10',
        commission: 24000,
        commission_received: 24000,
        commission_balance: 0,
      },
      {
        tenant_id: tenantId,
        name: 'Joseph Kiprop Kosgei',
        phone: '+254 778 901 234',
        project_name: 'Hilltop Heights',
        plot_number: 'C-15, C-16',
        unit_price: 1200000,
        number_of_plots: 2,
        total_price: 2400000,
        discount: 100000,
        total_paid: 1150000,
        balance: 1150000,
        status: 'ongoing',
        percent_paid: 50,
        sales_agent: 'David Mwangi',
        payment_type: 'installments',
        payment_period: '24 months',
        installment_months: 24,
        sale_date: '2023-10-01',
        next_payment_date: '2024-02-05',
        commission: 115000,
        commission_received: 57500,
        commission_balance: 57500,
      },
      {
        tenant_id: tenantId,
        name: 'Nancy Wairimu Maina',
        phone: '+254 789 012 345',
        project_name: 'Green Valley Estate',
        plot_number: 'B-30',
        unit_price: 350000,
        number_of_plots: 1,
        total_price: 350000,
        discount: 15000,
        total_paid: 83750,
        balance: 251250,
        status: 'ongoing',
        percent_paid: 25,
        sales_agent: 'James Ochieng',
        payment_type: 'installments',
        payment_period: '12 months',
        installment_months: 12,
        sale_date: '2024-01-20',
        next_payment_date: '2024-02-25',
        commission: 16750,
        commission_received: 4188,
        commission_balance: 12562,
      },
    ];

    const { data: insertedClients, error: clientsError } = await supabase
      .from('clients')
      .insert(clients)
      .select();

    if (clientsError) throw clientsError;

    // Update plots to mark some as sold
    const plotUpdates = insertedClients.map(async (client) => {
      const plotNumbers = client.plot_number.split(', ');
      for (const plotNumber of plotNumbers) {
        const plot = insertedPlots.find(p => p.plot_number === plotNumber);
        if (plot) {
          await supabase
            .from('plots')
            .update({ status: 'sold', client_id: client.id, sold_at: client.sale_date })
            .eq('id', plot.id);
        }
      }
    });
    await Promise.all(plotUpdates);

    // 6. Create demo payments
    const payments: any[] = [];
    let receiptCounter = 1001;

    // Generate payments for each client
    for (const client of insertedClients) {
      const clientPayments = generatePaymentsForClient(client, tenantId, receiptCounter);
      payments.push(...clientPayments);
      receiptCounter += clientPayments.length;
    }

    if (payments.length > 0) {
      const { error: paymentsError } = await supabase
        .from('payments')
        .insert(payments);

      if (paymentsError) throw paymentsError;
    }

    // 7. Create demo expenses
    const expenses = [
      {
        tenant_id: tenantId,
        category: 'Commission Payout',
        description: 'Sales commission - Sarah Wanjiru (January 2024)',
        amount: 25000,
        expense_date: '2024-01-15',
        payment_method: 'M-Pesa',
        recipient: 'Sarah Wanjiru',
        is_commission_payout: true,
      },
      {
        tenant_id: tenantId,
        category: 'Marketing',
        description: 'Social media advertising campaign',
        amount: 15000,
        expense_date: '2024-01-10',
        payment_method: 'Bank Transfer',
        recipient: 'Digital Marketing Agency',
      },
      {
        tenant_id: tenantId,
        category: 'Office Supplies',
        description: 'Printer paper, ink cartridges, stationery',
        amount: 5500,
        expense_date: '2024-01-08',
        payment_method: 'Cash',
        recipient: 'Office Mart Ltd',
      },
      {
        tenant_id: tenantId,
        category: 'Transport',
        description: 'Site visit fuel and transport costs',
        amount: 8000,
        expense_date: '2024-01-12',
        payment_method: 'M-Pesa',
        recipient: 'James Ochieng',
      },
      {
        tenant_id: tenantId,
        category: 'Legal Fees',
        description: 'Title deed processing fees',
        amount: 25000,
        expense_date: '2024-01-05',
        payment_method: 'Bank Transfer',
        recipient: 'Wanjiku & Associates Advocates',
      },
    ];

    await supabase.from('expenses').insert(expenses);

    console.log('Demo tenant created successfully with ID:', tenantId);
    return tenantId;

  } catch (error) {
    console.error('Error creating demo tenant:', error);
    throw error;
  }
};

// Helper function to generate realistic payment history for a client
function generatePaymentsForClient(client: any, tenantId: string, startingReceiptNumber: number): any[] {
  const payments: any[] = [];
  const saleDate = new Date(client.sale_date);
  let remainingPaid = client.total_paid;
  let currentBalance = client.total_price - client.discount;
  let receiptNum = startingReceiptNumber;

  // Initial payment (usually 20-30% of discounted price)
  const discountedPrice = client.total_price - client.discount;
  const initialPayment = Math.min(remainingPaid, Math.round(discountedPrice * 0.25));
  
  if (initialPayment > 0) {
    payments.push({
      tenant_id: tenantId,
      client_id: client.id,
      amount: initialPayment,
      payment_method: Math.random() > 0.5 ? 'M-Pesa' : 'Bank Transfer',
      payment_date: saleDate.toISOString(),
      previous_balance: currentBalance,
      new_balance: currentBalance - initialPayment,
      receipt_number: `RCP-2024-${String(receiptNum++).padStart(4, '0')}`,
      agent_name: client.sales_agent,
      notes: 'Initial payment at registration',
    });
    currentBalance -= initialPayment;
    remainingPaid -= initialPayment;
  }

  // Subsequent payments (monthly installments)
  let paymentDate = new Date(saleDate);
  while (remainingPaid > 0) {
    paymentDate = new Date(paymentDate.setMonth(paymentDate.getMonth() + 1));
    
    // Don't create future payments
    if (paymentDate > new Date()) break;
    
    const installmentAmount = Math.min(
      remainingPaid,
      Math.round(discountedPrice / (client.installment_months || 12))
    );
    
    if (installmentAmount <= 0) break;

    payments.push({
      tenant_id: tenantId,
      client_id: client.id,
      amount: installmentAmount,
      payment_method: ['M-Pesa', 'Bank Transfer', 'Cash'][Math.floor(Math.random() * 3)],
      payment_date: paymentDate.toISOString(),
      previous_balance: currentBalance,
      new_balance: currentBalance - installmentAmount,
      receipt_number: `RCP-2024-${String(receiptNum++).padStart(4, '0')}`,
      agent_name: client.sales_agent,
      notes: 'Monthly installment payment',
    });
    currentBalance -= installmentAmount;
    remainingPaid -= installmentAmount;
  }

  return payments;
}

// Initialize demo tenant if it doesn't exist
export const initializeDemoTenant = async (): Promise<{ created: boolean; tenantId: string | null }> => {
  const exists = await checkDemoTenantExists();
  
  if (exists) {
    const tenant = await getDemoTenant();
    
    // Fix existing demo tenant: remove fake domain so it uses system domain
    if (tenant && tenant.domain) {
      await supabase
        .from('tenants')
        .update({ domain: null })
        .eq('id', tenant.id);
      console.log('Updated demo tenant to use system domain');
    }
    
    return { created: false, tenantId: tenant?.id || null };
  }

  const tenantId = await createDemoTenant();
  return { created: true, tenantId };
};

// Delete all demo tenant data (keeps the tenant itself)
export const clearDemoTenantData = async (tenantId: string): Promise<void> => {
  try {
    // Delete in order to respect foreign key constraints
    // 1. Delete payments first (references clients)
    await supabase.from('payments').delete().eq('tenant_id', tenantId);
    
    // 2. Delete expenses
    await supabase.from('expenses').delete().eq('tenant_id', tenantId);
    
    // 3. Delete cancelled sales
    await supabase.from('cancelled_sales').delete().eq('tenant_id', tenantId);
    
    // 4. Delete clients
    await supabase.from('clients').delete().eq('tenant_id', tenantId);
    
    // 5. Delete plots (references projects)
    await supabase.from('plots').delete().eq('tenant_id', tenantId);
    
    // 6. Delete projects
    await supabase.from('projects').delete().eq('tenant_id', tenantId);
    
    // 7. Delete company settings
    await supabase.from('company_settings').delete().eq('tenant_id', tenantId);
    
    console.log('Demo tenant data cleared successfully');
  } catch (error) {
    console.error('Error clearing demo tenant data:', error);
    throw error;
  }
};

// Reset demo tenant to fresh sample data
export const resetDemoTenant = async (): Promise<{ success: boolean; tenantId: string | null }> => {
  try {
    const demoTenant = await getDemoTenant();
    
    if (!demoTenant) {
      // If demo tenant doesn't exist, create it
      const tenantId = await createDemoTenant();
      return { success: true, tenantId };
    }
    
    const tenantId = demoTenant.id;
    
    // Clear all existing data
    await clearDemoTenantData(tenantId);
    
    // Now recreate the sample data (similar to createDemoTenant but without creating the tenant)
    
    // 1. Recreate company settings
    await supabase.from('company_settings').insert({
      tenant_id: tenantId,
      company_name: 'Techno Panaly',
      company_tagline: 'Receipt Management System Demo',
      phone: '+254 700 000 000',
      email: 'demo@technopanaly.com',
      address: 'Nairobi, Kenya',
      po_box: 'P.O. Box 00100',
      website: 'https://technopanalyrecieptsystem.lovable.app',
      receipt_footer_message: 'This is a demo environment. Thank you for exploring Techno Panaly!',
    });

    // 2. Create demo projects
    const projects = [
      {
        tenant_id: tenantId,
        name: 'Sunset Gardens',
        location: 'Kitengela, Kajiado',
        description: 'Premium residential plots with ready title deeds near the bypass.',
        total_plots: 50,
        capacity: 50,
        buying_price: 500000,
      },
      {
        tenant_id: tenantId,
        name: 'Green Valley Estate',
        location: 'Joska, Machakos',
        description: 'Affordable plots in a serene environment with excellent road access.',
        total_plots: 80,
        capacity: 80,
        buying_price: 350000,
      },
      {
        tenant_id: tenantId,
        name: 'Hilltop Heights',
        location: 'Ruiru, Kiambu',
        description: 'Exclusive gated community with panoramic views and modern amenities.',
        total_plots: 30,
        capacity: 30,
        buying_price: 1200000,
      },
    ];

    const { data: insertedProjects, error: projectsError } = await supabase
      .from('projects')
      .insert(projects)
      .select();

    if (projectsError) throw projectsError;

    // 3. Create demo plots for each project
    const plots: any[] = [];
    insertedProjects.forEach((project) => {
      const plotCount = project.name === 'Hilltop Heights' ? 30 : project.name === 'Sunset Gardens' ? 50 : 80;
      const prefix = project.name === 'Sunset Gardens' ? 'A' : project.name === 'Green Valley Estate' ? 'B' : 'C';
      
      for (let i = 1; i <= plotCount; i++) {
        plots.push({
          tenant_id: tenantId,
          project_id: project.id,
          plot_number: `${prefix}-${String(i).padStart(2, '0')}`,
          size: '50x100',
          price: project.buying_price,
          status: 'available',
        });
      }
    });

    const { data: insertedPlots, error: plotsError } = await supabase
      .from('plots')
      .insert(plots)
      .select();

    if (plotsError) throw plotsError;

    // 4. Create demo clients with fresh dates (relative to today)
    const today = new Date();
    const formatDate = (daysAgo: number) => {
      const date = new Date(today);
      date.setDate(date.getDate() - daysAgo);
      return date.toISOString().split('T')[0];
    };

    const clients = [
      {
        tenant_id: tenantId,
        name: 'John Kamau Mwangi',
        phone: '+254 712 345 678',
        project_name: 'Sunset Gardens',
        plot_number: 'A-01',
        unit_price: 500000,
        number_of_plots: 1,
        total_price: 500000,
        discount: 0,
        total_paid: 500000,
        balance: 0,
        status: 'completed',
        percent_paid: 100,
        sales_agent: 'Sarah Wanjiru',
        payment_type: 'cash',
        sale_date: formatDate(45),
        completion_date: formatDate(45),
        commission: 25000,
        commission_received: 25000,
        commission_balance: 0,
      },
      {
        tenant_id: tenantId,
        name: 'Mary Wanjiku Njoroge',
        phone: '+254 723 456 789',
        project_name: 'Green Valley Estate',
        plot_number: 'B-15',
        unit_price: 350000,
        number_of_plots: 1,
        total_price: 350000,
        discount: 10000,
        total_paid: 170000,
        balance: 170000,
        status: 'ongoing',
        percent_paid: 50,
        sales_agent: 'James Ochieng',
        payment_type: 'installments',
        payment_period: '12 months',
        installment_months: 12,
        sale_date: formatDate(35),
        next_payment_date: formatDate(-10),
        commission: 17500,
        commission_received: 8750,
        commission_balance: 8750,
      },
      {
        tenant_id: tenantId,
        name: 'Peter Ochieng Otieno',
        phone: '+254 734 567 890',
        project_name: 'Sunset Gardens',
        plot_number: 'A-05, A-06',
        unit_price: 500000,
        number_of_plots: 2,
        total_price: 1000000,
        discount: 50000,
        total_paid: 380000,
        balance: 570000,
        status: 'ongoing',
        percent_paid: 40,
        sales_agent: 'Sarah Wanjiru',
        payment_type: 'installments',
        payment_period: '18 months',
        installment_months: 18,
        sale_date: formatDate(60),
        next_payment_date: formatDate(-5),
        commission: 50000,
        commission_received: 20000,
        commission_balance: 30000,
      },
      {
        tenant_id: tenantId,
        name: 'Grace Njeri Kariuki',
        phone: '+254 745 678 901',
        project_name: 'Hilltop Heights',
        plot_number: 'C-08',
        unit_price: 1200000,
        number_of_plots: 1,
        total_price: 1200000,
        discount: 0,
        total_paid: 300000,
        balance: 900000,
        status: 'ongoing',
        percent_paid: 25,
        sales_agent: 'David Mwangi',
        payment_type: 'installments',
        payment_period: '24 months',
        installment_months: 24,
        sale_date: formatDate(20),
        next_payment_date: formatDate(-15),
        commission: 60000,
        commission_received: 15000,
        commission_balance: 45000,
      },
      {
        tenant_id: tenantId,
        name: 'David Mwangi Kimani',
        phone: '+254 756 789 012',
        project_name: 'Green Valley Estate',
        plot_number: 'B-22',
        unit_price: 350000,
        number_of_plots: 1,
        total_price: 350000,
        discount: 0,
        total_paid: 262500,
        balance: 87500,
        status: 'ongoing',
        percent_paid: 75,
        sales_agent: 'James Ochieng',
        payment_type: 'installments',
        payment_period: '6 months',
        installment_months: 6,
        sale_date: formatDate(90),
        next_payment_date: formatDate(-2),
        commission: 17500,
        commission_received: 13125,
        commission_balance: 4375,
      },
      {
        tenant_id: tenantId,
        name: 'Elizabeth Akinyi Oloo',
        phone: '+254 767 890 123',
        project_name: 'Sunset Gardens',
        plot_number: 'A-12',
        unit_price: 500000,
        number_of_plots: 1,
        total_price: 500000,
        discount: 20000,
        total_paid: 480000,
        balance: 0,
        status: 'completed',
        percent_paid: 100,
        sales_agent: 'Sarah Wanjiru',
        payment_type: 'installments',
        payment_period: '12 months',
        installment_months: 12,
        sale_date: formatDate(180),
        completion_date: formatDate(10),
        commission: 24000,
        commission_received: 24000,
        commission_balance: 0,
      },
      {
        tenant_id: tenantId,
        name: 'Joseph Kiprop Kosgei',
        phone: '+254 778 901 234',
        project_name: 'Hilltop Heights',
        plot_number: 'C-15, C-16',
        unit_price: 1200000,
        number_of_plots: 2,
        total_price: 2400000,
        discount: 100000,
        total_paid: 1150000,
        balance: 1150000,
        status: 'ongoing',
        percent_paid: 50,
        sales_agent: 'David Mwangi',
        payment_type: 'installments',
        payment_period: '24 months',
        installment_months: 24,
        sale_date: formatDate(120),
        next_payment_date: formatDate(-8),
        commission: 115000,
        commission_received: 57500,
        commission_balance: 57500,
      },
      {
        tenant_id: tenantId,
        name: 'Nancy Wairimu Maina',
        phone: '+254 789 012 345',
        project_name: 'Green Valley Estate',
        plot_number: 'B-30',
        unit_price: 350000,
        number_of_plots: 1,
        total_price: 350000,
        discount: 15000,
        total_paid: 83750,
        balance: 251250,
        status: 'ongoing',
        percent_paid: 25,
        sales_agent: 'James Ochieng',
        payment_type: 'installments',
        payment_period: '12 months',
        installment_months: 12,
        sale_date: formatDate(15),
        next_payment_date: formatDate(-20),
        commission: 16750,
        commission_received: 4188,
        commission_balance: 12562,
      },
    ];

    const { data: insertedClients, error: clientsError } = await supabase
      .from('clients')
      .insert(clients)
      .select();

    if (clientsError) throw clientsError;

    // Update plots to mark some as sold
    const plotUpdates = insertedClients.map(async (client) => {
      const plotNumbers = client.plot_number.split(', ');
      for (const plotNumber of plotNumbers) {
        const plot = insertedPlots.find(p => p.plot_number === plotNumber);
        if (plot) {
          await supabase
            .from('plots')
            .update({ status: 'sold', client_id: client.id, sold_at: client.sale_date })
            .eq('id', plot.id);
        }
      }
    });
    await Promise.all(plotUpdates);

    // 5. Create demo payments
    const payments: any[] = [];
    let receiptCounter = 1001;

    for (const client of insertedClients) {
      const clientPayments = generatePaymentsForClient(client, tenantId, receiptCounter);
      payments.push(...clientPayments);
      receiptCounter += clientPayments.length;
    }

    if (payments.length > 0) {
      const { error: paymentsError } = await supabase
        .from('payments')
        .insert(payments);

      if (paymentsError) throw paymentsError;
    }

    // 6. Create demo expenses with fresh dates
    const expenses = [
      {
        tenant_id: tenantId,
        category: 'Commission Payout',
        description: 'Sales commission - Sarah Wanjiru',
        amount: 25000,
        expense_date: formatDate(30),
        payment_method: 'M-Pesa',
        recipient: 'Sarah Wanjiru',
        is_commission_payout: true,
      },
      {
        tenant_id: tenantId,
        category: 'Marketing',
        description: 'Social media advertising campaign',
        amount: 15000,
        expense_date: formatDate(25),
        payment_method: 'Bank Transfer',
        recipient: 'Digital Marketing Agency',
      },
      {
        tenant_id: tenantId,
        category: 'Office Supplies',
        description: 'Printer paper, ink cartridges, stationery',
        amount: 5500,
        expense_date: formatDate(20),
        payment_method: 'Cash',
        recipient: 'Office Mart Ltd',
      },
      {
        tenant_id: tenantId,
        category: 'Transport',
        description: 'Site visit fuel and transport costs',
        amount: 8000,
        expense_date: formatDate(15),
        payment_method: 'M-Pesa',
        recipient: 'James Ochieng',
      },
      {
        tenant_id: tenantId,
        category: 'Legal Fees',
        description: 'Title deed processing fees',
        amount: 25000,
        expense_date: formatDate(10),
        payment_method: 'Bank Transfer',
        recipient: 'Wanjiku & Associates Advocates',
      },
    ];

    await supabase.from('expenses').insert(expenses);

    console.log('Demo tenant reset successfully with fresh data');
    return { success: true, tenantId };
    
  } catch (error) {
    console.error('Error resetting demo tenant:', error);
    throw error;
  }
};
