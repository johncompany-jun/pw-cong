import { createRouter, createWebHistory } from 'vue-router'
import DashboardHome from '../components/DashboardHome.vue'
import ApplyPage from '../pages/Apply.vue'
import MyRotationPage from '../pages/MyRotationPage.vue'
import RotationView from '../pages/RotationView.vue'
import SchedulesPage from '../pages/Schedules.vue'
import ApplicantManagementPage from '../pages/ApplicantManagement.vue'
import RotationPage from '../pages/RotationPage.vue'
import RotationEditor from '../pages/RotationEditor.vue'
import SpotsPage from '../pages/Spots.vue'
import UsersPage from '../pages/Users.vue'
import LayoutsPage from '../pages/Layouts.vue'
import LayoutDetailPage from '../pages/LayoutDetail.vue'
import LayoutsAdminPage from '../pages/LayoutsAdmin.vue'
import AnnouncementsAdminPage from '../pages/AnnouncementsAdmin.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/',                        component: DashboardHome },
    { path: '/apply',                   component: ApplyPage },
    { path: '/my-rotation',             component: MyRotationPage },
    { path: '/my-rotation/:id',         component: RotationView },
    { path: '/schedules',               component: SchedulesPage },
    { path: '/schedules/:id/applicants', component: ApplicantManagementPage },
    { path: '/rotation',                component: RotationPage },
    { path: '/rotation/:id',            component: RotationEditor },
    { path: '/layouts',                 component: LayoutsPage },
    { path: '/layouts/:id',             component: LayoutDetailPage },
    { path: '/layouts-admin',           component: LayoutsAdminPage },
    { path: '/announcements-admin',     component: AnnouncementsAdminPage },
    { path: '/spots',                   component: SpotsPage },
    { path: '/users',                   component: UsersPage },
  ],
})
