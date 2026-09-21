'use client';

import React from 'react';
import Sidebar from './Sidebar';

interface AdminSidebarProps {
  schoolName?: string | null;
  schoolCode?: string | null;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function AdminSidebar({
  schoolName,
  schoolCode,
}: AdminSidebarProps) {
  return (
    <Sidebar
      schoolName={schoolName}
      schoolCode={schoolCode}
    />
  );
}

