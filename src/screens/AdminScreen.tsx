import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Modal, Platform, ActivityIndicator, Switch, DeviceEventEmitter, Image, Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { Colors, Gradients, Shadows } from '../constants/colors';
import { APP_MAX_WIDTH } from '../constants/layout';
import { MAPBOX_ACCESS_TOKEN } from '../constants/mapbox';

function businessMapUrl(lat: number, lng: number): string {
  return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+7c3aed(${lng},${lat})/${lng},${lat},15,0/640x280@2x?access_token=${MAPBOX_ACCESS_TOKEN}`;
}
import { useI18n } from '../i18n';
import {
  ALL_PERMISSIONS,
  AdminSession,
  PERMISSION_GROUPS,
  Permission,
  PermissionGroupId,
  canAccessAdminPortal,
  canManageActors,
  canManageBilling,
  canManageReports,
  canManageSettings,
  canManageUsers,
  clearAdminSession,
  getSessionPermissions,
  permissionsByGroup,
} from '../services/adminApi';
import {
  approvePlace,
  isBackendAdminSession,
  listPendingPlaces,
  rejectPlace,
  type AdminPlaceItem,
} from '../services/adminPlacesApi';
import {
  approveBusiness,
  listPendingBusinesses,
  rejectBusiness,
  type AdminBusinessItem,
} from '../services/adminBusinessesApi';
import {
  listAdminReports,
  updateAdminReportStatus,
  type AdminReportItem,
  type ReportStatus,
  type ReportTargetType,
} from '../services/adminReportsApi';
import {
  confirmAdminCampaignPayment,
  confirmAdminPremiumPayment,
  createAdminProductPackage,
  deleteAdminProductPackage,
  fetchAdminPackageCatalog,
  listAdminPayments,
  updateAdminProductPackage,
  parseAdminVndInput,
  isValidProductPackageId,
  type AdminPaymentItem,
  type AdminPaymentStatus,
  type AdminProductPackage,
} from '../services/adminBillingApi';
import { invalidateProductCatalogCache } from '../services/productCatalogApi';
import AdminPaymentAnalytics from '../components/admin/AdminPaymentAnalytics';
import AdminAuditLogPanel from '../components/admin/AdminAuditLogPanel';
import {
  fetchAdminAuditLogs,
  type AdminAuditAction,
  type AdminAuditLogItem,
  type AdminAuditLogSummary,
} from '../services/adminAuditLogApi';
import { fetchAdminDashboard, type AdminDashboardData } from '../services/adminDashboardApi';
import {
  listBackendAdminUsers,
  updateBackendUserStatus,
  type BackendAdminUser,
  type BackendUserStatus,
} from '../services/adminUsersApi';
import {
  fetchAdminServerOverview,
  type AdminServerOverview,
} from '../services/adminSettingsApi';
import AdminLiveOverview from '../components/admin/AdminLiveOverview';
import AdminSettingsPanel from '../components/admin/AdminSettingsPanel';
import { clearAuthSession } from '../services/authApi';
import { clearBackendAdminPortal } from '../services/adminPlacesApi';
import { getPackageById, type B2bPackageId } from '../constants/b2bPromotionPackages';

type Tab =
  | 'overview'
  | 'users'
  | 'roles'
  | 'partners'
  | 'reports'
  | 'packages'
  | 'payments'
  | 'audit'
  | 'settings'
  | 'myperms';

interface AdminScreenProps {
  session: AdminSession;
  onLogout: () => void;
}

function formatDate(iso: string | null, lang: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function formatVnd(amount: number, lang: string): string {
  return `${Math.round(amount).toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US')} ₫`;
}

export default function AdminScreen({ session, onLogout }: AdminScreenProps) {
  const { t, lang, setLang } = useI18n();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [search, setSearch] = useState('');
  const [pendingPlaces, setPendingPlaces] = useState<AdminPlaceItem[]>([]);
  const [pendingBusinesses, setPendingBusinesses] = useState<AdminBusinessItem[]>([]);
  const [businessBusyId, setBusinessBusyId] = useState<string | null>(null);
  const [rejectBusinessTarget, setRejectBusinessTarget] = useState<AdminBusinessItem | null>(null);
  const [placeBusyId, setPlaceBusyId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [partnerQueueModal, setPartnerQueueModal] = useState<'business' | 'place' | null>(null);
  const [reports, setReports] = useState<AdminReportItem[]>([]);
  const [reportFilter, setReportFilter] = useState<'all' | 'Pending'>('Pending');
  const [reportBusyId, setReportBusyId] = useState<string | null>(null);
  const [reportsBackend, setReportsBackend] = useState(false);
  const [adminPackages, setAdminPackages] = useState<AdminProductPackage[]>([]);
  const [packageEdit, setPackageEdit] = useState<AdminProductPackage | null>(null);
  const [packageFormPrice, setPackageFormPrice] = useState('');
  const [packageFormDuration, setPackageFormDuration] = useState('');
  const [packageFormDisplayName, setPackageFormDisplayName] = useState('');
  const [packageFormActive, setPackageFormActive] = useState(true);
  const [packageSaving, setPackageSaving] = useState(false);
  const [packageCreateOpen, setPackageCreateOpen] = useState(false);
  const [packageCreateCode, setPackageCreateCode] = useState('');
  const [packageCreatePrice, setPackageCreatePrice] = useState('');
  const [packageCreateDuration, setPackageCreateDuration] = useState('30');
  const [packageCreateBillingUnit, setPackageCreateBillingUnit] = useState<'campaign' | 'day'>('campaign');
  const [packageCreateDisplayName, setPackageCreateDisplayName] = useState('');
  const [packageCreateSort, setPackageCreateSort] = useState('10');
  const [packageDeleteTarget, setPackageDeleteTarget] = useState<AdminProductPackage | null>(null);
  const [packageSegmentTab, setPackageSegmentTab] = useState<'B2C' | 'B2B'>('B2C');
  const [payments, setPayments] = useState<AdminPaymentItem[]>([]);
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'Pending'>('Pending');
  const [paymentSubTab, setPaymentSubTab] = useState<'overview' | 'list'>('overview');
  const [paymentBusyId, setPaymentBusyId] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLogItem[]>([]);
  const [auditSummary, setAuditSummary] = useState<AdminAuditLogSummary>({
    last24Hours: 0,
    createCount: 0,
    updateCount: 0,
    deleteCount: 0,
  });
  const [auditTotalCount, setAuditTotalCount] = useState(0);
  const [auditActionFilter, setAuditActionFilter] = useState<AdminAuditAction | 'all'>('all');
  const [auditSubTab, setAuditSubTab] = useState<'overview' | 'timeline'>('overview');
  const [dashboard, setDashboard] = useState<AdminDashboardData | null>(null);
  const [backendUsers, setBackendUsers] = useState<BackendAdminUser[]>([]);
  const [backendUserBusyId, setBackendUserBusyId] = useState<string | null>(null);
  const [serverOverview, setServerOverview] = useState<AdminServerOverview | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const tabScrollRef = useRef<ScrollView>(null);
  const tabLayoutX = useRef<Partial<Record<Tab, number>>>({});

  const portalOk = canAccessAdminPortal(permissions);
  const canManage = canManageUsers(permissions);
  const canViewUsers = portalOk || canManage;
  const canCreate = canManage;
  const canEdit = canManage;
  const canDelete = canManage;
  const canBan = canManage;
  const canViewRoles = portalOk || canManageActors(permissions);
  const canManageRoles = canManageActors(permissions);
  const canViewReports = canManageReports(permissions);
  const canManageSettingsPerm = canManageSettings(permissions);
  const canUseBilling = canManageBilling(permissions);
  const canUseAudit = canManageSettings(permissions);
  const staleAdminToken = reportsBackend && !portalOk && permissions.length === 0;

  const roleName = useCallback((_roleId: string) => t('admin.tabActors'), [t]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const perms = await getSessionPermissions(session);
      setPermissions(perms);
      const backendAdmin = await isBackendAdminSession();
      setReportsBackend(backendAdmin);
      if (backendAdmin) {
        try {
          setPendingPlaces(await listPendingPlaces());
        } catch {
          setPendingPlaces([]);
        }
        try {
          setPendingBusinesses(await listPendingBusinesses());
        } catch {
          setPendingBusinesses([]);
        }
        try {
          setReports(await listAdminReports());
        } catch {
          setReports([]);
        }
        try {
          const catalog = await fetchAdminPackageCatalog();
          setAdminPackages(catalog.packages);
        } catch {
          setAdminPackages([]);
        }
        try {
          setPayments(await listAdminPayments());
        } catch {
          setPayments([]);
        }
        try {
          const auditPage = await fetchAdminAuditLogs({ pageSize: 80 });
          setAuditLogs(auditPage.items);
          setAuditSummary(auditPage.summary);
          setAuditTotalCount(auditPage.totalCount);
        } catch {
          setAuditLogs([]);
          setAuditTotalCount(0);
        }
        try {
          setDashboard(await fetchAdminDashboard());
        } catch {
          setDashboard(null);
        }
        try {
          const page = await listBackendAdminUsers({ pageSize: 80, keyword: search.trim() || undefined });
          setBackendUsers(page.items);
        } catch {
          setBackendUsers([]);
        }
        try {
          setSettingsLoading(true);
          setSettingsError(null);
          setServerOverview(await fetchAdminServerOverview());
        } catch (e) {
          setServerOverview(null);
          setSettingsError(e instanceof Error ? e.message : t('admin.settingsLoadError'));
        } finally {
          setSettingsLoading(false);
        }
      } else {
        setPendingPlaces([]);
        setPendingBusinesses([]);
        setReports([]);
        setAdminPackages([]);
        setPayments([]);
        setAuditLogs([]);
        setAuditTotalCount(0);
        setDashboard(null);
        setBackendUsers([]);
        setServerOverview(null);
      }
    } catch {
      Toast.show({ type: 'error', text1: t('admin.loadError') });
    } finally {
      setLoading(false);
    }
  }, [session, t, search]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const handleRejectBusinessReg = async () => {
    if (!rejectBusinessTarget) return;
    if (!rejectReason.trim()) {
      Toast.show({ type: 'error', text1: t('admin.partnerNeedReason') });
      return;
    }
    try {
      setBusinessBusyId(rejectBusinessTarget.businessId);
      await rejectBusiness(rejectBusinessTarget.businessId, rejectReason.trim());
      Toast.show({ type: 'success', text1: t('admin.partnerRejected') });
      setRejectBusinessTarget(null);
      setRejectReason('');
      await load();
    } catch (error) {
      Toast.show({ type: 'error', text1: error instanceof Error ? error.message : t('admin.saveError') });
    } finally {
      setBusinessBusyId(null);
    }
  };

  const handleLogout = async () => {
    await clearAdminSession();
    await clearBackendAdminPortal();
    await clearAuthSession();
    onLogout();
  };

  const renderPermissionGate = (needsRelogin: boolean) => (
    <View style={styles.emptyCard}>
      <Ionicons name={needsRelogin ? 'key-outline' : 'lock-closed-outline'} size={28} color={Colors.textMuted} />
      <Text style={styles.emptyTitle}>
        {needsRelogin ? t('admin.staleTokenTitle') : t('admin.noPermission')}
      </Text>
      <Text style={styles.sectionHint}>
        {needsRelogin ? t('admin.staleTokenHint') : t('admin.permGateHint')}
      </Text>
      {needsRelogin ? (
        <TouchableOpacity style={styles.reloginBtn} onPress={handleLogout} activeOpacity={0.88}>
          <Text style={styles.reloginBtnText}>{t('admin.reloginAction')}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );

  const handleBackendUserStatus = async (userId: string, status: BackendUserStatus) => {
    if (backendUserBusyId) return;
    setBackendUserBusyId(userId);
    try {
      const updated = await updateBackendUserStatus(userId, status);
      setBackendUsers(prev => prev.map(u => (u.userId === userId ? updated : u)));
      Toast.show({ type: 'success', text1: t('admin.backendUserStatusUpdated') });
      await reloadAuditLogs();
      if (dashboard) {
        try {
          setDashboard(await fetchAdminDashboard());
        } catch {
          /* ignore */
        }
      }
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: err instanceof Error ? err.message : t('admin.saveError'),
      });
    } finally {
      setBackendUserBusyId(null);
    }
  };

  const backendStatusLabel = (status: BackendUserStatus) => {
    if (status === 'Active') return t('admin.active');
    if (status === 'Inactive') return t('admin.inactive');
    return t('admin.banned');
  };

  const pendingReportCount = useMemo(
    () => reports.filter(r => r.status === 'Pending').length,
    [reports],
  );

  const filteredReports = useMemo(() => {
    if (reportFilter === 'all') return reports;
    return reports.filter(r => r.status === reportFilter);
  }, [reports, reportFilter]);

  const reportStatusLabel = (status: ReportStatus) => {
    const map: Record<ReportStatus, string> = {
      Pending: t('admin.reportsStatusPending'),
      Reviewed: t('admin.reportsStatusReviewed'),
      Resolved: t('admin.reportsStatusResolved'),
      Dismissed: t('admin.reportsStatusDismissed'),
    };
    return map[status] ?? status;
  };

  const reportTargetLabel = (targetType: ReportTargetType) => {
    const map: Record<ReportTargetType, string> = {
      Post: t('admin.reportsTargetPost'),
      User: t('admin.reportsTargetUser'),
      Comment: t('admin.reportsTargetComment'),
      Place: t('admin.reportsTargetPlace'),
      Review: t('admin.reportsTargetReview'),
    };
    return map[targetType] ?? targetType;
  };

  const handleReportStatus = async (reportId: string, status: ReportStatus) => {
    if (reportBusyId) return;
    setReportBusyId(reportId);
    try {
      const updated = await updateAdminReportStatus(reportId, status);
      setReports(prev => prev.map(r => (r.reportId === reportId ? updated : r)));
      Toast.show({ type: 'success', text1: t('admin.reportsUpdated') });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: err instanceof Error ? err.message : t('admin.reportsUpdateError'),
      });
    } finally {
      setReportBusyId(null);
    }
  };

  const reloadPayments = useCallback(async () => {
    if (!(await isBackendAdminSession())) return;
    try {
      setPayments(await listAdminPayments());
    } catch {
      setPayments([]);
    }
  }, []);

  const reloadAuditLogs = useCallback(async (action: AdminAuditAction | 'all' = auditActionFilter) => {
    if (!(await isBackendAdminSession())) return;
    try {
      const auditPage = await fetchAdminAuditLogs({
        action: action === 'all' ? undefined : action,
        pageSize: 80,
      });
      setAuditLogs(auditPage.items);
      setAuditSummary(auditPage.summary);
      setAuditTotalCount(auditPage.totalCount);
    } catch {
      setAuditLogs([]);
      setAuditTotalCount(0);
    }
  }, [auditActionFilter]);

  const auditEntityLabel = useCallback(
    (entityName: string) => {
      switch (entityName) {
        case 'ProductPackage':
          return t('admin.auditEntityProductPackage');
        case 'UserPremiumOrder':
          return t('admin.auditEntityUserPremiumOrder');
        case 'BusinessAdCampaign':
          return t('admin.auditEntityBusinessAdCampaign');
        case 'Business':
          return t('admin.auditEntityBusiness');
        case 'Place':
          return t('admin.auditEntityPlace');
        case 'Report':
          return t('admin.auditEntityReport');
        case 'User':
          return t('admin.auditEntityUser');
        default:
          return entityName;
      }
    },
    [t],
  );

  const auditActionLabel = useCallback(
    (action: AdminAuditAction) => {
      switch (action) {
        case 'Create':
          return t('admin.auditActionCreate');
        case 'Delete':
          return t('admin.auditActionDelete');
        default:
          return t('admin.auditActionUpdate');
      }
    },
    [t],
  );

  const handleConfirmPayment = async (item: AdminPaymentItem) => {
    if (paymentBusyId) return;
    setPaymentBusyId(item.id);
    try {
      if (item.kind === 'premium') {
        await confirmAdminPremiumPayment(item.id);
      } else {
        await confirmAdminCampaignPayment(item.id);
      }
      Toast.show({ type: 'success', text1: t('admin.paymentsConfirmed') });
      await reloadPayments();
      await reloadAuditLogs();
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: err instanceof Error ? err.message : t('admin.paymentsConfirmError'),
      });
    } finally {
      setPaymentBusyId(null);
    }
  };

  const paymentStatusLabel = useCallback(
    (status: AdminPaymentStatus) => {
      switch (status) {
        case 'Pending':
          return t('admin.paymentsStatusPending');
        case 'Success':
          return t('admin.paymentsStatusSuccess');
        case 'Failed':
          return t('admin.paymentsStatusFailed');
        case 'Refunded':
          return t('admin.paymentsStatusRefunded');
        default:
          return status;
      }
    },
    [t],
  );

  const paymentProductLabel = useCallback(
    (item: AdminPaymentItem) => {
      if (item.kind === 'premium') {
        if (item.productId === 'monthly') return t('premium.plan.monthly');
        if (item.productId === 'yearly') return t('premium.plan.yearly');
        return item.productId;
      }
      try {
        return t(getPackageById(item.productId as B2bPackageId).nameKey);
      } catch {
        return item.productId;
      }
    },
    [t],
  );

  const filteredPayments = useMemo(() => {
    if (paymentFilter === 'Pending') {
      return payments.filter(p => p.paymentStatus === 'Pending');
    }
    return payments;
  }, [payments, paymentFilter]);

  const pendingPaymentCount = useMemo(
    () => payments.filter(p => p.paymentStatus === 'Pending').length,
    [payments],
  );

  const b2cPackages = useMemo(
    () => adminPackages.filter(p => p.segment === 'B2C').sort((a, b) => a.sortOrder - b.sortOrder),
    [adminPackages],
  );

  const b2bPackages = useMemo(
    () => adminPackages.filter(p => p.segment === 'B2B').sort((a, b) => a.sortOrder - b.sortOrder),
    [adminPackages],
  );

  const adminPackageTitle = useCallback(
    (pkg: AdminProductPackage) => {
      if (pkg.displayName?.trim()) return pkg.displayName.trim();
      if (pkg.segment === 'B2C') {
        if (pkg.code === 'monthly') return t('premium.plan.monthly');
        if (pkg.code === 'yearly') return t('premium.plan.yearly');
      }
      if (pkg.segment === 'B2B') {
        try {
          return t(getPackageById(pkg.code as B2bPackageId).nameKey);
        } catch {
          return pkg.code;
        }
      }
      return pkg.code;
    },
    [t],
  );

  const openPackageEdit = (pkg: AdminProductPackage) => {
    setPackageEdit(pkg);
    setPackageFormPrice(String(Math.round(pkg.priceVnd)));
    setPackageFormDuration(pkg.durationDays != null ? String(pkg.durationDays) : '');
    setPackageFormDisplayName(pkg.displayName ?? '');
    setPackageFormActive(pkg.isActive);
  };

  const handleSavePackage = async () => {
    if (!packageEdit) return;
    if (!isValidProductPackageId(packageEdit.productPackageId)) {
      Toast.show({ type: 'error', text1: t('admin.packagesReloadHint') });
      return;
    }
    const priceVnd = parseAdminVndInput(packageFormPrice);
    if (!Number.isFinite(priceVnd) || priceVnd <= 0) {
      Toast.show({ type: 'error', text1: t('admin.packagesPriceInvalid') });
      return;
    }
    let durationDays: number | null = null;
    if (packageEdit.segment === 'B2C') {
      durationDays = Math.round(parseAdminVndInput(packageFormDuration));
      if (!Number.isFinite(durationDays) || durationDays < 1) {
        Toast.show({ type: 'error', text1: t('admin.packagesDurationInvalid') });
        return;
      }
    }
    setPackageSaving(true);
    try {
      const updated = await updateAdminProductPackage(packageEdit.productPackageId, {
        priceVnd,
        durationDays,
        displayName: packageFormDisplayName.trim() || null,
        isActive: packageFormActive,
      });
      setAdminPackages(prev =>
        prev.map(p => (p.productPackageId === updated.productPackageId ? updated : p)),
      );
      invalidateProductCatalogCache();
      Toast.show({ type: 'success', text1: t('admin.packagesSaved') });
      setPackageEdit(null);
      await reloadAuditLogs();
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: err instanceof Error ? err.message : t('admin.packagesSaveError'),
      });
    } finally {
      setPackageSaving(false);
    }
  };

  const resetPackageCreateForm = () => {
    setPackageCreateCode('');
    setPackageCreatePrice('');
    setPackageCreateDuration('30');
    setPackageCreateBillingUnit('campaign');
    setPackageCreateDisplayName('');
    setPackageCreateSort('10');
  };

  const openPackageCreate = () => {
    resetPackageCreateForm();
    setPackageCreateBillingUnit(packageSegmentTab === 'B2B' ? 'campaign' : 'day');
    setPackageCreateOpen(true);
  };

  const handleCreatePackage = async () => {
    const code = packageCreateCode.trim().toLowerCase().replace(/\s+/g, '_');
    if (!code) {
      Toast.show({ type: 'error', text1: t('admin.packagesCreateCodeRequired') });
      return;
    }
    const priceVnd = parseAdminVndInput(packageCreatePrice);
    if (!Number.isFinite(priceVnd) || priceVnd <= 0) {
      Toast.show({ type: 'error', text1: t('admin.packagesPriceInvalid') });
      return;
    }
    const sortOrder = Math.round(parseAdminVndInput(packageCreateSort));
    if (!Number.isFinite(sortOrder)) {
      Toast.show({ type: 'error', text1: t('admin.packagesCreateSortInvalid') });
      return;
    }
    let durationDays: number | null = null;
    let billingUnit: 'campaign' | 'day' | null = null;
    if (packageSegmentTab === 'B2C') {
      durationDays = Math.round(parseAdminVndInput(packageCreateDuration));
      if (!Number.isFinite(durationDays) || durationDays < 1) {
        Toast.show({ type: 'error', text1: t('admin.packagesDurationInvalid') });
        return;
      }
    } else {
      billingUnit = packageCreateBillingUnit;
    }
    setPackageSaving(true);
    try {
      const created = await createAdminProductPackage({
        segment: packageSegmentTab,
        code,
        displayName: packageCreateDisplayName.trim() || null,
        priceVnd,
        durationDays,
        billingUnit,
        isActive: true,
        sortOrder,
      });
      setAdminPackages(prev => [...prev, created].sort((a, b) => a.sortOrder - b.sortOrder));
      invalidateProductCatalogCache();
      Toast.show({ type: 'success', text1: t('admin.packagesCreated') });
      setPackageCreateOpen(false);
      await reloadAuditLogs();
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: err instanceof Error ? err.message : t('admin.packagesSaveError'),
      });
    } finally {
      setPackageSaving(false);
    }
  };

  const handleDeletePackage = async () => {
    if (!packageDeleteTarget) return;
    setPackageSaving(true);
    try {
      await deleteAdminProductPackage(packageDeleteTarget.productPackageId);
      setAdminPackages(prev => prev.filter(p => p.productPackageId !== packageDeleteTarget.productPackageId));
      invalidateProductCatalogCache();
      Toast.show({ type: 'success', text1: t('admin.packagesDeleted') });
      setPackageDeleteTarget(null);
      await reloadAuditLogs();
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: err instanceof Error ? err.message : t('admin.packagesSaveError'),
      });
    } finally {
      setPackageSaving(false);
    }
  };

  const renderAdminPackageCard = (pkg: AdminProductPackage, icon: 'star' | 'megaphone', tint: string, iconColor: string) => (
    <View key={pkg.productPackageId} style={[styles.userCard, !pkg.isActive && styles.packageCardInactive]}>
      <View style={styles.userTop}>
        <View style={[styles.avatar, { backgroundColor: tint }]}>
          <Ionicons name={icon} size={18} color={iconColor} />
        </View>
        <View style={styles.userMeta}>
          <Text style={styles.userName}>{adminPackageTitle(pkg)}</Text>
          <Text style={styles.userHandle}>{formatVnd(pkg.priceVnd, lang)}</Text>
          {pkg.segment === 'B2C' && pkg.durationDays ? (
            <Text style={styles.userEmail}>
              {t('admin.packagesDurationDays').replace('{n}', String(pkg.durationDays))}
            </Text>
          ) : null}
          {pkg.segment === 'B2B' && pkg.billingUnit ? (
            <Text style={styles.userEmail}>
              {pkg.billingUnit === 'day' ? t('admin.packagesPerDay') : t('admin.packagesPerCampaign')}
            </Text>
          ) : null}
          <Text style={styles.userEmail}>
            {pkg.isActive ? t('admin.packagesStatusActive') : t('admin.packagesStatusInactive')} · {pkg.code}
          </Text>
        </View>
        <View style={styles.packageCardActions}>
          <TouchableOpacity style={styles.packageEditBtn} onPress={() => openPackageEdit(pkg)}>
            <Ionicons name="create-outline" size={18} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.packageEditBtn} onPress={() => setPackageDeleteTarget(pkg)}>
            <Ionicons name="trash-outline" size={18} color="#B91C1C" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const permLabel = (p: Permission) => t(`admin.perm.${p}`);
  const permDesc = (p: Permission) => t(`admin.permDesc.${p}`);
  const groupLabel = (g: PermissionGroupId) => t(`admin.group.${g}`);

  const tabs: { id: Tab; icon: React.ComponentProps<typeof Ionicons>['name']; label: string }[] = [
    { id: 'overview', icon: 'grid-outline', label: t('admin.tabOverview') },
    { id: 'users', icon: 'people-outline', label: t('admin.tabUsers') },
    { id: 'partners', icon: 'storefront-outline', label: t('admin.tabPartners') },
    ...(reportsBackend
      ? [{ id: 'reports' as Tab, icon: 'flag-outline' as const, label: t('admin.tabReports') }]
      : canViewReports
        ? [{ id: 'reports' as Tab, icon: 'flag-outline' as const, label: t('admin.tabReports') }]
        : []),
    ...(reportsBackend
      ? [
          { id: 'packages' as Tab, icon: 'cube-outline' as const, label: t('admin.tabPackages') },
          { id: 'payments' as Tab, icon: 'card-outline' as const, label: t('admin.tabPayments') },
          { id: 'audit' as Tab, icon: 'document-text-outline' as const, label: t('admin.tabAudit') },
          { id: 'settings' as Tab, icon: 'settings-outline' as const, label: t('admin.tabSettings') },
        ]
      : []),
    { id: 'roles', icon: 'git-branch-outline', label: t('admin.tabActors') },
    { id: 'myperms', icon: 'shield-checkmark-outline', label: t('admin.tabMyPerms') },
  ];

  useEffect(() => {
    const x = tabLayoutX.current[tab];
    if (x == null) return;
    tabScrollRef.current?.scrollTo({ x: Math.max(0, x - 12), animated: true });
  }, [tab]);

  useEffect(() => {
    if (tab !== 'audit') return;
    void reloadAuditLogs(auditActionFilter);
  }, [tab, auditActionFilter, reloadAuditLogs]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <LinearGradient colors={Gradients.primary} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.headerEyebrow}>{t('admin.badge')}</Text>
            <Text style={styles.headerTitle}>{t('admin.dashboardTitle')}</Text>
            <Text style={styles.headerSub}>
              {session.username} · {roleName(session.roleId)} · {permissions.length}/{ALL_PERMISSIONS.length} {t('admin.permsShort')}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => setLang(lang === 'vi' ? 'en' : 'vi')}
              style={styles.headerIconBtn}
            >
              <Text style={styles.langChip}>{lang === 'vi' ? 'VI' : 'EN'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogout} style={styles.headerIconBtn}>
              <Ionicons name="log-out-outline" size={18} color={Colors.white} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.tabsScrollWrap}>
          <ScrollView
            ref={tabScrollRef}
            horizontal
            nestedScrollEnabled
            directionalLockEnabled
            showsHorizontalScrollIndicator
            decelerationRate="fast"
            style={styles.tabsScroll}
            contentContainerStyle={styles.tabsRow}
            keyboardShouldPersistTaps="handled"
          >
            {tabs.map(item => (
              <TouchableOpacity
                key={item.id}
                style={[styles.tabBtn, tab === item.id && styles.tabBtnActive]}
                onPress={() => setTab(item.id)}
                activeOpacity={0.85}
                onLayout={e => {
                  tabLayoutX.current[item.id] = e.nativeEvent.layout.x;
                }}
              >
                <Ionicons
                  name={item.icon}
                  size={15}
                  color={tab === item.id ? Colors.primary : 'rgba(255,255,255,0.9)'}
                />
                <Text style={[styles.tabText, tab === item.id && styles.tabTextActive]} numberOfLines={1}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View pointerEvents="none" style={styles.tabsScrollFade} />
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {tab === 'overview' && (
            <>
              {reportsBackend && staleAdminToken ? renderPermissionGate(true) : null}
              {reportsBackend && !staleAdminToken && dashboard ? (
                <AdminLiveOverview
                  data={dashboard}
                  onOpenTab={next => setTab(next)}
                />
              ) : null}

              {reportsBackend && !staleAdminToken && !dashboard ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="analytics-outline" size={28} color={Colors.textMuted} />
                  <Text style={styles.emptyTitle}>{t('admin.overviewLoadFailed')}</Text>
                  <Text style={styles.sectionHint}>{t('admin.overviewLoadFailedHint')}</Text>
                </View>
              ) : null}

              {!reportsBackend ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="cloud-offline-outline" size={28} color={Colors.textMuted} />
                  <Text style={styles.emptyTitle}>{t('admin.billingBackendOnly')}</Text>
                </View>
              ) : null}
            </>
          )}

          {tab === 'users' && (
            <>
              {!canViewUsers ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="lock-closed-outline" size={28} color={Colors.textMuted} />
                  <Text style={styles.emptyTitle}>{t('admin.noPermission')}</Text>
                </View>
              ) : staleAdminToken ? (
                renderPermissionGate(true)
              ) : reportsBackend ? (
                <>
                  <Text style={styles.sectionTitle}>{t('admin.backendUsersTitle')}</Text>
                  <Text style={styles.countText}>{t('admin.backendUsersHint')}</Text>
                  <View style={[styles.toolbar, { marginTop: 8 }]}>
                    <View style={styles.searchRow}>
                      <Ionicons name="search-outline" size={16} color={Colors.primary} />
                      <TextInput
                        value={search}
                        onChangeText={setSearch}
                        placeholder={t('admin.searchUsers')}
                        placeholderTextColor={Colors.textMuted}
                        style={styles.searchInput}
                        onSubmitEditing={() => void load()}
                      />
                    </View>
                  </View>
                  {backendUsers.length === 0 ? (
                    <View style={styles.emptyCard}>
                      <Ionicons name="people-outline" size={28} color={Colors.textMuted} />
                      <Text style={styles.emptyTitle}>{t('admin.emptyUsers')}</Text>
                    </View>
                  ) : (
                    backendUsers.map(u => (
                      <View key={u.userId} style={styles.userCard}>
                        <View style={styles.userTop}>
                          <View style={[styles.avatar, { backgroundColor: Colors.primarySoft }]}>
                            <Text style={[styles.avatarText, { color: Colors.primary }]}>
                              {(u.displayName ?? u.username).slice(0, 1).toUpperCase()}
                            </Text>
                          </View>
                          <View style={styles.userMeta}>
                            <Text style={styles.userName}>{u.displayName ?? u.username}</Text>
                            <Text style={styles.userHandle}>@{u.username} · {u.roleName}</Text>
                            <Text style={styles.userEmail}>{u.email}</Text>
                            <Text style={styles.userEmail}>
                              {backendStatusLabel(u.status)} · {formatDate(u.createdAt, lang)}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.partnerActions}>
                          {(['Active', 'Inactive', 'Banned'] as BackendUserStatus[]).map(st => (
                            <TouchableOpacity
                              key={st}
                              style={[
                                styles.chip,
                                u.status === st && styles.chipActive,
                                { marginRight: 6 },
                              ]}
                              disabled={backendUserBusyId === u.userId}
                              onPress={() => void handleBackendUserStatus(u.userId, st)}
                            >
                              <Text style={[styles.chipText, u.status === st && styles.chipTextActive]}>
                                {backendStatusLabel(st)}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    ))
                  )}
                </>
              ) : (
                <View style={styles.emptyCard}>
                  <Ionicons name="cloud-offline-outline" size={28} color={Colors.textMuted} />
                  <Text style={styles.emptyTitle}>{t('admin.billingBackendOnly')}</Text>
                </View>
              )}
            </>
          )}

          {tab === 'reports' && (
            <>
              {reportsBackend && staleAdminToken ? renderPermissionGate(true) : null}
              {!staleAdminToken && !canViewReports ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="lock-closed-outline" size={28} color={Colors.textMuted} />
                  <Text style={styles.emptyTitle}>{t('admin.noPermission')}</Text>
                </View>
              ) : !reportsBackend ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="cloud-offline-outline" size={28} color={Colors.textMuted} />
                  <Text style={styles.emptyTitle}>{t('admin.reportsBackendOnly')}</Text>
                </View>
              ) : staleAdminToken || !canViewReports ? null : (
                <>
                  <View style={[styles.chipsRow, { marginBottom: 12 }]}>
                    <TouchableOpacity
                      style={[styles.chip, reportFilter === 'Pending' && styles.chipActive]}
                      onPress={() => setReportFilter('Pending')}
                    >
                      <Text style={[styles.chipText, reportFilter === 'Pending' && styles.chipTextActive]}>
                        {t('admin.reportsFilterPending')} ({pendingReportCount})
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.chip, reportFilter === 'all' && styles.chipActive]}
                      onPress={() => setReportFilter('all')}
                    >
                      <Text style={[styles.chipText, reportFilter === 'all' && styles.chipTextActive]}>
                        {t('admin.reportsFilterAll')} ({reports.length})
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {filteredReports.length === 0 ? (
                    <View style={styles.emptyCard}>
                      <Ionicons name="flag-outline" size={28} color={Colors.textMuted} />
                      <Text style={styles.emptyTitle}>{t('admin.reportsEmpty')}</Text>
                    </View>
                  ) : (
                    filteredReports.map(report => (
                      <View key={report.reportId} style={styles.userCard}>
                        <View style={styles.userTop}>
                          <View style={[styles.avatar, { backgroundColor: '#FEE2E2' }]}>
                            <Ionicons name="flag" size={18} color="#EF4444" />
                          </View>
                          <View style={styles.userMeta}>
                            <Text style={styles.userName}>
                              {reportTargetLabel(report.targetType)} · {reportStatusLabel(report.status)}
                            </Text>
                            <Text style={styles.userHandle} numberOfLines={2}>
                              {report.targetSummary || report.targetId}
                            </Text>
                            <Text style={styles.userEmail}>
                              {t('admin.reportsReporter')}: {report.reporterDisplayName || report.reporterId}
                            </Text>
                            <Text style={styles.detailItemText}>
                              {t('admin.reportsReason')}: {report.reason}
                            </Text>
                            <Text style={styles.userEmail}>{formatDate(report.createdAt, lang)}</Text>
                          </View>
                        </View>
                        {report.status !== 'Resolved' && report.status !== 'Dismissed' ? (
                          <View style={styles.partnerActions}>
                            {report.status === 'Pending' ? (
                              <TouchableOpacity
                                style={styles.approveBtn}
                                disabled={reportBusyId === report.reportId}
                                onPress={() => handleReportStatus(report.reportId, 'Reviewed')}
                              >
                                {reportBusyId === report.reportId ? (
                                  <ActivityIndicator color={Colors.white} />
                                ) : (
                                  <Text style={styles.approveBtnText} numberOfLines={2}>{t('admin.reportsMarkReviewed')}</Text>
                                )}
                              </TouchableOpacity>
                            ) : null}
                            <TouchableOpacity
                              style={styles.approveBtn}
                              disabled={reportBusyId === report.reportId}
                              onPress={() => handleReportStatus(report.reportId, 'Resolved')}
                            >
                              <Text style={styles.approveBtnText} numberOfLines={2}>{t('admin.reportsResolve')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.rejectBtn}
                              disabled={reportBusyId === report.reportId}
                              onPress={() => handleReportStatus(report.reportId, 'Dismissed')}
                            >
                              <Text style={styles.rejectBtnText} numberOfLines={2}>{t('admin.reportsDismiss')}</Text>
                            </TouchableOpacity>
                          </View>
                        ) : null}
                      </View>
                    ))
                  )}
                </>
              )}
            </>
          )}

          {tab === 'packages' && (
            <>
              {!reportsBackend ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="cloud-offline-outline" size={28} color={Colors.textMuted} />
                  <Text style={styles.emptyTitle}>{t('admin.billingBackendOnly')}</Text>
                </View>
              ) : staleAdminToken || !canUseBilling ? (
                renderPermissionGate(staleAdminToken)
              ) : (
                <>
                  <TouchableOpacity style={styles.addUserBtn} activeOpacity={0.88} onPress={openPackageCreate}>
                    <LinearGradient colors={Gradients.primary} style={styles.addUserGrad}>
                      <Ionicons name="add" size={18} color={Colors.white} />
                      <Text style={styles.addUserText}>{t('admin.packagesCreate')}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  <View style={[styles.chipsRow, { marginBottom: 12 }]}>
                    <TouchableOpacity
                      style={[styles.chip, packageSegmentTab === 'B2C' && styles.chipActive]}
                      onPress={() => setPackageSegmentTab('B2C')}
                    >
                      <Text style={[styles.chipText, packageSegmentTab === 'B2C' && styles.chipTextActive]}>
                        {t('admin.packagesTabB2c')} ({b2cPackages.length})
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.chip, packageSegmentTab === 'B2B' && styles.chipActive]}
                      onPress={() => setPackageSegmentTab('B2B')}
                    >
                      <Text style={[styles.chipText, packageSegmentTab === 'B2B' && styles.chipTextActive]}>
                        {t('admin.packagesTabB2b')} ({b2bPackages.length})
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {packageSegmentTab === 'B2C' ? (
                    <>
                      <Text style={styles.sectionTitle}>{t('admin.packagesPremiumSection')}</Text>
                      <Text style={styles.sectionHint}>{t('admin.packagesManageHintB2c')}</Text>
                      {b2cPackages.length === 0 ? (
                        <View style={styles.emptyCard}>
                          <Text style={styles.emptyTitle}>{t('admin.packagesSegmentEmpty')}</Text>
                        </View>
                      ) : (
                        b2cPackages.map(pkg => renderAdminPackageCard(pkg, 'star', '#FEF3C7', '#D97706'))
                      )}
                    </>
                  ) : (
                    <>
                      <Text style={styles.sectionTitle}>{t('admin.packagesVibeMapSection')}</Text>
                      <Text style={styles.sectionHint}>{t('admin.packagesManageHintB2b')}</Text>
                      {b2bPackages.length === 0 ? (
                        <View style={styles.emptyCard}>
                          <Text style={styles.emptyTitle}>{t('admin.packagesSegmentEmpty')}</Text>
                        </View>
                      ) : (
                        b2bPackages.map(pkg => renderAdminPackageCard(pkg, 'megaphone', '#EDE9FE', Colors.primary))
                      )}
                    </>
                  )}
                </>
              )}
            </>
          )}

          {tab === 'payments' && (
            <>
              {!reportsBackend ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="cloud-offline-outline" size={28} color={Colors.textMuted} />
                  <Text style={styles.emptyTitle}>{t('admin.billingBackendOnly')}</Text>
                </View>
              ) : staleAdminToken || !canUseBilling ? (
                renderPermissionGate(staleAdminToken)
              ) : (
                <>
                  <View style={[styles.chipsRow, { marginBottom: 12 }]}>
                    <TouchableOpacity
                      style={[styles.chip, paymentSubTab === 'overview' && styles.chipActive]}
                      onPress={() => setPaymentSubTab('overview')}
                    >
                      <Text style={[styles.chipText, paymentSubTab === 'overview' && styles.chipTextActive]}>
                        {t('admin.paymentsTabOverview')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.chip, paymentSubTab === 'list' && styles.chipActive]}
                      onPress={() => setPaymentSubTab('list')}
                    >
                      <Text style={[styles.chipText, paymentSubTab === 'list' && styles.chipTextActive]}>
                        {t('admin.paymentsTabList')} ({payments.length})
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {paymentSubTab === 'overview' ? (
                    payments.length === 0 ? (
                      <View style={styles.emptyCard}>
                        <Ionicons name="analytics-outline" size={28} color={Colors.textMuted} />
                        <Text style={styles.emptyTitle}>{t('admin.paymentsEmpty')}</Text>
                      </View>
                    ) : (
                      <AdminPaymentAnalytics payments={payments} />
                    )
                  ) : null}

                  {paymentSubTab === 'list' ? (
                    <>
                      <View style={[styles.chipsRow, { marginBottom: 12 }]}>
                        <TouchableOpacity
                          style={[styles.chip, paymentFilter === 'Pending' && styles.chipActive]}
                          onPress={() => setPaymentFilter('Pending')}
                        >
                          <Text style={[styles.chipText, paymentFilter === 'Pending' && styles.chipTextActive]}>
                            {t('admin.paymentsFilterPending')} ({pendingPaymentCount})
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.chip, paymentFilter === 'all' && styles.chipActive]}
                          onPress={() => setPaymentFilter('all')}
                        >
                          <Text style={[styles.chipText, paymentFilter === 'all' && styles.chipTextActive]}>
                            {t('admin.paymentsFilterAll')} ({payments.length})
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {filteredPayments.length === 0 ? (
                        <View style={styles.emptyCard}>
                          <Ionicons name="card-outline" size={28} color={Colors.textMuted} />
                          <Text style={styles.emptyTitle}>{t('admin.paymentsEmpty')}</Text>
                        </View>
                      ) : (
                        filteredPayments.map(item => (
                      <View key={`${item.kind}-${item.id}`} style={styles.userCard}>
                        <View style={styles.userTop}>
                          <View
                            style={[
                              styles.avatar,
                              { backgroundColor: item.kind === 'premium' ? '#FEF3C7' : '#EDE9FE' },
                            ]}
                          >
                            <Ionicons
                              name={item.kind === 'premium' ? 'star' : 'megaphone'}
                              size={18}
                              color={item.kind === 'premium' ? '#D97706' : Colors.primary}
                            />
                          </View>
                          <View style={styles.userMeta}>
                            <Text style={styles.userName}>
                              {item.kind === 'premium'
                                ? t('admin.paymentsKindPremium')
                                : t('admin.paymentsKindCampaign')}{' '}
                              · {paymentStatusLabel(item.paymentStatus)}
                            </Text>
                            <Text style={styles.userHandle}>{paymentProductLabel(item)}</Text>
                            <Text style={styles.userEmail}>{formatVnd(item.amountVnd, lang)}</Text>
                            <Text style={styles.detailItemText}>
                              {t('admin.paymentsTransferRef')}: {item.transferReferenceCode}
                            </Text>
                            {item.payerDeclaredReference ? (
                              <Text style={styles.detailItemText}>
                                {t('admin.paymentsPayerRef')}: {item.payerDeclaredReference}
                              </Text>
                            ) : null}
                            {item.kind === 'campaign' && item.businessName ? (
                              <Text style={styles.userEmail}>
                                {item.businessName}
                                {item.placeName ? ` · ${item.placeName}` : ''}
                              </Text>
                            ) : null}
                            {(item.payerDisplayName || item.payerEmail) ? (
                              <Text style={styles.userEmail}>
                                {item.payerDisplayName || item.payerEmail}
                              </Text>
                            ) : null}
                            <Text style={styles.userEmail}>{formatDate(item.createdAt, lang)}</Text>
                          </View>
                        </View>
                        {item.paymentStatus === 'Pending' ? (
                          <View style={styles.partnerActions}>
                            <TouchableOpacity
                              style={styles.approveBtn}
                              disabled={paymentBusyId === item.id}
                              onPress={() => handleConfirmPayment(item)}
                            >
                              {paymentBusyId === item.id ? (
                                <ActivityIndicator color={Colors.white} />
                              ) : (
                                <Text style={styles.approveBtnText}>{t('admin.paymentsConfirm')}</Text>
                              )}
                            </TouchableOpacity>
                          </View>
                        ) : null}
                      </View>
                        ))
                      )}
                    </>
                  ) : null}
                </>
              )}
            </>
          )}

          {tab === 'settings' && (
            <>
              {!reportsBackend ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="cloud-offline-outline" size={28} color={Colors.textMuted} />
                  <Text style={styles.emptyTitle}>{t('admin.billingBackendOnly')}</Text>
                </View>
              ) : staleAdminToken || !canManageSettingsPerm ? (
                renderPermissionGate(staleAdminToken)
              ) : (
                <AdminSettingsPanel
                  overview={serverOverview}
                  loading={settingsLoading}
                  error={settingsError}
                />
              )}
            </>
          )}

          {tab === 'audit' && (
            <>
              {!reportsBackend ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="cloud-offline-outline" size={28} color={Colors.textMuted} />
                  <Text style={styles.emptyTitle}>{t('admin.billingBackendOnly')}</Text>
                </View>
              ) : staleAdminToken || !canUseAudit ? (
                renderPermissionGate(staleAdminToken)
              ) : (
                <AdminAuditLogPanel
                  items={auditLogs}
                  summary={auditSummary}
                  totalCount={auditTotalCount}
                  actionFilter={auditActionFilter}
                  onActionFilter={setAuditActionFilter}
                  subTab={auditSubTab}
                  onSubTab={setAuditSubTab}
                  entityLabel={auditEntityLabel}
                  actionLabel={auditActionLabel}
                />
              )}
            </>
          )}

          {tab === 'partners' && (
            <>
              <Text style={styles.sectionTitle}>{t('admin.tabPartners')}</Text>
              {!reportsBackend ? (
                <View style={[styles.emptyCard, { marginBottom: 12 }]}>
                  <Ionicons name="cloud-offline-outline" size={28} color={Colors.textMuted} />
                  <Text style={styles.emptyTitle}>{t('admin.billingBackendOnly')}</Text>
                </View>
              ) : null}
              {reportsBackend ? (
              <>
              <TouchableOpacity
                style={styles.partnerQueueBtn}
                activeOpacity={0.88}
                onPress={() => setPartnerQueueModal('business')}
              >
                <View style={[styles.partnerQueueIcon, { backgroundColor: '#EDE9FE' }]}>
                  <Ionicons name="briefcase-outline" size={22} color={Colors.primary} />
                </View>
                <View style={styles.partnerQueueText}>
                  <Text style={styles.partnerQueueTitle}>{t('admin.partnersBusinessBox')}</Text>
                  <Text style={styles.partnerQueueSub} numberOfLines={1}>{t('admin.partnersTapToOpen')}</Text>
                </View>
                <View style={styles.partnerQueueBadge}>
                  <Text style={styles.partnerQueueBadgeText}>{pendingBusinesses.length}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.partnerQueueBtn}
                activeOpacity={0.88}
                onPress={() => setPartnerQueueModal('place')}
              >
                <View style={[styles.partnerQueueIcon, { backgroundColor: '#DCFCE7' }]}>
                  <Ionicons name="location-outline" size={22} color="#16A34A" />
                </View>
                <View style={styles.partnerQueueText}>
                  <Text style={styles.partnerQueueTitle}>{t('admin.partnersPlaceBox')}</Text>
                  <Text style={styles.partnerQueueSub} numberOfLines={1}>{t('admin.partnersTapToOpen')}</Text>
                </View>
                <View style={[styles.partnerQueueBadge, { backgroundColor: '#DCFCE7' }]}>
                  <Text style={[styles.partnerQueueBadgeText, { color: '#16A34A' }]}>{pendingPlaces.length}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
              </TouchableOpacity>
              </>
              ) : null}
            </>
          )}

          {tab === 'roles' && (
            <>
              {!canViewRoles ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="lock-closed-outline" size={28} color={Colors.textMuted} />
                  <Text style={styles.emptyTitle}>{t('admin.noPermission')}</Text>
                </View>
              ) : (
                <>
                  <Text style={styles.sectionTitle}>{t('admin.rbacJwtTitle')}</Text>
                  <Text style={styles.countText}>{t('admin.rbacJwtHint')}</Text>
                  {PERMISSION_GROUPS.map(group => {
                    const items = permissionsByGroup(group);
                    return (
                      <View key={group} style={styles.groupBlock}>
                        <Text style={styles.groupTitle}>{groupLabel(group)}</Text>
                        {items.map(meta => {
                          const checked = permissions.includes(meta.id);
                          return (
                            <View key={meta.id} style={styles.permRow}>
                              <View style={styles.permInfo}>
                                <Text style={styles.permName}>{permLabel(meta.id)}</Text>
                                <Text style={styles.permCode}>{meta.id}</Text>
                              </View>
                              <Ionicons
                                name={checked ? 'checkmark-circle' : 'close-circle-outline'}
                                size={20}
                                color={checked ? Colors.activeGreen : Colors.textMuted}
                              />
                            </View>
                          );
                        })}
                      </View>
                    );
                  })}
                </>
              )}
            </>
          )}

          {tab === 'myperms' && (
            <>
              <View style={styles.myCard}>
                <Text style={styles.myTitle}>{t('admin.mySession')}</Text>
                <Text style={styles.myLine}>
                  {t('admin.username')}: <Text style={styles.myStrong}>{session.username}</Text>
                </Text>
                <Text style={styles.myLine}>
                  {t('admin.actor')}: <Text style={styles.myStrong}>{roleName(session.roleId)}</Text>
                </Text>
                <Text style={styles.myLine}>
                  {t('admin.loggedInAt')}:{' '}
                  <Text style={styles.myStrong}>{formatDate(session.loggedInAt, lang)}</Text>
                </Text>
                <Text style={styles.myLine}>
                  {t('admin.matrixEnabled')}:{' '}
                  <Text style={styles.myStrong}>
                    {permissions.length}/{ALL_PERMISSIONS.length}
                  </Text>
                </Text>
              </View>

              {PERMISSION_GROUPS.map(group => {
                const items = permissionsByGroup(group);
                return (
                  <View key={group} style={styles.groupBlock}>
                    <Text style={styles.groupTitle}>{groupLabel(group)}</Text>
                    {items.map(meta => {
                      const ok = permissions.includes(meta.id);
                      return (
                        <View key={meta.id} style={styles.myPermRow}>
                          <Ionicons
                            name={ok ? 'checkmark-circle' : 'close-circle'}
                            size={18}
                            color={ok ? Colors.activeGreen : '#E11D48'}
                          />
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={styles.permName}>{permLabel(meta.id)}</Text>
                            <Text style={styles.permDesc}>{permDesc(meta.id)}</Text>
                          </View>
                          <Text style={[styles.accessTag, ok ? styles.accessOn : styles.accessOff]}>
                            {ok ? t('admin.allowed') : t('admin.denied')}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                );
              })}
            </>
          )}
        </ScrollView>
      )}

      <Modal
        visible={partnerQueueModal === 'business'}
        animationType="slide"
        onRequestClose={() => setPartnerQueueModal(null)}
      >
        <View style={[styles.queueModalRoot, { paddingTop: insets.top + 8 }]}>
          <View style={styles.queueModalHeader}>
            <TouchableOpacity onPress={() => setPartnerQueueModal(null)} hitSlop={12}>
              <Ionicons name="close" size={26} color={Colors.textDark} />
            </TouchableOpacity>
            <Text style={styles.queueModalTitle}>{t('admin.partnersBusinessBox')}</Text>
            <View style={{ width: 26 }} />
          </View>
          <Text style={styles.queueModalHint}>{t('admin.partnersBusinessBoxHint')}</Text>
          <ScrollView contentContainerStyle={styles.queueModalScroll} showsVerticalScrollIndicator={false}>
            {pendingBusinesses.length === 0 ? (
              <View style={styles.partnerPanelEmpty}>
                <Ionicons name="checkmark-done-outline" size={28} color={Colors.textMuted} />
                <Text style={styles.partnerPanelEmptyText}>{t('admin.partnersBusinessEmpty')}</Text>
              </View>
            ) : (
              pendingBusinesses.map(biz => (
                <View key={biz.businessId} style={styles.userCard}>
                  <View style={styles.userTop}>
                    <View style={[styles.avatar, { backgroundColor: Colors.primarySoft }]}>
                      <Ionicons name="storefront" size={18} color={Colors.primary} />
                    </View>
                    <View style={styles.userMeta}>
                      <Text style={styles.userName}>{biz.name}</Text>
                      <Text style={styles.userHandle}>{biz.ownerDisplayName ?? biz.ownerEmail}</Text>
                      <Text style={styles.userEmail}>{biz.phone ?? '—'} · {biz.ownerEmail}</Text>
                      <Text style={styles.businessTag}>{biz.address ?? '—'}</Text>
                    </View>
                  </View>
                  {biz.latitude != null && biz.longitude != null ? (
                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={() => {
                        Linking.openURL(`https://www.google.com/maps?q=${biz.latitude},${biz.longitude}`);
                      }}
                      style={styles.businessMapWrap}
                    >
                      <Image
                        source={{ uri: businessMapUrl(biz.latitude, biz.longitude) }}
                        style={styles.businessMap}
                        resizeMode="cover"
                      />
                      <View style={styles.businessMapLabel}>
                        <Ionicons name="location" size={14} color={Colors.white} />
                        <Text style={styles.businessMapLabelText}>{t('admin.businessMap')}</Text>
                      </View>
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.businessNoLocation}>{t('admin.businessNoLocation')}</Text>
                  )}
                  <View style={styles.partnerActions}>
                    <TouchableOpacity
                      style={styles.approveBtn}
                      disabled={businessBusyId === biz.businessId}
                      onPress={async () => {
                        try {
                          setBusinessBusyId(biz.businessId);
                          await approveBusiness(biz.businessId);
                          Toast.show({
                            type: 'success',
                            text1: 'Business approved',
                            text2: 'Owner must log in again for Business role',
                          });
                          await load();
                        } catch (e) {
                          Toast.show({ type: 'error', text1: e instanceof Error ? e.message : 'Failed' });
                        } finally {
                          setBusinessBusyId(null);
                        }
                      }}
                    >
                      {businessBusyId === biz.businessId ? (
                        <ActivityIndicator color={Colors.white} />
                      ) : (
                        <Text style={styles.approveBtnText}>{t('admin.partnerApprove')}</Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.rejectBtn}
                      onPress={() => {
                        setRejectBusinessTarget(biz);
                        setRejectReason('');
                      }}
                    >
                      <Text style={styles.rejectBtnText}>{t('admin.partnerReject')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={partnerQueueModal === 'place'}
        animationType="slide"
        onRequestClose={() => setPartnerQueueModal(null)}
      >
        <View style={[styles.queueModalRoot, { paddingTop: insets.top + 8 }]}>
          <View style={styles.queueModalHeader}>
            <TouchableOpacity onPress={() => setPartnerQueueModal(null)} hitSlop={12}>
              <Ionicons name="close" size={26} color={Colors.textDark} />
            </TouchableOpacity>
            <Text style={styles.queueModalTitle}>{t('admin.partnersPlaceBox')}</Text>
            <View style={{ width: 26 }} />
          </View>
          <Text style={styles.queueModalHint}>{t('admin.partnersPlaceBoxHint')}</Text>
          <ScrollView contentContainerStyle={styles.queueModalScroll} showsVerticalScrollIndicator={false}>
            {pendingPlaces.length === 0 ? (
              <View style={styles.partnerPanelEmpty}>
                <Ionicons name="map-outline" size={28} color={Colors.textMuted} />
                <Text style={styles.partnerPanelEmptyText}>{t('admin.partnersPlaceEmpty')}</Text>
              </View>
            ) : (
              pendingPlaces.map(place => (
                <View key={place.placeId} style={styles.userCard}>
                  <View style={styles.userTop}>
                    <View style={[styles.avatar, { backgroundColor: '#DCFCE7' }]}>
                      <Ionicons name="location" size={18} color="#16A34A" />
                    </View>
                    <View style={styles.userMeta}>
                      <Text style={styles.userName}>{place.name}</Text>
                      <Text style={styles.userHandle}>{place.businessName}</Text>
                      <Text style={styles.userEmail}>{place.address ?? '—'}</Text>
                      <Text style={styles.businessTag}>{place.categoryName ?? place.status}</Text>
                    </View>
                  </View>
                  <View style={styles.partnerActions}>
                    <TouchableOpacity
                      style={styles.approveBtn}
                      disabled={placeBusyId === place.placeId}
                      onPress={async () => {
                        try {
                          setPlaceBusyId(place.placeId);
                          await approvePlace(place.placeId);
                          Toast.show({ type: 'success', text1: 'Place approved' });
                          await load();
                        } catch (e) {
                          Toast.show({ type: 'error', text1: e instanceof Error ? e.message : 'Failed' });
                        } finally {
                          setPlaceBusyId(null);
                        }
                      }}
                    >
                      {placeBusyId === place.placeId ? (
                        <ActivityIndicator color={Colors.white} />
                      ) : (
                        <Text style={styles.approveBtnText}>{t('admin.partnerApprove')}</Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.rejectBtn}
                      onPress={async () => {
                        try {
                          setPlaceBusyId(place.placeId);
                          await rejectPlace(place.placeId);
                          Toast.show({ type: 'info', text1: 'Place rejected' });
                          await load();
                        } catch (e) {
                          Toast.show({ type: 'error', text1: e instanceof Error ? e.message : 'Failed' });
                        } finally {
                          setPlaceBusyId(null);
                        }
                      }}
                    >
                      <Text style={styles.rejectBtnText}>{t('admin.partnerReject')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={!!packageEdit}
        transparent
        animationType="fade"
        onRequestClose={() => !packageSaving && setPackageEdit(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('admin.packagesEditTitle')}</Text>
            {packageEdit ? (
              <>
                <Text style={styles.formHint}>
                  {packageEdit.segment === 'B2C' ? t('admin.packagesPremiumSection') : t('admin.packagesVibeMapSection')}
                  {' · '}
                  {adminPackageTitle(packageEdit)}
                </Text>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>{t('admin.packagesDisplayName')}</Text>
                  <TextInput
                    value={packageFormDisplayName}
                    onChangeText={setPackageFormDisplayName}
                    placeholder={adminPackageTitle(packageEdit)}
                    placeholderTextColor={Colors.textMuted}
                    style={styles.formInput}
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>{t('admin.packagesPrice')}</Text>
                  <Text style={styles.formHint}>{t('admin.packagesPriceHint')}</Text>
                  <TextInput
                    value={packageFormPrice}
                    onChangeText={setPackageFormPrice}
                    keyboardType="numeric"
                    placeholder="39000"
                    placeholderTextColor={Colors.textMuted}
                    style={styles.formInput}
                  />
                </View>
                {packageEdit.segment === 'B2C' ? (
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>{t('admin.packagesDurationLabel')}</Text>
                    <TextInput
                      value={packageFormDuration}
                      onChangeText={setPackageFormDuration}
                      keyboardType="numeric"
                      placeholder="30"
                      placeholderTextColor={Colors.textMuted}
                      style={styles.formInput}
                    />
                  </View>
                ) : null}
                <View style={[styles.formGroup, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                  <Text style={styles.formLabel}>{t('admin.packagesActive')}</Text>
                  <Switch value={packageFormActive} onValueChange={setPackageFormActive} />
                </View>
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.modalCancel}
                    disabled={packageSaving}
                    onPress={() => setPackageEdit(null)}
                  >
                    <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalSave}
                    disabled={packageSaving}
                    onPress={handleSavePackage}
                    activeOpacity={0.88}
                  >
                    <LinearGradient colors={Gradients.primary} style={styles.modalSaveGrad}>
                      {packageSaving ? (
                        <ActivityIndicator color={Colors.white} />
                      ) : (
                        <Text style={styles.modalSaveText}>{t('common.save')}</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal
        visible={packageCreateOpen}
        transparent
        animationType="fade"
        onRequestClose={() => !packageSaving && setPackageCreateOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('admin.packagesCreateTitle')}</Text>
            <Text style={styles.formHint}>
              {packageSegmentTab === 'B2C' ? t('admin.packagesPremiumSection') : t('admin.packagesVibeMapSection')}
            </Text>
            <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{t('admin.packagesCreateCode')}</Text>
                <TextInput
                  value={packageCreateCode}
                  onChangeText={setPackageCreateCode}
                  placeholder="monthly"
                  placeholderTextColor={Colors.textMuted}
                  style={styles.formInput}
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{t('admin.packagesDisplayName')}</Text>
                <TextInput
                  value={packageCreateDisplayName}
                  onChangeText={setPackageCreateDisplayName}
                  placeholderTextColor={Colors.textMuted}
                  style={styles.formInput}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{t('admin.packagesPrice')}</Text>
                <TextInput
                  value={packageCreatePrice}
                  onChangeText={setPackageCreatePrice}
                  keyboardType="numeric"
                  placeholderTextColor={Colors.textMuted}
                  style={styles.formInput}
                />
              </View>
              {packageSegmentTab === 'B2C' ? (
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>{t('admin.packagesDurationLabel')}</Text>
                  <TextInput
                    value={packageCreateDuration}
                    onChangeText={setPackageCreateDuration}
                    keyboardType="numeric"
                    placeholderTextColor={Colors.textMuted}
                    style={styles.formInput}
                  />
                </View>
              ) : (
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>{t('admin.packagesBillingUnit')}</Text>
                  <View style={styles.chipsRow}>
                    {(['campaign', 'day'] as const).map(u => (
                      <TouchableOpacity
                        key={u}
                        style={[styles.chip, packageCreateBillingUnit === u && styles.chipActive]}
                        onPress={() => setPackageCreateBillingUnit(u)}
                      >
                        <Text style={[styles.chipText, packageCreateBillingUnit === u && styles.chipTextActive]}>
                          {u === 'day' ? t('admin.packagesPerDay') : t('admin.packagesPerCampaign')}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{t('admin.packagesCreateSort')}</Text>
                <TextInput
                  value={packageCreateSort}
                  onChangeText={setPackageCreateSort}
                  keyboardType="numeric"
                  placeholderTextColor={Colors.textMuted}
                  style={styles.formInput}
                />
              </View>
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                disabled={packageSaving}
                onPress={() => setPackageCreateOpen(false)}
              >
                <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSave}
                disabled={packageSaving}
                onPress={handleCreatePackage}
                activeOpacity={0.88}
              >
                <LinearGradient colors={Gradients.primary} style={styles.modalSaveGrad}>
                  {packageSaving ? (
                    <ActivityIndicator color={Colors.white} />
                  ) : (
                    <Text style={styles.modalSaveText}>{t('admin.packagesCreate')}</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!packageDeleteTarget}
        transparent
        animationType="fade"
        onRequestClose={() => !packageSaving && setPackageDeleteTarget(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('admin.packagesDeleteTitle')}</Text>
            <Text style={styles.deleteBody}>
              {t('admin.packagesDeleteBody').replace(
                '{name}',
                packageDeleteTarget ? adminPackageTitle(packageDeleteTarget) : '',
              )}
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setPackageDeleteTarget(null)}
                disabled={packageSaving}
              >
                <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtn} onPress={handleDeletePackage} disabled={packageSaving}>
                {packageSaving ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.deleteBtnText}>{t('admin.delete')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!rejectBusinessTarget}
        transparent
        animationType="fade"
        onRequestClose={() => setRejectBusinessTarget(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('admin.partnerRejectReason')}</Text>
            <TextInput
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder={t('admin.partnerRejectReason')}
              placeholderTextColor={Colors.textMuted}
              style={styles.rejectInput}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setRejectBusinessTarget(null)}
              >
                <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtn} onPress={handleRejectBusinessReg}>
                <Text style={styles.deleteBtnText}>{t('admin.partnerReject')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.primaryTint,
    ...Platform.select({
      web: {
        maxWidth: APP_MAX_WIDTH,
        width: '100%',
        marginHorizontal: 'auto',
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: '#F2DAF0',
        minHeight: '100vh' as unknown as number,
      },
      default: {},
    }),
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  headerEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.white,
  },
  headerSub: {
    marginTop: 4,
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
  },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  langChip: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: 11,
  },
  tabsScrollWrap: {
    position: 'relative',
    marginHorizontal: -16,
  },
  tabsScroll: {
    flexGrow: 0,
    ...Platform.select({
      web: {
        overflowX: 'auto',
        overflowY: 'hidden',
        cursor: 'grab',
        // @ts-expect-error RN Web scrollbar styling
        scrollbarWidth: 'thin',
        // @ts-expect-error RN Web scrollbar styling
        scrollbarColor: 'rgba(255,255,255,0.55) transparent',
      },
      default: {},
    }),
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingRight: 28,
    paddingBottom: 4,
  },
  tabsScrollFade: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 4,
    width: 28,
    ...Platform.select({
      web: {
        backgroundImage: 'linear-gradient(to left, rgba(124,58,237,0.85), transparent)',
      },
      default: {
        backgroundColor: 'transparent',
      },
    }),
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  tabBtnActive: { backgroundColor: Colors.white },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
  },
  tabTextActive: { color: Colors.primary },
  content: { padding: 16, paddingBottom: 48, gap: 10 },
  reloginBtn: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: Colors.primarySoft,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  reloginBtnText: { fontSize: 12, fontWeight: '800', color: Colors.primary, textAlign: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textDark,
    marginTop: 6,
    marginBottom: 2,
  },
  sectionHint: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 10,
    lineHeight: 18,
  },
  packageCardInactive: { opacity: 0.55 },
  packageCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  packageEditBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    width: '47%' as unknown as number,
    flexGrow: 1,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.primarySoft,
    ...Shadows.soft,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '900',
    color: Colors.primary,
  },
  statLabel: {
    marginTop: 4,
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  roleStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.primarySoft,
  },
  roleDot: { width: 10, height: 10, borderRadius: 5 },
  roleDotSm: { width: 8, height: 8, borderRadius: 4, marginBottom: 4 },
  roleStatName: { fontSize: 13, fontWeight: '800', color: Colors.textDark },
  roleStatDesc: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  roleStatCount: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleStatCountText: { fontWeight: '800', color: Colors.primary, fontSize: 12 },
  roleStatPerms: { fontSize: 11, color: Colors.textMuted, fontWeight: '700', width: 40, textAlign: 'right' },
  moduleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  moduleCard: {
    width: '47%' as unknown as number,
    flexGrow: 1,
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.primarySoft,
  },
  moduleTitle: { fontSize: 13, fontWeight: '800', color: Colors.textDark },
  moduleCount: { fontSize: 11, color: Colors.textMuted, marginTop: 4, marginBottom: 8 },
  moduleBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primarySoft,
    overflow: 'hidden',
  },
  moduleBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  quickLink: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.primarySoft,
  },
  quickLinkText: { flex: 1, fontWeight: '700', color: Colors.primary, fontSize: 13 },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
  addUserBtn: { marginBottom: 12, borderRadius: 12, overflow: 'hidden' },
  addUserGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  addUserText: { color: Colors.white, fontSize: 13, fontWeight: '800' },
  searchRow: {
    flex: 1,
    flexBasis: 200,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'web' ? 10 : 8,
    borderWidth: 1,
    borderColor: Colors.primarySoft,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.textDark },
  addBtn: { flexShrink: 0, borderRadius: 14, overflow: 'hidden', ...Shadows.soft },
  addBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  addBtnText: { color: Colors.white, fontWeight: '800', fontSize: 13 },
  filterLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 4,
  },
  chipsScroll: { marginBottom: 2 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.primarySoft,
    marginRight: 8,
  },
  chipActive: { backgroundColor: Colors.primarySoft, borderColor: Colors.primary },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
  chipText: { fontSize: 12, fontWeight: '600', color: Colors.textMid },
  chipTextActive: { color: Colors.primaryDark, fontWeight: '800' },
  countText: { fontSize: 12, color: Colors.textMuted, fontWeight: '600' },
  userCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.primarySoft,
    ...Shadows.soft,
  },
  userTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '800' },
  userMeta: { flex: 1, minWidth: 0 },
  userName: { fontSize: 15, fontWeight: '800', color: Colors.textDark },
  userHandle: { fontSize: 12, color: Colors.primary, marginTop: 2, fontWeight: '600' },
  userEmail: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  businessMapWrap: {
    marginTop: 12,
    borderRadius: 14,
    overflow: 'hidden',
    height: 150,
    backgroundColor: Colors.primarySoft,
  },
  businessMap: { width: '100%', height: 150 },
  businessMapLabel: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(42,23,88,0.72)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  businessMapLabelText: { color: Colors.white, fontSize: 12, fontWeight: '700' },
  businessNoLocation: { marginTop: 10, fontSize: 12, color: Colors.textMuted },
  businessTag: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  partnerQueueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.primarySoft,
    ...Shadows.soft,
  },
  partnerQueueIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerQueueText: { flex: 1 },
  partnerQueueTitle: { fontSize: 15, fontWeight: '800', color: Colors.textDark },
  partnerQueueSub: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  partnerQueueBadge: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  partnerQueueBadgeText: { fontSize: 12, fontWeight: '900', color: Colors.primary },
  queueModalRoot: { flex: 1, backgroundColor: Colors.primaryTint },
  queueModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  queueModalTitle: { flex: 1, fontSize: 17, fontWeight: '900', color: Colors.textDark, textAlign: 'center' },
  queueModalHint: {
    fontSize: 12,
    color: Colors.textMuted,
    paddingHorizontal: 20,
    paddingBottom: 12,
    lineHeight: 18,
  },
  queueModalScroll: { paddingHorizontal: 16, paddingBottom: 40, gap: 10 },
  partnerPanelEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 10,
  },
  partnerPanelEmptyText: { fontSize: 13, color: Colors.textMuted, fontWeight: '600', textAlign: 'center' },
  partnerActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  approveBtn: {
    flex: 1,
    flexBasis: '45%' as unknown as number,
    minWidth: 0,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  approveBtnText: { color: Colors.white, fontWeight: '800', fontSize: 12, textAlign: 'center' },
  rejectBtn: {
    flex: 1,
    flexBasis: '45%' as unknown as number,
    minWidth: 0,
    backgroundColor: '#FFE4E6',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  rejectBtnText: { color: '#E11D48', fontWeight: '800', fontSize: 12, textAlign: 'center' },
  rejectInput: {
    minHeight: 80,
    borderWidth: 1,
    borderColor: Colors.primarySoft,
    borderRadius: 14,
    padding: 12,
    color: Colors.textDark,
    marginTop: 10,
    textAlignVertical: 'top',
  },
  statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  statusActive: { backgroundColor: 'rgba(16,185,129,0.12)' },
  statusInactive: { backgroundColor: 'rgba(156,142,192,0.15)' },
  statusBanned: { backgroundColor: 'rgba(225,29,72,0.12)' },
  statusText: { fontSize: 11, fontWeight: '700' },
  statusTextActive: { color: Colors.activeGreen },
  statusTextInactive: { color: Colors.textMuted },
  statusTextBanned: { color: '#E11D48' },
  userDetailRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailItemText: { fontSize: 11, color: Colors.textMid, fontWeight: '600' },
  userBottom: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tapHint: { fontSize: 11, color: Colors.textMuted },
  rowActions: { flexDirection: 'row', gap: 6 },
  iconAction: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: Colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    alignItems: 'center',
    gap: 10,
    padding: 32,
    backgroundColor: Colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.primarySoft,
  },
  emptyTitle: { fontSize: 14, color: Colors.textMid, fontWeight: '600', textAlign: 'center' },
  rolePickCard: {
    width: 120,
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    marginRight: 8,
  },
  rolePickCardActive: { backgroundColor: Colors.primaryTint },
  rolePickName: { fontSize: 13, fontWeight: '800', color: Colors.textDark, marginTop: 8 },
  rolePickCount: { fontSize: 11, color: Colors.textMuted, marginTop: 4, fontWeight: '600' },
  matrixCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.primarySoft,
    ...Shadows.soft,
  },
  matrixHeader: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  matrixTitle: { fontSize: 17, fontWeight: '900', color: Colors.textDark },
  matrixDesc: { fontSize: 12, color: Colors.textMuted, marginTop: 4, lineHeight: 17 },
  lockedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryTint,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  lockedText: { fontSize: 11, color: Colors.textMuted, fontWeight: '700' },
  matrixSummary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F2DAF0',
  },
  matrixSummaryText: { fontSize: 12, fontWeight: '700', color: Colors.textMid },
  matrixQuick: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  matrixQuickText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  matrixQuickSep: { color: Colors.textMuted },
  groupBlock: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.primarySoft,
    marginBottom: 8,
  },
  groupHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, gap: 8 },
  groupTitle: { fontSize: 14, fontWeight: '800', color: Colors.textDark },
  groupSub: { fontSize: 11, color: Colors.textMuted, marginTop: 2, lineHeight: 15 },
  groupToggle: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: Colors.primaryTint,
  },
  groupToggleText: { fontSize: 11, fontWeight: '700', color: Colors.primary },
  permRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F2DAF0',
  },
  permInfo: { flex: 1, minWidth: 0, paddingRight: 12 },
  permTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  permName: { fontSize: 13, fontWeight: '700', color: Colors.textDark },
  permDesc: { fontSize: 11, color: Colors.textMuted, marginTop: 3, lineHeight: 15 },
  permCode: { fontSize: 10, color: Colors.primaryLight, marginTop: 3, fontWeight: '600' },
  levelPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  levelRead: { backgroundColor: 'rgba(14,165,233,0.12)' },
  levelWrite: { backgroundColor: 'rgba(16,185,129,0.12)' },
  levelDanger: { backgroundColor: 'rgba(225,29,72,0.12)' },
  levelText: { fontSize: 10, fontWeight: '800' },
  levelTextRead: { color: '#0284C7' },
  levelTextWrite: { color: '#059669' },
  levelTextDanger: { color: '#E11D48' },
  saveRoleBtn: { marginTop: 10, borderRadius: 14, overflow: 'hidden' },
  saveRoleGrad: { paddingVertical: 12, alignItems: 'center' },
  saveRoleText: { color: Colors.white, fontWeight: '800', fontSize: 13 },
  readOnlyNote: {
    marginTop: 10,
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    fontWeight: '600',
  },
  compareTable: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.primarySoft,
    overflow: 'hidden',
  },
  compareRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F2DAF0' },
  compareCell: {
    width: 88,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compareCorner: {
    width: 120,
    backgroundColor: Colors.primaryTint,
    alignItems: 'flex-start',
    paddingLeft: 10,
  },
  compareCornerText: { fontSize: 11, fontWeight: '800', color: Colors.textMid },
  compareHead: { backgroundColor: Colors.primaryTint },
  compareHeadText: { fontSize: 10, fontWeight: '800', color: Colors.textDark, textAlign: 'center' },
  compareLabel: {
    width: 120,
    alignItems: 'flex-start',
    paddingLeft: 10,
    backgroundColor: '#FBF9FF',
  },
  compareLabelText: { fontSize: 11, color: Colors.textDark, fontWeight: '600' },
  myCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.primarySoft,
    ...Shadows.soft,
  },
  myTitle: { fontSize: 15, fontWeight: '900', color: Colors.textDark, marginBottom: 8 },
  myLine: { fontSize: 13, color: Colors.textMid, marginBottom: 4 },
  myStrong: { fontWeight: '800', color: Colors.textDark },
  myPermRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F2DAF0',
  },
  accessTag: {
    flexShrink: 0,
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: 'hidden',
  },
  accessOn: { backgroundColor: 'rgba(16,185,129,0.12)', color: Colors.activeGreen },
  accessOff: { backgroundColor: 'rgba(225,29,72,0.1)', color: '#E11D48' },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: Colors.white,
    borderRadius: 22,
    padding: 18,
    maxHeight: '88%',
    ...Shadows.float,
    ...Platform.select({
      web: { maxWidth: 480, width: '100%', marginHorizontal: 'auto' },
      default: {},
    }),
  },
  modalTitle: { fontSize: 18, fontWeight: '900', color: Colors.textDark, marginBottom: 12 },
  modalScroll: { maxHeight: 420 },
  detailBlock: { gap: 8, marginBottom: 12 },
  detailField: {
    backgroundColor: Colors.primaryTint,
    borderRadius: 12,
    padding: 10,
  },
  detailLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, marginBottom: 2 },
  detailValue: { fontSize: 13, fontWeight: '700', color: Colors.textDark },
  miniPerm: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  miniPermText: { fontSize: 12, color: Colors.textMid, fontWeight: '600' },
  formGroup: { marginBottom: 10 },
  formLabel: { fontSize: 12, fontWeight: '700', color: Colors.textMid, marginBottom: 6 },
  formHint: { fontSize: 11, color: Colors.textMuted, marginBottom: 8, marginTop: -2 },
  formInput: {
    borderWidth: 1,
    borderColor: Colors.primarySoft,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.textDark,
    backgroundColor: Colors.primaryTint,
  },
  formInputMulti: { minHeight: 64, textAlignVertical: 'top' },
  roleOptions: { gap: 8 },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    backgroundColor: Colors.primaryTint,
  },
  roleOptionActive: { backgroundColor: Colors.primarySoft },
  roleOptionText: { fontSize: 13, fontWeight: '700', color: Colors.textMid },
  roleOptionTextActive: { color: Colors.primaryDark, fontWeight: '900' },
  roleOptionDesc: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  modalCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: Colors.primaryTint,
  },
  modalCancelText: { fontWeight: '700', color: Colors.textMid },
  modalSave: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  modalSaveGrad: { paddingVertical: 12, alignItems: 'center' },
  modalSaveText: { color: Colors.white, fontWeight: '800' },
  banBtn: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(225,29,72,0.1)',
  },
  banBtnText: { color: '#E11D48', fontWeight: '800' },
  deleteBody: { fontSize: 14, color: Colors.textMid, lineHeight: 20, marginBottom: 8 },
  deleteBtn: {
    flex: 1,
    backgroundColor: '#E11D48',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  deleteBtnText: { color: Colors.white, fontWeight: '800' },
});
