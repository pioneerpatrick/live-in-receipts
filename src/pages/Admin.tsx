import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserProfile, UserRole } from '@/types/client';
import { bulkImportClients } from '@/lib/supabaseStorage';
import { Shield, Users, Upload, UserCog, Search, Crown, UserMinus } from 'lucide-react';
import { EXCEL_CLIENT_DATA } from '@/data/excelData';

interface UserWithRole extends UserProfile {
  role?: 'admin' | 'staff';
}

const Admin = () => {
  const { role } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [newRole, setNewRole] = useState<'admin' | 'staff'>('staff');
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (role === 'admin') {
      fetchUsers();
    }
  }, [role]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');
      
      if (profilesError) throw profilesError;
      
      // Fetch roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');
      
      if (rolesError) throw rolesError;
      
      // Combine profiles with roles
      const usersWithRoles: UserWithRole[] = (profiles || []).map(profile => {
        const userRole = roles?.find(r => r.user_id === profile.user_id);
        return {
          ...profile,
          role: userRole?.role as 'admin' | 'staff' | undefined,
        };
      });
      
      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async () => {
    if (!selectedUser) return;
    
    try {
      // Check if role exists
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', selectedUser.user_id)
        .maybeSingle();
      
      if (existingRole) {
        // Update existing role
        const { error } = await supabase
          .from('user_roles')
          .update({ role: newRole })
          .eq('user_id', selectedUser.user_id);
        
        if (error) throw error;
      } else {
        // Insert new role
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: selectedUser.user_id, role: newRole });
        
        if (error) throw error;
      }
      
      toast.success(`User role updated to ${newRole}`);
      setRoleDialogOpen(false);
      fetchUsers();
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update user role');
    }
  };

  const handleImportData = async () => {
    try {
      setImporting(true);
      
      // Import the Excel data
      await bulkImportClients(EXCEL_CLIENT_DATA);
      
      toast.success(`Successfully imported ${EXCEL_CLIENT_DATA.length} clients!`);
    } catch (error) {
      console.error('Error importing data:', error);
      toast.error('Failed to import data');
    } finally {
      setImporting(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Access Denied</CardTitle>
            <CardDescription>You don't have permission to access this page.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground">Admin Panel</h1>
            <p className="text-muted-foreground">Manage staff accounts and system data</p>
          </div>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="users" className="gap-2">
              <Users className="w-4 h-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="import" className="gap-2">
              <Upload className="w-4 h-4" />
              Import Data
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCog className="w-5 h-5" />
                  User Management
                </CardTitle>
                <CardDescription>
                  View and manage staff accounts. Promote users to admin or demote to staff.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-6">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading users...</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            No users found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredUsers.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">{user.full_name}</TableCell>
                            <TableCell>
                              <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                                {user.role === 'admin' && <Crown className="w-3 h-3 mr-1" />}
                                {user.role || 'No role'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {new Date(user.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setNewRole(user.role || 'staff');
                                  setRoleDialogOpen(true);
                                }}
                              >
                                {user.role === 'admin' ? (
                                  <>
                                    <UserMinus className="w-4 h-4 mr-1" />
                                    Change Role
                                  </>
                                ) : (
                                  <>
                                    <Crown className="w-4 h-4 mr-1" />
                                    Promote
                                  </>
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="import" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Import Client Data
                </CardTitle>
                <CardDescription>
                  Import the client data from the Excel spreadsheet into the database.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/50 rounded-lg p-6 text-center">
                  <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">Ready to Import</h3>
                  <p className="text-muted-foreground mb-4">
                    Click the button below to import {EXCEL_CLIENT_DATA.length} client records from the Excel data.
                  </p>
                  <Button onClick={handleImportData} disabled={importing} className="gap-2">
                    <Upload className="w-4 h-4" />
                    {importing ? 'Importing...' : 'Import Excel Data'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Footer />

      {/* Role Change Dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Update the role for {selectedUser?.full_name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Select value={newRole} onValueChange={(value: 'admin' | 'staff') => setNewRole(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRoleChange}>
              Update Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
