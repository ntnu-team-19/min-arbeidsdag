import { Routes } from '@angular/router';
import { DashboardPage } from './features/dashboard/pages/dashboard-page/dashboard-page';
import { AssignmentDetailsPage } from './features/assignment-details/pages/assignment-details/assignment-details';

export const routes: Routes = [
  {
    path: '',
    component: DashboardPage,
  },
  {
    path: 'assignments/:id',
    component: AssignmentDetailsPage,
  },
];
