import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Client } from '@/types/client';
import { AlertTriangle } from 'lucide-react';

interface DeleteConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  client: Client | null;
}

const DeleteConfirmDialog = ({ open, onClose, onConfirm, client }: DeleteConfirmDialogProps) => {
  if (!client) return null;

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete Client Record
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Are you sure you want to delete the record for <strong className="text-foreground">{client.name}</strong>?
            </p>
            <div className="bg-destructive/10 p-3 rounded-lg text-sm space-y-1">
              <p className="font-medium text-destructive">This will permanently remove:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                <li>All payment history records</li>
                <li>All cancelled sale records linked to this client</li>
                <li>Commission tracking for this sale</li>
                <li>Return associated plots to available stock</li>
              </ul>
            </div>
            <p className="text-xs text-muted-foreground">
              Note: Expense records will be preserved but unlinked from this client for accounting purposes.
            </p>
            <p className="font-medium text-destructive">This action cannot be undone.</p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Delete Permanently
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteConfirmDialog;