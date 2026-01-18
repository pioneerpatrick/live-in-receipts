import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Tenant } from '@/types/client';
import { 
  Users, Plus, Edit, Trash2, RefreshCw, Shield, UserPlus, Mail, Key, KeyRound
} from 'lucide-react';

interface TenantUser {
  id: string;
  user_id: string;
  tenant_id: string;
  is_tenant_admin: boolean;
  created_at: string;
  email?: string;
  full_name?: string;
  role?: string;
}

interface TenantUserManagementProps {
  tenant: Tenant;
  onClose: () => void;
}

const TenantUserManagement = ({ tenant, onClose }: TenantUserManagementProps) => {
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<TenantUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const [newUserForm, setNewUserForm] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'staff' as 'admin' | 'staff',
    isTenantAdmin: false,
  });

  useEffect(() => {
    fetchUsers();
  }, [tenant.id]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Get tenant users with their profiles and roles
      const { data: tenantUsers, error } = await supabase
        .from('tenant_users')
        .select('*')
        .eq('tenant_id', tenant.id);

      if (error) throw error;

      // Get user details for each tenant user
      const usersWithDetails = await Promise.all(
        (tenantUsers || []).map(async (tu) => {
          const [{ data: profile }, { data: roleData }] = await Promise.all([
            supabase.from('profiles').select('full_name').eq('user_id', tu.user_id).maybeSingle(),
            supabase.from('user_roles').select('role').eq('user_id', tu.user_id).maybeSingle(),
          ]);

          return {
            ...tu,
            full_name: profile?.full_name || 'Unknown',
            role: roleData?.role || 'staff',
          } as TenantUser;
        })
      );

      setUsers(usersWithDetails);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUserForm.email || !newUserForm.password || !newUserForm.fullName) {
      toast.error('All fields are required');
      return;
    }

    setSaving(true);
    try {
      // Create user via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUserForm.email,
        password: newUserForm.password,
        options: {
          data: {
            full_name: newUserForm.fullName,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create user');

      const userId = authData.user.id;

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: userId,
          full_name: newUserForm.fullName,
          tenant_id: tenant.id,
        });

      if (profileError) {
        console.error('Profile error:', profileError);
      }

      // Create user role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: newUserForm.role,
          tenant_id: tenant.id,
        });

      if (roleError) {
        console.error('Role error:', roleError);
      }

      // Create tenant user association
      const { error: tuError } = await supabase
        .from('tenant_users')
        .insert({
          user_id: userId,
          tenant_id: tenant.id,
          is_tenant_admin: newUserForm.isTenantAdmin,
        });

      if (tuError) throw tuError;

      toast.success(`User ${newUserForm.email} created successfully`);
      setAddDialogOpen(false);
      setNewUserForm({
        email: '',
        password: '',
        fullName: '',
        role: 'staff',
        isTenantAdmin: false,
      });
      fetchUsers();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error(error.message || 'Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    setSaving(true);
    try {
      // Call edge function to delete user
      const { error } = await supabase.functions.invoke('delete-user', {
        body: { userId: selectedUser.user_id },
      });

      if (error) throw error;

      toast.success('User deleted successfully');
      setDeleteDialogOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error.message || 'Failed to delete user');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleRole = async (user: TenantUser) => {
    try {
      const newRole = user.role === 'admin' ? 'staff' : 'admin';
      
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', user.user_id);

      if (error) throw error;

      toast.success(`User role updated to ${newRole}`);
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast.error('Failed to update user role');
    }
  };

  const handleToggleTenantAdmin = async (user: TenantUser) => {
    try {
      const { error } = await supabase
        .from('tenant_users')
        .update({ is_tenant_admin: !user.is_tenant_admin })
        .eq('id', user.id);

      if (error) throw error;

      toast.success(`Tenant admin status updated`);
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating tenant admin:', error);
      toast.error('Failed to update tenant admin status');
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser || !newPassword) {
      toast.error('Please enter a new password');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.functions.invoke('reset-user-password', {
        body: { userId: selectedUser.user_id, newPassword },
      });

      if (error) throw error;

      toast.success(`Password reset successfully for ${selectedUser.full_name}`);
      setResetPasswordDialogOpen(false);
      setSelectedUser(null);
      setNewPassword('');
    } catch (error: any) {
      console.error('Error resetting password:', error);
      toast.error(error.message || 'Failed to reset password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Users for {tenant.name}
              </CardTitle>
              <CardDescription>
                Manage users and their roles for this client organization
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={fetchUsers} variant="outline" size="sm" disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button onClick={() => setAddDialogOpen(true)} size="sm">
                <UserPlus className="w-4 h-4 mr-2" />
                Add User
              </Button>
              <Button onClick={onClose} variant="outline" size="sm">
                Close
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Tenant Admin</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{user.full_name}</p>
                        <p className="text-xs text-muted-foreground">{user.email || 'Email not available'}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={user.role === 'admin' ? 'default' : 'secondary'}
                        className="cursor-pointer"
                        onClick={() => handleToggleRole(user)}
                      >
                        {user.role === 'admin' ? 'Admin' : 'Staff'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={user.is_tenant_admin ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => handleToggleTenantAdmin(user)}
                      >
                        {user.is_tenant_admin ? 'Yes' : 'No'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedUser(user);
                            setNewPassword('');
                            setResetPasswordDialogOpen(true);
                          }}
                          title="Reset password"
                        >
                          <KeyRound className="w-4 h-4 text-amber-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedUser(user);
                            setDeleteDialogOpen(true);
                          }}
                          title="Delete user"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No users found for this client. Click "Add User" to create one.
                    </TableCell>
                  </TableRow>
                )}
                {loading && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add User Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Add User to {tenant.name}
            </DialogTitle>
            <DialogDescription>
              Create a new user account for this client organization.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                value={newUserForm.fullName}
                onChange={(e) => setNewUserForm({ ...newUserForm, fullName: e.target.value })}
                placeholder="John Doe"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">Email *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                  placeholder="user@example.com"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">Password *</Label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={newUserForm.password}
                  onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                  placeholder="••••••••"
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground">Minimum 6 characters</p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                value={newUserForm.role}
                onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value as 'admin' | 'staff' })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isTenantAdmin"
                checked={newUserForm.isTenantAdmin}
                onChange={(e) => setNewUserForm({ ...newUserForm, isTenantAdmin: e.target.checked })}
                className="rounded border-gray-300"
              />
              <Label htmlFor="isTenantAdmin" className="text-sm font-normal">
                Make this user a Tenant Administrator
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateUser} disabled={saving}>
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create User'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{selectedUser?.full_name}</strong> and remove their access to the system.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteUser} 
              className="bg-destructive text-destructive-foreground"
              disabled={saving}
            >
              {saving ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5" />
              Reset Password
            </DialogTitle>
            <DialogDescription>
              Set a new password for <strong>{selectedUser?.full_name}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground">Minimum 6 characters</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setResetPasswordDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleResetPassword} disabled={saving}>
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Resetting...
                </>
              ) : (
                'Reset Password'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TenantUserManagement;
