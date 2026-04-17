import { useCallback, useRef, useState } from 'react';
import { PI_CONFIG } from '../constants/gameConstants';
import { getPiUser, hasTransaction, savePiUser, saveTransaction } from '../utils/storage';

async function serverApprove(paymentId) {
  await new Promise((resolve) => setTimeout(resolve, 250));
  return { success: true, paymentId };
}

async function serverComplete(paymentId, txid) {
  await new Promise((resolve) => setTimeout(resolve, 250));
  return { success: true, paymentId, txid };
}

export function usePiNetwork() {
  const pendingPaymentRef = useRef(null);
  const [user, setUser] = useState(getPiUser());
  const [status, setStatus] = useState(user ? 'connected' : 'idle');
  const [authError, setAuthError] = useState(null);

  const piAvailable = Boolean(window?.piSdkReady && typeof window?.Pi !== 'undefined');

  const authenticate = useCallback(async () => {
    if (!piAvailable) {
      setStatus('guest');
      return null;
    }

    try {
      setStatus('connecting');
      setAuthError(null);

      const authResult = await window.Pi.authenticate(
        ['payments'],
        async (incompletePayment) => {
          if (!incompletePayment?.identifier) return;
          try {
            await serverComplete(incompletePayment.identifier, incompletePayment.transaction?.txid || '');
          } catch (error) {
            console.error('[Pi] Failed to complete incomplete payment', error);
          }
        }
      );

      if (authResult?.user) {
        setUser(authResult.user);
        savePiUser(authResult.user);
        setStatus('connected');
      } else {
        setStatus('guest');
      }

      return authResult;
    } catch (error) {
      console.error('[Pi] Authentication error:', error);
      setAuthError(error?.message || 'Authentication failed');
      setStatus('error');
      return null;
    }
  }, [piAvailable]);

  const createPaymentRequest = useCallback((paymentData, onSuccess, onFailure) => {
    if (!piAvailable) {
      onFailure?.(new Error('Pi SDK not available'));
      return;
    }

    try {
      window.Pi.createPayment(paymentData, {
        onReadyForServerApproval: async (paymentId) => {
          pendingPaymentRef.current = paymentId;
          try {
            await serverApprove(paymentId);
          } catch (error) {
            onFailure?.(error);
          }
        },
        onReadyForServerCompletion: async (paymentId, txid) => {
          if (txid && hasTransaction(txid)) {
            onFailure?.(new Error('Duplicate transaction'));
            return;
          }

          try {
            const result = await serverComplete(paymentId, txid);
            if (txid) saveTransaction(txid);
            pendingPaymentRef.current = null;
            onSuccess?.({ ...result, txid });
          } catch (error) {
            pendingPaymentRef.current = null;
            onFailure?.(error);
          }
        },
        onCancel: () => {
          pendingPaymentRef.current = null;
          onFailure?.(new Error('Payment cancelled'));
        },
        onError: (error) => {
          pendingPaymentRef.current = null;
          onFailure?.(error instanceof Error ? error : new Error('Payment failed'));
        },
      });
    } catch (error) {
      pendingPaymentRef.current = null;
      onFailure?.(error instanceof Error ? error : new Error('Payment failed'));
    }
  }, [piAvailable]);

  const createRechargePayment = useCallback((powerupId, onSuccess, onFailure) => {
    createPaymentRequest(
      {
        amount: PI_CONFIG.rechargeCost,
        memo: `${PI_CONFIG.paymentMemo} (${powerupId})`,
        metadata: {
          type: 'recharge',
          powerupId,
          timestamp: Date.now(),
          game: 'bally-pi',
        },
      },
      onSuccess,
      onFailure
    );
  }, [createPaymentRequest]);

  const createContinuePayment = useCallback((onSuccess, onFailure) => {
    createPaymentRequest(
      {
        amount: PI_CONFIG.continueCost,
        memo: PI_CONFIG.continueMemo,
        metadata: {
          type: 'continue',
          timestamp: Date.now(),
          game: 'bally-pi',
        },
      },
      onSuccess,
      onFailure
    );
  }, [createPaymentRequest]);

  return {
    authenticate,
    createPaymentRequest,
    createRechargePayment,
    createContinuePayment,
    pendingPaymentRef,
    user,
    status,
    authError,
    piAvailable,
  };
}
