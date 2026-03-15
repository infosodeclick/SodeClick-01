import React from 'react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog'
import { Button } from './ui/button'

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  paymentState: any
  isProcessing: boolean
  onProcessPayment: () => void
  onCancel: () => void
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  paymentState,
  isProcessing,
  onProcessPayment,
  onCancel
}) => {
  if (!paymentState) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogTitle className="text-xl font-bold text-center">
          Payment Confirmation
        </DialogTitle>
        
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold">{paymentState.planName}</h3>
            <p className="text-gray-600">{paymentState.description}</p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-semibold">Amount:</span>
              <span className="text-lg font-bold text-pink-600">
                {paymentState.amount} {paymentState.currency}
              </span>
            </div>
            
            {paymentState.targetUserName && (
              <div className="flex justify-between items-center mt-2">
                <span className="text-sm text-gray-600">Recipient:</span>
                <span className="text-sm font-medium">{paymentState.targetUserName}</span>
              </div>
            )}
            
            {paymentState.currentCoins !== undefined && (
              <div className="flex justify-between items-center mt-2">
                <span className="text-sm text-gray-600">Current Coins:</span>
                <span className="text-sm font-medium">{paymentState.currentCoins}</span>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={onCancel}
              variant="outline"
              className="flex-1"
              disabled={isProcessing}
            >
              Cancel
            </Button>
            
            <Button
              onClick={onProcessPayment}
              className="flex-1 bg-pink-500 hover:bg-pink-600"
              disabled={isProcessing}
            >
              {isProcessing ? 'Processing...' : 'Confirm Payment'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
