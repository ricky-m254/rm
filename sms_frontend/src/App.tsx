import React, { Suspense, lazy, Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

class ChunkErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() { return { hasError: true } }
  componentDidCatch(_err: Error, _info: ErrorInfo) {}
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <div className="text-center space-y-4 p-8">
            <p className="text-slate-400 text-sm">This page failed to load. This can happen after an update.</p>
            <button onClick={() => { this.setState({ hasError: false }); window.location.reload() }}
              className="rounded-xl bg-emerald-500 px-6 py-2 text-sm font-semibold text-slate-950">
              Reload Page
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
import { useAuthStore } from './store/auth'
import { isAdminFamilyRole } from './lib/roleCatalog'
import { isModuleRouteEnabled } from './config/moduleFocus'

const PORTAL_ROUTE_BY_ROLE: Record<string, string> = {
  PARENT: '/modules/parent-portal/dashboard',
  STUDENT: '/student-portal',
}

function getTenantHomePath(role: string | null | undefined) {
  return PORTAL_ROUTE_BY_ROLE[(role ?? '').toUpperCase()] ?? '/dashboard'
}

/**
 * ModuleGuard — route-level RBAC protection.
 * Redirects to /dashboard if the authenticated user does not have the
 * specified module key in their assigned modules.
 * Admins and Super Admins always pass through.
 * If assignedModules is empty (race on hard-reload before re-login), passes
 * through to avoid false-positives — the sidebar is already filtered.
 */
function ModuleGuard({ moduleKey, children }: { moduleKey: string; children: React.ReactNode }) {
  const assignedModules = useAuthStore(s => s.assignedModules)
  const role            = useAuthStore(s => s.role)
  const upperRole       = (role ?? '').toUpperCase()
  const isAdmin         = isAdminFamilyRole(upperRole)
  const upper           = moduleKey.toUpperCase()
  const portalAllowedModules: Record<string, Set<string>> = {
    PARENT: new Set(['PARENTS', 'PARENT_PORTAL']),
    STUDENT: new Set(['STUDENT_PORTAL', 'STUDENTS_PORTAL']),
  }

  if (isAdmin) return <>{children}</>
  if (portalAllowedModules[upperRole]?.has(upper)) return <>{children}</>
  if (assignedModules.length === 0) return <>{children}</> // still loading — pass through
  const hasAccess = assignedModules.some(k => k.toUpperCase() === upper)
  if (hasAccess) return <>{children}</>
  return <Navigate to="/dashboard" replace />
}
import Footer from './components/Footer'
const AppShell = lazy(() => import('./components/AppShell'))

const LoginPage = lazy(() => import('./pages/LoginPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const StudentsDashboardPage = lazy(() => import('./pages/StudentsDashboardPage'))
const StudentsLayout = lazy(() => import('./pages/students/StudentsLayout'))
const StudentsDirectoryPage = lazy(() => import('./pages/students/StudentsDirectoryPage'))
const StudentsAdmissionsPage = lazy(() => import('./pages/students/StudentsAdmissionsPage'))
const StudentsAttendancePage = lazy(() => import('./pages/students/StudentsAttendancePage'))
const StudentsBehaviorPage = lazy(() => import('./pages/students/StudentsBehaviorPage'))
const StudentsMedicalPage = lazy(() => import('./pages/students/StudentsMedicalPage'))
const StudentsDocumentsPage = lazy(() => import('./pages/students/StudentsDocumentsPage'))
const StudentsReportsPage = lazy(() => import('./pages/students/StudentsReportsPage'))
const StudentsTransfersPage = lazy(() => import('./pages/students/StudentsTransfersPage'))
const StudentProfilePage = lazy(() => import('./pages/students/StudentProfilePage'))
const FinanceLayout = lazy(() => import('./pages/finance/FinanceLayout'))
const FinanceSummaryPage = lazy(() => import('./pages/finance/FinanceSummaryPage'))
const FinanceDispensaryPage = lazy(() => import('./pages/finance/FinanceDispensaryPage'))
const FinanceInvoicesPage = lazy(() => import('./pages/finance/FinanceInvoicesPage'))
const FinanceInvoiceFormPage = lazy(() => import('./pages/finance/FinanceInvoiceFormPage'))
const FinancePaymentsPage = lazy(() => import('./pages/finance/FinancePaymentsPage'))
const FinancePaymentFormPage = lazy(() => import('./pages/finance/FinancePaymentFormPage'))
const FinanceExpensesPage = lazy(() => import('./pages/finance/FinanceExpensesPage'))
const FinanceExpenseFormPage = lazy(() => import('./pages/finance/FinanceExpenseFormPage'))
const FinanceFeeStructuresPage = lazy(() => import('./pages/finance/FinanceFeeStructuresPage'))
const FinanceFeeStructureFormPage = lazy(() => import('./pages/finance/FinanceFeeStructureFormPage'))
const FinanceFeeAssignmentsPage = lazy(() => import('./pages/finance/FinanceFeeAssignmentsPage'))
const FinanceFeeAssignmentFormPage = lazy(() => import('./pages/finance/FinanceFeeAssignmentFormPage'))
const FinanceAdjustmentsPage = lazy(() => import('./pages/finance/FinanceAdjustmentsPage'))
const FinanceAdjustmentFormPage = lazy(() => import('./pages/finance/FinanceAdjustmentFormPage'))
const FinanceReportsPage = lazy(() => import('./pages/finance/FinanceReportsPage'))
const FinanceAuditReportsPage = lazy(() => import('./pages/finance/FinanceAuditReportsPage'))
const ReportingLayout = lazy(() => import('./pages/reporting/ReportingLayout'))
const ReportingAuditLogsPage = lazy(() => import('./pages/reporting/ReportingAuditLogsPage'))
const FinanceAccountsPage = lazy(() => import('./pages/finance/FinanceAccountsPage'))
const FinanceReconciliationPage = lazy(() => import('./pages/finance/FinanceReconciliationPage'))
const FinanceScholarshipsPage = lazy(() => import('./pages/finance/FinanceScholarshipsPage'))
const FinanceRefundsPage = lazy(() => import('./pages/finance/FinanceRefundsPage'))
const FinanceVoteHeadsPage = lazy(() => import('./pages/finance/FinanceVoteHeadsPage'))
const FinanceCashbookPage = lazy(() => import('./pages/finance/FinanceCashbookPage'))
const FinanceArrearsPage = lazy(() => import('./pages/finance/FinanceArrearsPage'))
const FinanceStoreRequestsPage = lazy(() => import('./pages/finance/FinanceStoreRequestsPage'))
const FinanceStudentLedgerPage = lazy(() => import('./pages/finance/FinanceStudentLedgerPage'))
const FinanceGeneralLedgerPage = lazy(() => import('./pages/finance/FinanceGeneralLedgerPage'))
const FinanceExpenseLedgerPage = lazy(() => import('./pages/finance/FinanceExpenseLedgerPage'))
const FinanceBudgetLedgerPage = lazy(() => import('./pages/finance/FinanceBudgetLedgerPage'))
const FinanceOptionalChargesPage = lazy(() => import('./pages/finance/FinanceOptionalChargesPage'))
const SettingsLayout = lazy(() => import('./pages/settings/SettingsLayout'))
const SettingsControlPlanePage = lazy(() => import('./pages/settings/SettingsControlPlanePage'))
const ModuleSettingsPage = lazy(() => import('./pages/settings/ModuleSettingsPage'))
const SettingsUsersPage = lazy(() => import('./pages/settings/SettingsUsersPage'))
const SettingsRolesPage = lazy(() => import('./pages/settings/SettingsRolesPage'))
const SettingsSchoolProfilePage = lazy(() => import('./pages/settings/SettingsSchoolProfilePage'))
const SettingsGlobalPage = lazy(() => import('./pages/settings/SettingsGlobalPage'))
const SettingsCommunicationPage = lazy(() => import('./pages/settings/SettingsCommunicationPage'))
const SettingsAcademicsConfigPage = lazy(() => import('./pages/settings/SettingsAcademicsConfigPage'))
const SettingsExaminationsConfigPage = lazy(() => import('./pages/settings/SettingsExaminationsConfigPage'))
const SettingsTimetableConfigPage = lazy(() => import('./pages/settings/SettingsTimetableConfigPage'))
const SettingsLibraryConfigPage = lazy(() => import('./pages/settings/SettingsLibraryConfigPage'))
const SettingsTransportConfigPage = lazy(() => import('./pages/settings/SettingsTransportConfigPage'))
const SettingsHostelConfigPage = lazy(() => import('./pages/settings/SettingsHostelConfigPage'))
const SettingsSecurityPage = lazy(() => import('./pages/settings/SettingsSecurityPage'))
const SettingsSeedPage = lazy(() => import('./pages/settings/SettingsSeedPage'))
const SettingsAdmissionPage = lazy(() => import('./pages/settings/SettingsAdmissionPage'))
const SettingsImportExportPage = lazy(() => import('./pages/settings/SettingsImportExportPage'))
const SettingsDomainPage = lazy(() => import('./pages/settings/SettingsDomainPage'))
const SettingsFinancePage = lazy(() => import('./pages/settings/SettingsFinancePage'))
const ParentsLayout = lazy(() => import('./pages/parents/ParentsLayout'))
const ParentsSummaryPage = lazy(() => import('./pages/parents/ParentsSummaryPage'))
const ParentsDirectoryPage = lazy(() => import('./pages/parents/ParentsDirectoryPage'))
const AcademicsLayout = lazy(() => import('./pages/academics/AcademicsLayout'))
const AcademicsDashboardPage = lazy(() => import('./pages/academics/AcademicsDashboardPage'))
const AcademicsStructurePage = lazy(() => import('./pages/academics/AcademicsStructurePage'))
const AcademicsSubjectsPage = lazy(() => import('./pages/academics/AcademicsSubjectsPage'))
const AcademicsClassManagementPage = lazy(() => import('./pages/academics/AcademicsClassManagementPage'))
const AcademicsGradebookPage = lazy(() => import('./pages/academics/AcademicsGradebookPage'))
const AcademicsReportCardsPage = lazy(() => import('./pages/academics/AcademicsReportCardsPage'))
const AcademicsAssignmentsPage = lazy(() => import('./pages/academics/AcademicsAssignmentsPage'))
const AcademicsCalendarPage = lazy(() => import('./pages/academics/AcademicsCalendarPage'))
const AcademicsAnalyticsPage = lazy(() => import('./pages/academics/AcademicsAnalyticsPage'))
const HrLayout = lazy(() => import('./pages/hr/HrLayout'))
const HrDashboardPage = lazy(() => import('./pages/hr/HrDashboardPage'))
const HrEmployeesPage = lazy(() => import('./pages/hr/HrEmployeesPage'))
const HrEmployeeProfilePage = lazy(() => import('./pages/hr/HrEmployeeProfilePage'))
const HrOrganizationPage = lazy(() => import('./pages/hr/HrOrganizationPage'))
const HrAttendancePage = lazy(() => import('./pages/hr/HrAttendancePage'))
const HrLeavePage = lazy(() => import('./pages/hr/HrLeavePage'))
const HrPayrollPage = lazy(() => import('./pages/hr/HrPayrollPage'))
const HrRecruitmentPage = lazy(() => import('./pages/hr/HrRecruitmentPage'))
const HrOnboardingPage = lazy(() => import('./pages/hr/HrOnboardingPage'))
const HrPerformancePage = lazy(() => import('./pages/hr/HrPerformancePage'))
const HrTrainingPage = lazy(() => import('./pages/hr/HrTrainingPage'))
const HrAnalyticsPage = lazy(() => import('./pages/hr/HrAnalyticsPage'))
const HrTransfersPage = lazy(() => import('./pages/hr/HrTransfersPage'))
const HrCareerEventsPage = lazy(() => import('./pages/hr/HrCareerEventsPage'))
const HrDisciplinePage = lazy(() => import('./pages/hr/HrDisciplinePage'))
const HrExitsPage = lazy(() => import('./pages/hr/HrExitsPage'))
const HrCompliancePage = lazy(() => import('./pages/hr/HrCompliancePage'))
const StaffLayout = lazy(() => import('./pages/staff/StaffLayout'))
const StaffDashboardPage = lazy(() => import('./pages/staff/StaffDashboardPage'))
const StaffDirectoryPage = lazy(() => import('./pages/staff/StaffDirectoryPage'))
const StaffProfilesPage = lazy(() => import('./pages/staff/StaffProfilesPage'))
const StaffDepartmentsRolesPage = lazy(() => import('./pages/staff/StaffDepartmentsRolesPage'))
const StaffAttendancePage = lazy(() => import('./pages/staff/StaffAttendancePage'))
const StaffPerformancePage = lazy(() => import('./pages/staff/StaffPerformancePage'))
const StaffDocumentsPage = lazy(() => import('./pages/staff/StaffDocumentsPage'))
const StaffAnalyticsPage = lazy(() => import('./pages/staff/StaffAnalyticsPage'))
const CommunicationLayout = lazy(() => import('./pages/communication/CommunicationLayout'))
const CommunicationDashboardPage = lazy(() => import('./pages/communication/CommunicationDashboardPage'))
const CommunicationMessagingPage = lazy(() => import('./pages/communication/CommunicationMessagingPage'))
const CommunicationNotificationsPage = lazy(() => import('./pages/communication/CommunicationNotificationsPage'))
const CommunicationEmailPage = lazy(() => import('./pages/communication/CommunicationEmailPage'))
const CommunicationSmsPage = lazy(() => import('./pages/communication/CommunicationSmsPage'))
const CommunicationTemplatesPage = lazy(() => import('./pages/communication/CommunicationTemplatesPage'))
const CommunicationAnnouncementsPage = lazy(() => import('./pages/communication/CommunicationAnnouncementsPage'))
const AlertsCenterPage = lazy(() => import('./pages/communication/AlertsCenterPage'))
const CommunicationAnalyticsPage = lazy(() => import('./pages/communication/CommunicationAnalyticsPage'))
const CommunicationParentPage = lazy(() => import('./pages/communication/CommunicationParentPage'))
const StudentPortalLayout = lazy(() => import('./pages/studentPortal/StudentPortalLayout'))
const StudentPortalDashboardPage = lazy(() => import('./pages/studentPortal/StudentPortalDashboardPage'))
const StudentPortalGradesPage = lazy(() => import('./pages/studentPortal/StudentPortalGradesPage'))
const StudentPortalTimetablePage = lazy(() => import('./pages/studentPortal/StudentPortalTimetablePage'))
const StudentPortalAssignmentsPage = lazy(() => import('./pages/studentPortal/StudentPortalAssignmentsPage'))
const StudentPortalELearningPage = lazy(() => import('./pages/studentPortal/StudentPortalELearningPage'))
const StudentPortalAttendancePage = lazy(() => import('./pages/studentPortal/StudentPortalAttendancePage'))
const StudentPortalLibraryPage = lazy(() => import('./pages/studentPortal/StudentPortalLibraryPage'))
const StudentPortalFeesPage = lazy(() => import('./pages/studentPortal/StudentPortalFeesPage'))
const TeacherPortalLayout = lazy(() => import('./pages/teacherPortal/TeacherPortalLayout'))
const TeacherPortalDashboardPage = lazy(() => import('./pages/teacherPortal/TeacherPortalDashboardPage'))
const TeacherPortalClassesPage = lazy(() => import('./pages/teacherPortal/TeacherPortalClassesPage'))
const TeacherPortalAttendancePage = lazy(() => import('./pages/teacherPortal/TeacherPortalAttendancePage'))
const TeacherPortalGradebookPage = lazy(() => import('./pages/teacherPortal/TeacherPortalGradebookPage'))
const TeacherPortalResourcesPage = lazy(() => import('./pages/teacherPortal/TeacherPortalResourcesPage'))
const TeacherPortalTimetablePage = lazy(() => import('./pages/teacherPortal/TeacherPortalTimetablePage'))
const ParentPortalLayout = lazy(() => import('./pages/parentPortal/ParentPortalLayout'))
const ParentPortalDashboardPage = lazy(() => import('./pages/parentPortal/ParentPortalDashboardPage'))
const ParentPortalAcademicsPage = lazy(() => import('./pages/parentPortal/ParentPortalAcademicsPage'))
const ParentPortalAttendancePage = lazy(() => import('./pages/parentPortal/ParentPortalAttendancePage'))
const ParentPortalFinancePage = lazy(() => import('./pages/parentPortal/ParentPortalFinancePage'))
const ParentPortalCommunicationPage = lazy(() => import('./pages/parentPortal/ParentPortalCommunicationPage'))
const ParentPortalSchedulePage = lazy(() => import('./pages/parentPortal/ParentPortalSchedulePage'))
const ParentPortalAssignmentsPage = lazy(() => import('./pages/parentPortal/ParentPortalAssignmentsPage'))
const ParentPortalLibraryProfilePage = lazy(() => import('./pages/parentPortal/ParentPortalLibraryProfilePage'))
const ParentPortalHealthPage = lazy(() => import('./pages/parentPortal/ParentPortalHealthPage'))
const ParentPortalTransportPage = lazy(() => import('./pages/parentPortal/ParentPortalTransportPage'))
const LibraryLayout = lazy(() => import('./pages/library/LibraryLayout'))
const LibraryDashboardPage = lazy(() => import('./pages/library/LibraryDashboardPage'))
const LibraryCatalogPage = lazy(() => import('./pages/library/LibraryCatalogPage'))
const LibraryCirculationPage = lazy(() => import('./pages/library/LibraryCirculationPage'))
const LibraryReservationsPage = lazy(() => import('./pages/library/LibraryReservationsPage'))
const LibraryMembersPage = lazy(() => import('./pages/library/LibraryMembersPage'))
const LibraryFinesPage = lazy(() => import('./pages/library/LibraryFinesPage'))
const LibraryInventoryPage = lazy(() => import('./pages/library/LibraryInventoryPage'))
const LibraryAcquisitionPage = lazy(() => import('./pages/library/LibraryAcquisitionPage'))
const LibraryReportsPage = lazy(() => import('./pages/library/LibraryReportsPage'))
const AdmissionsLayout = lazy(() => import('./pages/admissions/AdmissionsLayout'))
const AdmissionsDashboardPage = lazy(() => import('./pages/admissions/AdmissionsDashboardPage'))
const AdmissionsApplicationsPage = lazy(() => import('./pages/admissions/AdmissionsApplicationsPage'))
const AdmissionsInquiriesPage = lazy(() => import('./pages/admissions/AdmissionsInquiriesPage'))
const AdmissionsReviewsPage = lazy(() => import('./pages/admissions/AdmissionsReviewsPage'))
const AdmissionsAssessmentsPage = lazy(() => import('./pages/admissions/AdmissionsAssessmentsPage'))
const AdmissionsInterviewsPage = lazy(() => import('./pages/admissions/AdmissionsInterviewsPage'))
const AdmissionsDecisionsPage = lazy(() => import('./pages/admissions/AdmissionsDecisionsPage'))
const AdmissionsEnrollmentPage = lazy(() => import('./pages/admissions/AdmissionsEnrollmentPage'))
const AdmissionsAnalyticsPage = lazy(() => import('./pages/admissions/AdmissionsAnalyticsPage'))
const AssetsLayout = lazy(() => import('./pages/assets/AssetsLayout'))
const AssetsDashboardPage = lazy(() => import('./pages/assets/AssetsDashboardPage'))
const AssetsRegistryPage = lazy(() => import('./pages/assets/AssetsRegistryPage'))
const AssetsCategoriesPage = lazy(() => import('./pages/assets/AssetsCategoriesPage'))
const AssetsAssignmentsPage = lazy(() => import('./pages/assets/AssetsAssignmentsPage'))
const AssetsMaintenancePage = lazy(() => import('./pages/assets/AssetsMaintenancePage'))
const AssetsDepreciationPage = lazy(() => import('./pages/assets/AssetsDepreciationPage'))
const AssetsDisposalPage = lazy(() => import('./pages/assets/AssetsDisposalPage'))
const AssetsTransfersPage = lazy(() => import('./pages/assets/AssetsTransfersPage'))
const AssetsWarrantyPage = lazy(() => import('./pages/assets/AssetsWarrantyPage'))
const PlatformLoginPage = lazy(() => import('./pages/platform/PlatformLoginPage'))
const PlatformLayout = lazy(() => import('./pages/platform/PlatformLayout'))
const PlatformOverviewPage = lazy(() => import('./pages/platform/PlatformOverviewPage'))
const PlatformTenantsPage = lazy(() => import('./pages/platform/PlatformTenantsPage'))
const PlatformBillingPage = lazy(() => import('./pages/platform/PlatformBillingPage'))
const PlatformSupportPage = lazy(() => import('./pages/platform/PlatformSupportPage'))
const PlatformImpersonationPage = lazy(() => import('./pages/platform/PlatformImpersonationPage'))
const PlatformMonitoringPage = lazy(() => import('./pages/platform/PlatformMonitoringPage'))
const PlatformDeploymentPage = lazy(() => import('./pages/platform/PlatformDeploymentPage'))
const PlatformBackupRecoveryPage = lazy(() => import('./pages/platform/PlatformBackupRecoveryPage'))
const PlatformSecurityCompliancePage = lazy(() => import('./pages/platform/PlatformSecurityCompliancePage'))
const PlatformActionLogsPage = lazy(() => import('./pages/platform/PlatformActionLogsPage'))
const PlatformSettingsPage = lazy(() => import('./pages/platform/PlatformSettingsPage'))
const PlatformAdminUsersPage = lazy(() => import('./pages/platform/PlatformAdminUsersPage'))
const PlatformUsageMeteringPage = lazy(() => import('./pages/platform/PlatformUsageMeteringPage'))
const PlatformFeatureFlagsPage = lazy(() => import('./pages/platform/PlatformFeatureFlagsPage'))
const PlatformNotificationsPage = lazy(() => import('./pages/platform/PlatformNotificationsPage'))
const PlatformApiIntegrationsPage = lazy(() => import('./pages/platform/PlatformApiIntegrationsPage'))
const PlatformRevenueAnalyticsPage = lazy(() => import('./pages/platform/PlatformRevenueAnalyticsPage'))
const PlatformWorkflowMonitorPage = lazy(() => import('./pages/platform/PlatformWorkflowMonitorPage'))
const PlatformGlobalReportsPage = lazy(() => import('./pages/platform/PlatformGlobalReportsPage'))
const PlatformDomainRequestsPage = lazy(() => import('./pages/platform/PlatformDomainRequestsPage'))
const StoreLayout = lazy(() => import('./pages/store/StoreLayout'))
const StoreDashboardPage = lazy(() => import('./pages/store/StoreDashboardPage'))
const StoreItemsPage = lazy(() => import('./pages/store/StoreItemsPage'))
const StoreMovementsPage = lazy(() => import('./pages/store/StoreMovementsPage'))
const StoreOrdersPage = lazy(() => import('./pages/store/StoreOrdersPage'))
const StoreLowStockPage = lazy(() => import('./pages/store/StoreLowStockPage'))
const DispensaryLayout = lazy(() => import('./pages/dispensary/DispensaryLayout'))
const DispensaryDashboardPage = lazy(() => import('./pages/dispensary/DispensaryDashboardPage'))
const DispensaryVisitsPage = lazy(() => import('./pages/dispensary/DispensaryVisitsPage'))
const DispensaryStockPage = lazy(() => import('./pages/dispensary/DispensaryStockPage'))
const DispensaryDeliveryNotesPage = lazy(() => import('./pages/dispensary/DispensaryDeliveryNotesPage'))
const DispensaryOutsideTreatmentsPage = lazy(() => import('./pages/dispensary/DispensaryOutsideTreatmentsPage'))

const ClockInLayout = lazy(() => import('./pages/clockin/ClockInLayout'))
const ClockInDashboardPage = lazy(() => import('./pages/clockin/ClockInDashboardPage'))
const ClockInKioskPage = lazy(() => import('./pages/clockin/ClockInKioskPage'))
const ClockInRegistryPage = lazy(() => import('./pages/clockin/ClockInRegistryPage'))
const ClockInDevicesPage = lazy(() => import('./pages/clockin/ClockInDevicesPage'))
const ClockInShiftsPage = lazy(() => import('./pages/clockin/ClockInShiftsPage'))
const ClockInReportsPage = lazy(() => import('./pages/clockin/ClockInReportsPage'))
const ClockInAlertsPage = lazy(() => import('./pages/clockin/ClockInAlertsPage'))
const SmartPSSPage = lazy(() => import('./pages/clockin/SmartPSSPage'))

const TimetableLayout = lazy(() => import('./pages/timetable/TimetableLayout'))
const TimetableGridPage = lazy(() => import('./pages/timetable/TimetableGridPage'))
const TimetableMySchedulePage = lazy(() => import('./pages/timetable/TimetableMySchedulePage'))
const TimetableCoveragePage = lazy(() => import('./pages/timetable/TimetableCoveragePage'))
const TimetableChangeRequestsPage = lazy(() => import('./pages/timetable/TimetableChangeRequestsPage'))
const TimetableStaffDutyPage = lazy(() => import('./pages/timetable/TimetableStaffDutyPage'))

const TransfersLayout = lazy(() => import('./pages/transfers/TransfersLayout'))
const TransfersDashboardPage = lazy(() => import('./pages/transfers/TransfersDashboardPage'))
const TransfersInitiatePage = lazy(() => import('./pages/transfers/TransfersInitiatePage'))
const TransferDetailPage = lazy(() => import('./pages/transfers/TransferDetailPage'))

const TransportLayout = lazy(() => import('./pages/transport/TransportLayout'))
const TransportDashboardPage = lazy(() => import('./pages/transport/TransportDashboardPage'))
const TransportVehiclesPage = lazy(() => import('./pages/transport/TransportVehiclesPage'))
const TransportRoutesPage = lazy(() => import('./pages/transport/TransportRoutesPage'))
const TransportStopsPage = lazy(() => import('./pages/transport/TransportStopsPage'))
const TransportStudentsPage = lazy(() => import('./pages/transport/TransportStudentsPage'))
const TransportIncidentsPage = lazy(() => import('./pages/transport/TransportIncidentsPage'))

const VisitorMgmtLayout = lazy(() => import('./pages/visitor_mgmt/VisitorMgmtLayout'))
const VisitorDashboardPage = lazy(() => import('./pages/visitor_mgmt/VisitorDashboardPage'))
const VisitorMgmtVisitorsPage = lazy(() => import('./pages/visitor_mgmt/VisitorMgmtVisitorsPage'))
const VisitorMgmtAuthorizedPickupsPage = lazy(() => import('./pages/visitor_mgmt/VisitorMgmtAuthorizedPickupsPage'))
const VisitorMgmtPickupLogsPage = lazy(() => import('./pages/visitor_mgmt/VisitorMgmtPickupLogsPage'))

const ExaminationsLayout = lazy(() => import('./pages/examinations/ExaminationsLayout'))
const ExaminationsDashboardPage = lazy(() => import('./pages/examinations/ExaminationsDashboardPage'))
const ExaminationsSessionsPage = lazy(() => import('./pages/examinations/ExaminationsSessionsPage'))
const ExaminationsPapersPage = lazy(() => import('./pages/examinations/ExaminationsPapersPage'))
const ExaminationsSeatsPage = lazy(() => import('./pages/examinations/ExaminationsSeatsPage'))
const ExaminationsResultsPage = lazy(() => import('./pages/examinations/ExaminationsResultsPage'))
const ExaminationsGradesPage = lazy(() => import('./pages/examinations/ExaminationsGradesPage'))
const ExaminationsExamSettersPage = lazy(() => import('./pages/examinations/ExaminationsExamSettersPage'))
const ExaminationsPaperUploadsPage = lazy(() => import('./pages/examinations/ExaminationsPaperUploadsPage'))

const AlumniLayout = lazy(() => import('./pages/alumni/AlumniLayout'))
const AlumniDashboardPage = lazy(() => import('./pages/alumni/AlumniDashboardPage'))
const AlumniProfilesPage = lazy(() => import('./pages/alumni/AlumniProfilesPage'))
const AlumniEventsPage = lazy(() => import('./pages/alumni/AlumniEventsPage'))
const AlumniAttendeesPage = lazy(() => import('./pages/alumni/AlumniAttendeesPage'))
const AlumniMentorshipPage = lazy(() => import('./pages/alumni/AlumniMentorshipPage'))
const AlumniDonationsPage = lazy(() => import('./pages/alumni/AlumniDonationsPage'))

const HostelLayout = lazy(() => import('./pages/hostel/HostelLayout'))
const HostelDashboardPage = lazy(() => import('./pages/hostel/HostelDashboardPage'))
const DormitoriesPage = lazy(() => import('./pages/hostel/DormitoriesPage'))
const BedSpacesPage = lazy(() => import('./pages/hostel/BedSpacesPage'))
const HostelAllocationsPage = lazy(() => import('./pages/hostel/HostelAllocationsPage'))
const HostelAttendancePage = lazy(() => import('./pages/hostel/HostelAttendancePage'))
const HostelLeavePage = lazy(() => import('./pages/hostel/HostelLeavePage'))

const PTMLayout = lazy(() => import('./pages/ptm/PTMLayout'))
const PTMDashboardPage = lazy(() => import('./pages/ptm/PTMDashboardPage'))
const PTMSessionsPage = lazy(() => import('./pages/ptm/PTMSessionsPage'))
const PTMBookingsPage = lazy(() => import('./pages/ptm/PTMBookingsPage'))
const MyPTMSlotsPage = lazy(() => import('./pages/ptm/MyPTMSlotsPage'))

const SportsLayout = lazy(() => import('./pages/sports/SportsLayout'))
const SportsDashboardPage = lazy(() => import('./pages/sports/SportsDashboardPage'))
const SportsClubsPage = lazy(() => import('./pages/sports/SportsClubsPage'))
const SportsMembershipsPage = lazy(() => import('./pages/sports/SportsMembershipsPage'))
const SportsTournamentsPage = lazy(() => import('./pages/sports/SportsTournamentsPage'))
const SportsAwardsPage = lazy(() => import('./pages/sports/SportsAwardsPage'))

const CafeteriaLayout = lazy(() => import('./pages/cafeteria/CafeteriaLayout'))
const CafeteriaDashboardPage = lazy(() => import('./pages/cafeteria/CafeteriaDashboardPage'))
const CafeteriaPlansPage = lazy(() => import('./pages/cafeteria/CafeteriaPlansPage'))
const CafeteriaMenuPage = lazy(() => import('./pages/cafeteria/CafeteriaMenuPage'))
const CafeteriaEnrollmentsPage = lazy(() => import('./pages/cafeteria/CafeteriaEnrollmentsPage'))
const CafeteriaLogsPage = lazy(() => import('./pages/cafeteria/CafeteriaLogsPage'))
const CafeteriaDietaryPage = lazy(() => import('./pages/cafeteria/CafeteriaDietaryPage'))
const CafeteriaPaymentsPage = lazy(() => import('./pages/cafeteria/CafeteriaPaymentsPage'))
const CafeteriaAccountsPage = lazy(() => import('./pages/cafeteria/CafeteriaAccountsPage'))
const CafeteriaPreOrdersPage = lazy(() => import('./pages/cafeteria/CafeteriaPreOrdersPage'))
const CafeteriaKitchenPage = lazy(() => import('./pages/cafeteria/CafeteriaKitchenPage'))
const CafeteriaReportsPage = lazy(() => import('./pages/cafeteria/CafeteriaReportsPage'))
const StoreSuppliersPage = lazy(() => import('./pages/store/StoreSuppliersPage'))
const StoreCategoriesPage = lazy(() => import('./pages/store/StoreCategoriesPage'))
const StoreRequestsPage = lazy(() => import('./pages/store/StoreRequestsPage'))
const StoreAllocationPage = lazy(() => import('./pages/store/StoreAllocationPage'))
const StoreReportsPage = lazy(() => import('./pages/store/StoreReportsPage'))

const CurriculumLayout = lazy(() => import('./pages/academics/CurriculumLayout'))
const CurriculumDashboardPage = lazy(() => import('./pages/academics/CurriculumDashboardPage'))
const CurriculumSchemesPage = lazy(() => import('./pages/academics/CurriculumSchemesPage'))
const CurriculumLessonsPage = lazy(() => import('./pages/academics/CurriculumLessonsPage'))
const CurriculumResourcesPage = lazy(() => import('./pages/academics/CurriculumResourcesPage'))

const MaintenanceLayout = lazy(() => import('./pages/assets/MaintenanceLayout'))
const MaintenanceDashboardPage = lazy(() => import('./pages/assets/MaintenanceDashboardPage'))
const MaintenanceRequestsPage = lazy(() => import('./pages/assets/MaintenanceRequestsPage'))
const MaintenanceCategoriesPage = lazy(() => import('./pages/assets/MaintenanceCategoriesPage'))
const MaintenanceChecklistPage = lazy(() => import('./pages/assets/MaintenanceChecklistPage'))

const ELearningLayout = lazy(() => import('./pages/elearning/ELearningLayout'))
const ELearningDashboardPage = lazy(() => import('./pages/elearning/ELearningDashboardPage'))
const ELearningCoursesPage = lazy(() => import('./pages/elearning/ELearningCoursesPage'))
const ELearningMaterialsPage = lazy(() => import('./pages/elearning/ELearningMaterialsPage'))
const ELearningQuizzesPage = lazy(() => import('./pages/elearning/ELearningQuizzesPage'))
const ELearningVirtualSessionsPage = lazy(() => import('./pages/elearning/ELearningVirtualSessionsPage'))

const AnalyticsLayout = lazy(() => import('./pages/analytics/AnalyticsLayout'))
const AnalyticsDashboardPage = lazy(() => import('./pages/analytics/AnalyticsDashboardPage'))
const AnalyticsEnrollmentPage = lazy(() => import('./pages/analytics/AnalyticsEnrollmentPage'))
const AnalyticsAttendancePage = lazy(() => import('./pages/analytics/AnalyticsAttendancePage'))
const AnalyticsAtRiskPage = lazy(() => import('./pages/analytics/AnalyticsAtRiskPage'))

const StudentIdCardsPage = lazy(() => import('./pages/students/StudentIdCardsPage'))
const ApprovalsHubPage = lazy(() => import('./pages/ApprovalsHubPage'))

function RouteLoader() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <div className="mx-auto flex min-h-screen max-w-5xl items-center px-6">
        <p className="text-sm tracking-wide text-slate-400">Loading module...</p>
      </div>
    </div>
  )
}

function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const authMode = useAuthStore((state) => state.authMode)
  const role = useAuthStore((state) => state.role)
  const isTenantAuth = isAuthenticated && authMode === 'tenant'
  const isPlatformAuth = isAuthenticated && authMode === 'platform'
  const tenantHomePath = getTenantHomePath(role)
  const studentsEnabled = isModuleRouteEnabled('students')
  const admissionsEnabled = isModuleRouteEnabled('admissions')
  const financeEnabled = isModuleRouteEnabled('finance')
  const reportingEnabled = isModuleRouteEnabled('reporting')
  const parentsEnabled = isModuleRouteEnabled('parents')
  const academicsEnabled = isModuleRouteEnabled('academics')
  const hrEnabled = isModuleRouteEnabled('hr')
  const staffEnabled = isModuleRouteEnabled('staff')
  const communicationEnabled = isModuleRouteEnabled('communication')
  const parentPortalEnabled = isModuleRouteEnabled('parent-portal')
  const libraryEnabled = isModuleRouteEnabled('library')
  const assetsEnabled = isModuleRouteEnabled('assets')
  const settingsEnabled = isModuleRouteEnabled('settings')
  const storeEnabled = isModuleRouteEnabled('store')
  const dispensaryEnabled = isModuleRouteEnabled('dispensary')
  const clockinEnabled = isModuleRouteEnabled('clockin')
  const timetableEnabled = isModuleRouteEnabled('timetable')
  const transportEnabled = isModuleRouteEnabled('transport')
  const visitorsEnabled = isModuleRouteEnabled('visitors')
  const examinationsEnabled = isModuleRouteEnabled('examinations')
  const alumniEnabled = isModuleRouteEnabled('alumni')
  const hostelEnabled = isModuleRouteEnabled('hostel')
  const ptmEnabled = isModuleRouteEnabled('ptm')
  const sportsEnabled = isModuleRouteEnabled('sports')
  const cafeteriaEnabled = isModuleRouteEnabled('cafeteria')
  const curriculumEnabled = isModuleRouteEnabled('curriculum')
  const maintenanceEnabled = isModuleRouteEnabled('maintenance')
  const elearningEnabled = isModuleRouteEnabled('elearning')
  const analyticsEnabled = isModuleRouteEnabled('analytics')
  const transfersEnabled = isModuleRouteEnabled('transfers')

  return (
    <>
    <ChunkErrorBoundary>
    <Suspense fallback={<RouteLoader />}>
      <Routes>
        <Route
          path="/"
          element={
            isTenantAuth ? <Navigate to={tenantHomePath} replace /> : isPlatformAuth ? <Navigate to="/platform" replace /> : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/login"
          element={isTenantAuth ? <Navigate to={tenantHomePath} replace /> : isPlatformAuth ? <Navigate to="/platform" replace /> : <LoginPage />}
        />
        <Route
          path="/platform/login"
          element={isPlatformAuth ? <Navigate to="/platform" replace /> : isTenantAuth ? <Navigate to={tenantHomePath} replace /> : <PlatformLoginPage />}
        />
        {/* Student Portal */}
        <Route
          path="/student-portal/*"
          element={isTenantAuth ? <StudentPortalLayout /> : <Navigate to={isPlatformAuth ? '/platform' : '/login'} replace />}
        >
          <Route index element={<StudentPortalDashboardPage />} />
          <Route path="grades" element={<StudentPortalGradesPage />} />
          <Route path="timetable" element={<StudentPortalTimetablePage />} />
          <Route path="assignments" element={<StudentPortalAssignmentsPage />} />
          <Route path="elearning" element={<StudentPortalELearningPage />} />
          <Route path="attendance" element={<StudentPortalAttendancePage />} />
          <Route path="library" element={<StudentPortalLibraryPage />} />
          <Route path="fees" element={<StudentPortalFeesPage />} />
        </Route>
        {/* Teacher Portal */}
        <Route
          path="/teacher-portal/*"
          element={isTenantAuth ? <TeacherPortalLayout /> : <Navigate to={isPlatformAuth ? '/platform' : '/login'} replace />}
        >
          <Route index element={<TeacherPortalDashboardPage />} />
          <Route path="classes" element={<TeacherPortalClassesPage />} />
          <Route path="attendance" element={<TeacherPortalAttendancePage />} />
          <Route path="gradebook" element={<TeacherPortalGradebookPage />} />
          <Route path="resources" element={<TeacherPortalResourcesPage />} />
          <Route path="timetable" element={<TeacherPortalTimetablePage />} />
        </Route>
        <Route
          path="/dashboard"
          element={
            isTenantAuth
              ? tenantHomePath === '/dashboard'
                ? <AppShell />
                : <Navigate to={tenantHomePath} replace />
              : <Navigate to={isPlatformAuth ? '/platform' : '/login'} replace />
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="approvals" element={<ApprovalsHubPage />} />
        </Route>
        <Route
          path="/platform/*"
          element={isPlatformAuth ? <PlatformLayout /> : <Navigate to="/platform/login" replace />}
        >
          <Route index element={<PlatformOverviewPage />} />
          <Route path="tenants" element={<PlatformTenantsPage />} />
          <Route path="billing" element={<PlatformBillingPage />} />
          <Route path="support" element={<PlatformSupportPage />} />
          <Route path="impersonation" element={<PlatformImpersonationPage />} />
          <Route path="monitoring" element={<PlatformMonitoringPage />} />
          <Route path="deployment" element={<PlatformDeploymentPage />} />
          <Route path="backup-recovery" element={<PlatformBackupRecoveryPage />} />
          <Route path="security-compliance" element={<PlatformSecurityCompliancePage />} />
          <Route path="action-logs" element={<PlatformActionLogsPage />} />
          <Route path="settings" element={<PlatformSettingsPage />} />
          <Route path="admin-users" element={<PlatformAdminUsersPage />} />
          <Route path="usage-metering" element={<PlatformUsageMeteringPage />} />
          <Route path="feature-flags" element={<PlatformFeatureFlagsPage />} />
          <Route path="notifications" element={<PlatformNotificationsPage />} />
          <Route path="api-integrations" element={<PlatformApiIntegrationsPage />} />
          <Route path="revenue-analytics" element={<PlatformRevenueAnalyticsPage />} />
          <Route path="workflow-monitor" element={<PlatformWorkflowMonitorPage />} />
          <Route path="global-reports" element={<PlatformGlobalReportsPage />} />
          <Route path="domain-requests" element={<PlatformDomainRequestsPage />} />
        </Route>
        <Route
          path="/modules"
          element={<Navigate to={isPlatformAuth ? '/platform' : isTenantAuth ? tenantHomePath : '/login'} replace />}
        />
        <Route
          path="/modules/students/*"
          element={isTenantAuth && studentsEnabled ? <ModuleGuard moduleKey="STUDENTS"><StudentsLayout /></ModuleGuard> : <Navigate to={isPlatformAuth ? '/platform' : '/dashboard'} replace />}
        >
          <Route index element={<StudentsDashboardPage />} />
          <Route path="directory" element={<StudentsDirectoryPage />} />
          <Route path="admissions" element={<StudentsAdmissionsPage />} />
          <Route path="attendance" element={<StudentsAttendancePage />} />
          <Route path="behavior" element={<StudentsBehaviorPage />} />
          <Route path="medical" element={<StudentsMedicalPage />} />
          <Route path="documents" element={<StudentsDocumentsPage />} />
          <Route path="transfers" element={<StudentsTransfersPage />} />
          <Route path="reports" element={<StudentsReportsPage />} />
          <Route path=":id" element={<StudentProfilePage />} />
        </Route>
        <Route
          path="/modules/admissions/*"
          element={isTenantAuth && admissionsEnabled ? <ModuleGuard moduleKey="ADMISSIONS"><AdmissionsLayout /></ModuleGuard> : <Navigate to={isPlatformAuth ? '/platform' : '/dashboard'} replace />}
        >
          <Route index element={<Navigate to="/modules/admissions/dashboard" replace />} />
          <Route path="dashboard" element={<AdmissionsDashboardPage />} />
          <Route path="inquiries" element={<AdmissionsInquiriesPage />} />
          <Route path="applications" element={<AdmissionsApplicationsPage />} />
          <Route path="reviews" element={<AdmissionsReviewsPage />} />
          <Route path="assessments" element={<AdmissionsAssessmentsPage />} />
          <Route path="interviews" element={<AdmissionsInterviewsPage />} />
          <Route path="decisions" element={<AdmissionsDecisionsPage />} />
          <Route path="enrollment" element={<AdmissionsEnrollmentPage />} />
          <Route path="analytics" element={<AdmissionsAnalyticsPage />} />
          <Route path="legacy" element={<StudentsAdmissionsPage />} />
        </Route>
        <Route
          path="/modules/finance/*"
          element={isTenantAuth && financeEnabled ? <ModuleGuard moduleKey="FINANCE"><FinanceLayout /></ModuleGuard> : <Navigate to={isPlatformAuth ? '/platform' : '/dashboard'} replace />}
        >
          <Route index element={<FinanceSummaryPage />} />
          <Route path="invoices" element={<FinanceInvoicesPage />} />
          <Route path="invoices/new" element={<FinanceInvoiceFormPage />} />
          <Route path="invoices/:id/edit" element={<FinanceInvoiceFormPage />} />
          <Route path="payments" element={<FinancePaymentsPage />} />
          <Route path="payments/new" element={<FinancePaymentFormPage />} />
          <Route path="expenses" element={<FinanceExpensesPage />} />
          <Route path="expenses/new" element={<FinanceExpenseFormPage />} />
          <Route path="expenses/:id/edit" element={<FinanceExpenseFormPage />} />
          <Route path="fee-structures" element={<FinanceFeeStructuresPage />} />
          <Route path="fee-structures/new" element={<FinanceFeeStructureFormPage />} />
          <Route path="fee-structures/:id/edit" element={<FinanceFeeStructureFormPage />} />
          <Route path="fee-assignments" element={<FinanceFeeAssignmentsPage />} />
          <Route path="fee-assignments/new" element={<FinanceFeeAssignmentFormPage />} />
          <Route path="fee-assignments/:id/edit" element={<FinanceFeeAssignmentFormPage />} />
          <Route path="adjustments" element={<FinanceAdjustmentsPage />} />
          <Route path="adjustments/new" element={<FinanceAdjustmentFormPage />} />
          <Route path="dispensary" element={<FinanceDispensaryPage />} />
          <Route path="budgets" element={<Navigate to="/modules/finance/expenses" replace />} />
          <Route path="accounts" element={<FinanceAccountsPage />} />
          <Route path="reconciliation" element={<FinanceReconciliationPage />} />
          <Route path="reports" element={<FinanceReportsPage />} />
          <Route path="scholarships" element={<FinanceScholarshipsPage />} />
          <Route path="refunds" element={<FinanceRefundsPage />} />
          <Route path="vote-heads" element={<FinanceVoteHeadsPage />} />
          <Route path="cashbook" element={<FinanceCashbookPage />} />
          <Route path="arrears" element={<FinanceArrearsPage />} />
          <Route path="store-requests" element={<FinanceStoreRequestsPage />} />
          <Route path="ledger" element={<FinanceStudentLedgerPage />} />
          <Route path="general-ledger" element={<FinanceGeneralLedgerPage />} />
          <Route path="expense-ledger" element={<FinanceExpenseLedgerPage />} />
          <Route path="budget-ledger" element={<FinanceBudgetLedgerPage />} />
          <Route path="optional-charges" element={<FinanceOptionalChargesPage />} />
          <Route path="audit-reports" element={<FinanceAuditReportsPage />} />
          <Route path="settings" element={<Navigate to="/settings/finance" replace />} />
        </Route>
        <Route
          path="/modules/reporting/*"
          element={isTenantAuth && reportingEnabled ? <ModuleGuard moduleKey="REPORTING"><ReportingLayout /></ModuleGuard> : <Navigate to={isPlatformAuth ? '/platform' : '/dashboard'} replace />}
        >
          <Route index element={<Navigate to="/modules/reporting/audit-logs" replace />} />
          <Route path="dashboard" element={<Navigate to="/modules/reporting/audit-logs" replace />} />
          <Route path="audit-logs" element={<ReportingAuditLogsPage />} />
        </Route>
        <Route
          path="/modules/parents/*"
          element={isTenantAuth && parentsEnabled ? <ParentsLayout /> : <Navigate to={isPlatformAuth ? '/platform' : '/dashboard'} replace />}
        >
          <Route index element={<ParentsSummaryPage />} />
          <Route path="directory" element={<ParentsDirectoryPage />} />
        </Route>
        <Route
          path="/modules/academics/*"
          element={isTenantAuth && academicsEnabled ? <ModuleGuard moduleKey="ACADEMICS"><AcademicsLayout /></ModuleGuard> : <Navigate to={isPlatformAuth ? '/platform' : '/dashboard'} replace />}
        >
          <Route index element={<Navigate to="/modules/academics/dashboard" replace />} />
          <Route path="dashboard" element={<AcademicsDashboardPage />} />
          <Route path="structure" element={<AcademicsStructurePage />} />
          <Route path="subjects" element={<AcademicsSubjectsPage />} />
          <Route path="class-management" element={<AcademicsClassManagementPage />} />
          <Route path="gradebook" element={<AcademicsGradebookPage />} />
          <Route path="report-cards" element={<AcademicsReportCardsPage />} />
          <Route path="assignments" element={<AcademicsAssignmentsPage />} />
          <Route path="calendar" element={<AcademicsCalendarPage />} />
          <Route path="analytics" element={<AcademicsAnalyticsPage />} />
        </Route>
        <Route
          path="/modules/hr/*"
          element={isTenantAuth && hrEnabled ? <ModuleGuard moduleKey="HR"><HrLayout /></ModuleGuard> : <Navigate to={isPlatformAuth ? '/platform' : '/dashboard'} replace />}
        >
          <Route index element={<Navigate to="/modules/hr/dashboard" replace />} />
          <Route path="dashboard" element={<HrDashboardPage />} />
          <Route path="employees" element={<HrEmployeesPage />} />
          <Route path="employees/:id" element={<HrEmployeeProfilePage />} />
          <Route path="organization" element={<HrOrganizationPage />} />
          <Route path="attendance" element={<HrAttendancePage />} />
          <Route path="leave" element={<HrLeavePage />} />
          <Route path="payroll" element={<HrPayrollPage />} />
          <Route path="recruitment" element={<HrRecruitmentPage />} />
          <Route path="onboarding" element={<HrOnboardingPage />} />
          <Route path="performance" element={<HrPerformancePage />} />
          <Route path="training" element={<HrTrainingPage />} />
          <Route path="transfers" element={<HrTransfersPage />} />
          <Route path="career-events" element={<HrCareerEventsPage />} />
          <Route path="discipline" element={<HrDisciplinePage />} />
          <Route path="exits" element={<HrExitsPage />} />
          <Route path="analytics" element={<HrAnalyticsPage />} />
          <Route path="compliance" element={<HrCompliancePage />} />
        </Route>
        <Route
          path="/modules/staff/*"
          element={isTenantAuth && staffEnabled ? <ModuleGuard moduleKey="STAFF"><StaffLayout /></ModuleGuard> : <Navigate to={isPlatformAuth ? '/platform' : '/dashboard'} replace />}
        >
          <Route index element={<Navigate to="/modules/staff/dashboard" replace />} />
          <Route path="dashboard" element={<StaffDashboardPage />} />
          <Route path="directory" element={<StaffDirectoryPage />} />
          <Route path="profiles" element={<StaffProfilesPage />} />
          <Route path="departments-roles" element={<StaffDepartmentsRolesPage />} />
          <Route path="attendance" element={<StaffAttendancePage />} />
          <Route path="performance" element={<StaffPerformancePage />} />
          <Route path="documents" element={<StaffDocumentsPage />} />
          <Route path="analytics" element={<StaffAnalyticsPage />} />
        </Route>
        <Route
          path="/modules/communication/*"
          element={isTenantAuth && communicationEnabled ? <ModuleGuard moduleKey="COMMUNICATION"><CommunicationLayout /></ModuleGuard> : <Navigate to={isPlatformAuth ? '/platform' : '/dashboard'} replace />}
        >
          <Route index element={<Navigate to="/modules/communication/dashboard" replace />} />
          <Route path="dashboard" element={<CommunicationDashboardPage />} />
          <Route path="messaging" element={<CommunicationMessagingPage />} />
          <Route path="notifications" element={<CommunicationNotificationsPage />} />
          <Route path="email" element={<CommunicationEmailPage />} />
          <Route path="sms" element={<CommunicationSmsPage />} />
          <Route path="templates" element={<CommunicationTemplatesPage />} />
          <Route path="announcements" element={<CommunicationAnnouncementsPage />} />
          <Route path="alerts-center" element={<AlertsCenterPage />} />
          <Route path="analytics" element={<CommunicationAnalyticsPage />} />
          <Route path="parent" element={<CommunicationParentPage />} />
        </Route>
        <Route
          path="/modules/parent-portal/*"
          element={isTenantAuth && parentPortalEnabled ? <ModuleGuard moduleKey="PARENT_PORTAL"><ParentPortalLayout /></ModuleGuard> : <Navigate to={isPlatformAuth ? '/platform' : '/dashboard'} replace />}
        >
          <Route index element={<Navigate to="/modules/parent-portal/dashboard" replace />} />
          <Route path="dashboard" element={<ParentPortalDashboardPage />} />
          <Route path="academics" element={<ParentPortalAcademicsPage />} />
          <Route path="attendance" element={<ParentPortalAttendancePage />} />
          <Route path="finance" element={<ParentPortalFinancePage />} />
          <Route path="communication" element={<ParentPortalCommunicationPage />} />
          <Route path="schedule" element={<ParentPortalSchedulePage />} />
          <Route path="assignments" element={<ParentPortalAssignmentsPage />} />
          <Route path="health" element={<ParentPortalHealthPage />} />
          <Route path="transport" element={<ParentPortalTransportPage />} />
          <Route path="library-profile" element={<ParentPortalLibraryProfilePage />} />
        </Route>
        <Route
          path="/modules/library/*"
          element={isTenantAuth && libraryEnabled ? <ModuleGuard moduleKey="LIBRARY"><LibraryLayout /></ModuleGuard> : <Navigate to={isPlatformAuth ? '/platform' : '/dashboard'} replace />}
        >
          <Route index element={<Navigate to="/modules/library/dashboard" replace />} />
          <Route path="dashboard" element={<LibraryDashboardPage />} />
          <Route path="catalog" element={<LibraryCatalogPage />} />
          <Route path="circulation" element={<LibraryCirculationPage />} />
          <Route path="reservations" element={<LibraryReservationsPage />} />
          <Route path="members" element={<LibraryMembersPage />} />
          <Route path="fines" element={<LibraryFinesPage />} />
          <Route path="inventory" element={<LibraryInventoryPage />} />
          <Route path="acquisition" element={<LibraryAcquisitionPage />} />
          <Route path="reports" element={<LibraryReportsPage />} />
        </Route>
        <Route
          path="/modules/assets/*"
          element={isTenantAuth && assetsEnabled ? <ModuleGuard moduleKey="ASSETS"><AssetsLayout /></ModuleGuard> : <Navigate to={isPlatformAuth ? '/platform' : '/dashboard'} replace />}
        >
          <Route index element={<Navigate to="/modules/assets/dashboard" replace />} />
          <Route path="dashboard" element={<AssetsDashboardPage />} />
          <Route path="registry" element={<AssetsRegistryPage />} />
          <Route path="categories" element={<AssetsCategoriesPage />} />
          <Route path="assignments" element={<AssetsAssignmentsPage />} />
          <Route path="maintenance" element={<AssetsMaintenancePage />} />
          <Route path="depreciation" element={<AssetsDepreciationPage />} />
          <Route path="disposals" element={<AssetsDisposalPage />} />
          <Route path="transfers" element={<AssetsTransfersPage />} />
          <Route path="warranties" element={<AssetsWarrantyPage />} />
        </Route>
        <Route
          path="/modules/store/*"
          element={isTenantAuth && storeEnabled ? <ModuleGuard moduleKey="STORE"><StoreLayout /></ModuleGuard> : <Navigate to={isPlatformAuth ? '/platform' : '/dashboard'} replace />}
        >
          <Route index element={<StoreDashboardPage />} />
          <Route path="items" element={<StoreItemsPage />} />
          <Route path="categories" element={<StoreCategoriesPage />} />
          <Route path="requests" element={<StoreRequestsPage />} />
          <Route path="movements" element={<StoreMovementsPage />} />
          <Route path="orders" element={<StoreOrdersPage />} />
          <Route path="suppliers" element={<StoreSuppliersPage />} />
          <Route path="allocation" element={<StoreAllocationPage />} />
          <Route path="low-stock" element={<StoreLowStockPage />} />
          <Route path="reports" element={<StoreReportsPage />} />
        </Route>
        <Route
          path="/modules/dispensary/*"
          element={isTenantAuth && dispensaryEnabled ? <ModuleGuard moduleKey="DISPENSARY"><DispensaryLayout /></ModuleGuard> : <Navigate to={isPlatformAuth ? '/platform' : '/dashboard'} replace />}
        >
          <Route index element={<DispensaryDashboardPage />} />
          <Route path="visits" element={<DispensaryVisitsPage />} />
          <Route path="stock" element={<DispensaryStockPage />} />
          <Route path="delivery-notes" element={<DispensaryDeliveryNotesPage />} />
          <Route path="outside-treatments" element={<DispensaryOutsideTreatmentsPage />} />
        </Route>
        <Route
          path="/settings"
          element={isTenantAuth && settingsEnabled ? <SettingsLayout /> : <Navigate to={isPlatformAuth ? '/platform' : '/dashboard'} replace />}
        >
          <Route index element={<Navigate to="/settings/control-plane" replace />} />
          <Route path="control-plane" element={<SettingsControlPlanePage />} />
          <Route path="school-profile" element={<SettingsSchoolProfilePage />} />
          <Route path="global" element={<SettingsGlobalPage />} />
          <Route path="communication" element={<SettingsCommunicationPage />} />
          <Route path="academics" element={<SettingsAcademicsConfigPage />} />
          <Route path="examinations" element={<SettingsExaminationsConfigPage />} />
          <Route path="timetable" element={<SettingsTimetableConfigPage />} />
          <Route path="library" element={<SettingsLibraryConfigPage />} />
          <Route path="transport" element={<SettingsTransportConfigPage />} />
          <Route path="hostel" element={<SettingsHostelConfigPage />} />
          <Route path="security" element={<SettingsSecurityPage />} />
          <Route path="domain" element={<SettingsDomainPage />} />
          <Route path="seed-data" element={<SettingsSeedPage />} />
          <Route path="users" element={<SettingsUsersPage />} />
          <Route path="roles" element={<SettingsRolesPage />} />
          <Route path="admission" element={<SettingsAdmissionPage />} />
          <Route path="import-export" element={<SettingsImportExportPage />} />
          <Route path="finance" element={<SettingsFinancePage />} />
          <Route path="modules" element={<ModuleSettingsPage />} />
          <Route path="modules/:module" element={<ModuleSettingsPage />} />
          <Route path=":module" element={<ModuleSettingsPage />} />
        </Route>
        <Route
          path="/kiosk/clockin"
          element={<ClockInKioskPage />}
        />
        <Route
          path="/modules/clockin/*"
          element={isTenantAuth && clockinEnabled ? <ModuleGuard moduleKey="CLOCKIN"><ClockInLayout /></ModuleGuard> : <Navigate to={isPlatformAuth ? '/platform' : '/dashboard'} replace />}
        >
          <Route index element={<Navigate to="/modules/clockin/dashboard" replace />} />
          <Route path="dashboard" element={<ClockInDashboardPage />} />
          <Route path="kiosk" element={<ClockInKioskPage />} />
          <Route path="registry" element={<ClockInRegistryPage />} />
          <Route path="devices" element={<ClockInDevicesPage />} />
          <Route path="shifts" element={<ClockInShiftsPage />} />
          <Route path="reports" element={<ClockInReportsPage />} />
          <Route path="alerts" element={<ClockInAlertsPage />} />
          <Route path="smartpss" element={<SmartPSSPage />} />
        </Route>
        <Route
          path="/modules/timetable/*"
          element={isTenantAuth && timetableEnabled ? <ModuleGuard moduleKey="TIMETABLE"><TimetableLayout /></ModuleGuard> : <Navigate to={isPlatformAuth ? '/platform' : '/dashboard'} replace />}
        >
          <Route index element={<Navigate to="/modules/timetable/grid" replace />} />
          <Route path="grid" element={<TimetableGridPage />} />
          <Route path="my-schedule" element={<TimetableMySchedulePage />} />
          <Route path="coverage" element={<TimetableCoveragePage />} />
          <Route path="change-requests" element={<TimetableChangeRequestsPage />} />
          <Route path="staff-duties" element={<TimetableStaffDutyPage />} />
        </Route>
        <Route
          path="/modules/transport/*"
          element={isTenantAuth && transportEnabled ? <ModuleGuard moduleKey="TRANSPORT"><TransportLayout /></ModuleGuard> : <Navigate to={isPlatformAuth ? '/platform' : '/dashboard'} replace />}
        >
          <Route index element={<TransportDashboardPage />} />
          <Route path="dashboard" element={<TransportDashboardPage />} />
          <Route path="vehicles" element={<TransportVehiclesPage />} />
          <Route path="routes" element={<TransportRoutesPage />} />
          <Route path="stops" element={<TransportStopsPage />} />
          <Route path="students" element={<TransportStudentsPage />} />
          <Route path="incidents" element={<TransportIncidentsPage />} />
        </Route>
        <Route
          path="/modules/transfers/*"
          element={isTenantAuth && transfersEnabled ? <TransfersLayout /> : <Navigate to={isPlatformAuth ? '/platform' : '/dashboard'} replace />}
        >
          <Route index element={<TransfersDashboardPage />} />
          <Route path="dashboard" element={<TransfersDashboardPage />} />
          <Route path="incoming" element={<TransfersDashboardPage />} />
          <Route path="outgoing" element={<TransfersDashboardPage />} />
          <Route path="history" element={<TransfersDashboardPage />} />
          <Route path="initiate" element={<TransfersInitiatePage />} />
          <Route path=":transferId" element={<TransferDetailPage />} />
        </Route>
        <Route
          path="/modules/visitors/*"
          element={isTenantAuth && visitorsEnabled ? <ModuleGuard moduleKey="VISITOR_MGMT"><VisitorMgmtLayout /></ModuleGuard> : <Navigate to={isPlatformAuth ? '/platform' : '/dashboard'} replace />}
        >
          <Route index element={<VisitorDashboardPage />} />
          <Route path="dashboard" element={<VisitorDashboardPage />} />
          <Route path="visitors" element={<VisitorMgmtVisitorsPage />} />
          <Route path="authorized-pickups" element={<VisitorMgmtAuthorizedPickupsPage />} />
          <Route path="pickup-logs" element={<VisitorMgmtPickupLogsPage />} />
        </Route>
        <Route
          path="/modules/examinations/*"
          element={isTenantAuth && examinationsEnabled ? <ModuleGuard moduleKey="EXAMINATIONS"><ExaminationsLayout /></ModuleGuard> : <Navigate to={isPlatformAuth ? '/platform' : '/dashboard'} replace />}
        >
          <Route index element={<ExaminationsDashboardPage />} />
          <Route path="dashboard" element={<ExaminationsDashboardPage />} />
          <Route path="sessions" element={<ExaminationsSessionsPage />} />
          <Route path="papers" element={<ExaminationsPapersPage />} />
          <Route path="seats" element={<ExaminationsSeatsPage />} />
          <Route path="results" element={<ExaminationsResultsPage />} />
          <Route path="grades" element={<ExaminationsGradesPage />} />
          <Route path="exam-setters" element={<ExaminationsExamSettersPage />} />
          <Route path="paper-uploads" element={<ExaminationsPaperUploadsPage />} />
        </Route>
        <Route
          path="/modules/alumni/*"
          element={isTenantAuth && alumniEnabled ? <ModuleGuard moduleKey="ALUMNI"><AlumniLayout /></ModuleGuard> : <Navigate to={isPlatformAuth ? '/platform' : '/dashboard'} replace />}
        >
          <Route index element={<AlumniDashboardPage />} />
          <Route path="dashboard" element={<AlumniDashboardPage />} />
          <Route path="profiles" element={<AlumniProfilesPage />} />
          <Route path="events" element={<AlumniEventsPage />} />
          <Route path="attendees" element={<AlumniAttendeesPage />} />
          <Route path="mentorship" element={<AlumniMentorshipPage />} />
          <Route path="donations" element={<AlumniDonationsPage />} />
        </Route>
        <Route
          path="/modules/hostel/*"
          element={isTenantAuth && hostelEnabled ? <ModuleGuard moduleKey="HOSTEL"><HostelLayout /></ModuleGuard> : <Navigate to={isPlatformAuth ? '/platform' : '/dashboard'} replace />}
        >
          <Route index element={<HostelDashboardPage />} />
          <Route path="dashboard" element={<HostelDashboardPage />} />
          <Route path="dormitories" element={<DormitoriesPage />} />
          <Route path="beds" element={<BedSpacesPage />} />
          <Route path="allocations" element={<HostelAllocationsPage />} />
          <Route path="attendance" element={<HostelAttendancePage />} />
          <Route path="leave" element={<HostelLeavePage />} />
        </Route>
        <Route
          path="/modules/ptm/*"
          element={isTenantAuth && ptmEnabled ? <ModuleGuard moduleKey="PTM"><PTMLayout /></ModuleGuard> : <Navigate to={isPlatformAuth ? '/platform' : '/dashboard'} replace />}
        >
          <Route index element={<PTMDashboardPage />} />
          <Route path="dashboard" element={<PTMDashboardPage />} />
          <Route path="sessions" element={<PTMSessionsPage />} />
          <Route path="bookings" element={<PTMBookingsPage />} />
          <Route path="my-slots" element={<MyPTMSlotsPage />} />
        </Route>
        <Route
          path="/modules/sports/*"
          element={isTenantAuth && sportsEnabled ? <ModuleGuard moduleKey="SPORTS"><SportsLayout /></ModuleGuard> : <Navigate to={isPlatformAuth ? '/platform' : '/dashboard'} replace />}
        >
          <Route index element={<SportsDashboardPage />} />
          <Route path="dashboard" element={<SportsDashboardPage />} />
          <Route path="clubs" element={<SportsClubsPage />} />
          <Route path="memberships" element={<SportsMembershipsPage />} />
          <Route path="tournaments" element={<SportsTournamentsPage />} />
          <Route path="awards" element={<SportsAwardsPage />} />
        </Route>
        <Route
          path="/modules/cafeteria/*"
          element={isTenantAuth && cafeteriaEnabled ? <ModuleGuard moduleKey="CAFETERIA"><CafeteriaLayout /></ModuleGuard> : <Navigate to={isPlatformAuth ? '/platform' : '/dashboard'} replace />}
        >
          <Route index element={<CafeteriaDashboardPage />} />
          <Route path="dashboard" element={<CafeteriaDashboardPage />} />
          <Route path="plans" element={<CafeteriaPlansPage />} />
          <Route path="menu" element={<CafeteriaMenuPage />} />
          <Route path="enrollments" element={<CafeteriaEnrollmentsPage />} />
          <Route path="logs" element={<CafeteriaLogsPage />} />
          <Route path="accounts" element={<CafeteriaAccountsPage />} />
          <Route path="preorders" element={<CafeteriaPreOrdersPage />} />
          <Route path="dietary" element={<CafeteriaDietaryPage />} />
          <Route path="payments" element={<CafeteriaPaymentsPage />} />
          <Route path="kitchen" element={<CafeteriaKitchenPage />} />
          <Route path="reports" element={<CafeteriaReportsPage />} />
        </Route>
        <Route
          path="/modules/curriculum/*"
          element={isTenantAuth && curriculumEnabled ? <ModuleGuard moduleKey="CURRICULUM"><CurriculumLayout /></ModuleGuard> : <Navigate to={isPlatformAuth ? '/platform' : '/dashboard'} replace />}
        >
          <Route index element={<CurriculumDashboardPage />} />
          <Route path="dashboard" element={<CurriculumDashboardPage />} />
          <Route path="schemes" element={<CurriculumSchemesPage />} />
          <Route path="lessons" element={<CurriculumLessonsPage />} />
          <Route path="resources" element={<CurriculumResourcesPage />} />
        </Route>
        <Route
          path="/modules/maintenance/*"
          element={isTenantAuth && maintenanceEnabled ? <ModuleGuard moduleKey="MAINTENANCE"><MaintenanceLayout /></ModuleGuard> : <Navigate to={isPlatformAuth ? '/platform' : '/dashboard'} replace />}
        >
          <Route index element={<MaintenanceDashboardPage />} />
          <Route path="dashboard" element={<MaintenanceDashboardPage />} />
          <Route path="requests" element={<MaintenanceRequestsPage />} />
          <Route path="categories" element={<MaintenanceCategoriesPage />} />
          <Route path="checklist" element={<MaintenanceChecklistPage />} />
        </Route>
        <Route
          path="/modules/elearning/*"
          element={isTenantAuth && elearningEnabled ? <ModuleGuard moduleKey="ELEARNING"><ELearningLayout /></ModuleGuard> : <Navigate to={isPlatformAuth ? '/platform' : '/dashboard'} replace />}
        >
          <Route index element={<ELearningDashboardPage />} />
          <Route path="dashboard" element={<ELearningDashboardPage />} />
          <Route path="courses" element={<ELearningCoursesPage />} />
          <Route path="materials" element={<ELearningMaterialsPage />} />
          <Route path="quizzes" element={<ELearningQuizzesPage />} />
          <Route path="sessions" element={<ELearningVirtualSessionsPage />} />
        </Route>
        <Route
          path="/modules/analytics/*"
          element={isTenantAuth && analyticsEnabled ? <ModuleGuard moduleKey="ANALYTICS"><AnalyticsLayout /></ModuleGuard> : <Navigate to={isPlatformAuth ? '/platform' : '/dashboard'} replace />}
        >
          <Route index element={<AnalyticsDashboardPage />} />
          <Route path="dashboard" element={<AnalyticsDashboardPage />} />
          <Route path="enrollment" element={<AnalyticsEnrollmentPage />} />
          <Route path="attendance" element={<AnalyticsAttendancePage />} />
          <Route path="at-risk" element={<AnalyticsAtRiskPage />} />
        </Route>
        <Route
          path="/modules/students/id-cards"
          element={isTenantAuth && studentsEnabled ? <StudentIdCardsPage /> : <Navigate to={isPlatformAuth ? '/platform' : '/dashboard'} replace />}
        />
        <Route path="/modules/:moduleKey" element={<Navigate to={isPlatformAuth ? '/platform' : '/dashboard'} replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
    </ChunkErrorBoundary>
    <Footer />
    </>
  )
}

export default App
