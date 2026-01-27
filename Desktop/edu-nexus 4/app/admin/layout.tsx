import { DashboardLayout } from '@/components/layout/dashboard-layout';
import React from 'react';

export default function layout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
