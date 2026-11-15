import { coordinatorDashboardModel } from '../services/coordinatorDashboard.js';
import { CoordinatorDashboard } from './CoordinatorDashboard.jsx';
import { HostDashboard } from './HostDashboard.jsx';
import { StudentDashboard } from './StudentDashboard.jsx';
import { AdminDashboard } from './AdminDashboard.jsx';

export function RoleDashboard(props) {
  if (props.user?.role === 'student') return <StudentDashboard {...props} />;
  if (props.user?.role === 'coordinator') return <CoordinatorDashboard {...props} />;
  if (props.user?.role === 'supervisor') return <HostDashboard {...props} />;
  return <AdminDashboard {...props} />;
}