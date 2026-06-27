import React from 'react';
import { NotificationList } from '../components/NotificationList';

export const NotificationsPage: React.FC = () => {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 text-text-primary">
      <div>
        <h2 className="text-xl font-bold font-display text-text-primary">System Notifications</h2>
        <p className="text-xs text-text-secondary mt-1 font-sans uppercase tracking-wider font-bold">Alert dispatch logs and user responses</p>
      </div>

      <div className="bg-panel rounded-xl shadow-sm p-1">
        <NotificationList />
      </div>
    </div>
  );
};
