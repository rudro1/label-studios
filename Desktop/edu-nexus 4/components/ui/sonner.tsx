'use client';

import { useTheme } from 'next-themes';
import { Toaster as Sonner, ToasterProps } from 'sonner';
import {
  CheckCircle,
  XCircle,
  Info,
  AlertTriangle,
  Loader,
} from 'lucide-react';

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className='group toaster'
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
        } as React.CSSProperties
      }
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            'group relative flex items-start space-x-3 w-full max-w-md p-4 rounded-lg shadow-lg border border-gray-700 bg-gray-800 text-gray-100',
          title: 'font-semibold text-base',
          description: 'text-sm opacity-90',
          actionButton:
            'ml-auto bg-indigo-600 hover:bg-indigo-700 text-white rounded px-2 py-1',
          closeButton: 'absolute top-2 right-2 text-gray-400 hover:text-white',
          success: 'border-l-4 border-green-400',
          error: 'border-l-4 border-red-400',
          warning: 'border-l-4 border-amber-400',
          info: 'border-l-4 border-blue-400',
          icon: 'flex-shrink-0',
        },
      }}
      icons={{
        success: <CheckCircle className='w-5 h-5 text-green-400' />,
        error: <XCircle className='w-5 h-5 text-red-400' />,
        warning: <AlertTriangle className='w-5 h-5 text-amber-400' />,
        info: <Info className='w-5 h-5 text-blue-400' />,
        loading: <Loader className='w-5 h-5 text-gray-400 animate-spin' />,
      }}
      {...props}
    />
  );
};

export { Toaster };
