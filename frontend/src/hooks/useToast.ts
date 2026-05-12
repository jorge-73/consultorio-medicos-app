import { useToastContext } from '../context/ToastContext';

export const useToast = () => {
  const { showToast } = useToastContext();

  const toast = {
    success: (message: string) => showToast('success', message),
    error: (message: string) => showToast('error', message),
    warning: (message: string) => showToast('warning', message),
    info: (message: string) => showToast('info', message),
  };

  return toast;
};