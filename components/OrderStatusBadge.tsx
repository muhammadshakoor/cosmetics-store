import React from 'react';
import { Package, CheckCircle, Truck, MapPin, XCircle, Clock } from 'lucide-react';
import type { OrderStatus } from '@/types/api';

interface StatusBadgeConfig {
  label: string;
  color: string;
  bg: string;
  icon: React.ReactNode;
}

const STATUS_MAP: Record<OrderStatus, StatusBadgeConfig> = {
  placed: {
    label: 'Order Placed',
    color: 'text-blue-700 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-900/30',
    icon: <Package size={12} className="shrink-0" />,
  },
  confirmed: {
    label: 'Confirmed',
    color: 'text-purple-700 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-900/30',
    icon: <CheckCircle size={12} className="shrink-0" />,
  },
  picked_up: {
    label: 'Picked Up',
    color: 'text-amber-700 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-900/30',
    icon: <Truck size={12} className="shrink-0" />,
  },
  on_the_way: {
    label: 'Out for Delivery',
    color: 'text-orange-700 dark:text-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-900/30',
    icon: <MapPin size={12} className="shrink-0" />,
  },
  delivered: {
    label: 'Delivered',
    color: 'text-green-700 dark:text-green-400',
    bg: 'bg-green-50 dark:bg-green-900/30',
    icon: <CheckCircle size={12} className="shrink-0" />,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'text-red-700 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-900/30',
    icon: <XCircle size={12} className="shrink-0" />,
  },
};

interface OrderStatusBadgeProps {
  status: OrderStatus | string;
  className?: string;
  showIcon?: boolean;
}

export default function OrderStatusBadge({
  status,
  className = '',
  showIcon = true,
}: OrderStatusBadgeProps) {
  const normalized = (status?.toLowerCase() || 'placed') as OrderStatus;
  const config = STATUS_MAP[normalized] || {
    label: status || 'Pending',
    color: 'text-gray-700 dark:text-gray-300',
    bg: 'bg-gray-100 dark:bg-gray-800',
    icon: <Clock size={12} className="shrink-0" />,
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.color} ${className}`}
    >
      {showIcon && config.icon}
      <span>{config.label}</span>
    </span>
  );
}

