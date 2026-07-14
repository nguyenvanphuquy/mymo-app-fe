import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Modal, Platform, ActivityIndicator, Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { Colors, Gradients, Shadows } from '../constants/colors';
import { useI18n } from '../i18n';
import {
  ADMIN_BOOTSTRAP,
  ALL_PERMISSIONS,
  ActorId,
  AdminRole,
  AdminSession,
  AdminUser,
  AdminUserStatus,
  PERMISSION_CATALOG,
  PERMISSION_GROUPS,
  Permission,
  PermissionGroupId,
  canAccessAdminPortal,
  canManageActors,
  canManageUsers,
  clearAdminSession,
  createAdminUser,
  deleteAdminUser,
  getSessionPermissions,
  listAdminRoles,
  listAdminUsers,
  permissionsByGroup,
  updateAdminUser,
  updateRolePermissions,
} from '../services/adminApi';

type Tab = 'overview' | 'users' | 'roles' | 'myperms';

interface AdminScreenProps {
  session: AdminSession;
  onLogout: () => void;
}

type UserForm = {
  username: string;
  email: string;
  displayName: string;
  phone: string;
  roleId: ActorId;
  businessName: string;
  password: string;
  status: AdminUserStatus;
  notes: string;
};

const emptyForm = (defaultRoleId: ActorId = 'user'): UserForm => ({
  username: '',
  email: '',
  displayName: '',
  phone: '',
  roleId: defaultRoleId,
  businessName: '',
  password: '',
  status: 'active',
  notes: '',
});

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

export default function AdminScreen({ session, onLogout }: AdminScreenProps) {
  const { t, lang, setLang } = useI18n();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<string | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<AdminUserStatus | 'all'>('all');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm('user'));
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [detailUser, setDetailUser] = useState<AdminUser | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>('admin');

  const [roleDraft, setRoleDraft] = useState<Record<string, Permission[]>>({});
  const [savingRoleId, setSavingRoleId] = useState<string | null>(null);

  const portalOk = canAccessAdminPortal(permissions);
  const canManage = canManageUsers(permissions);
  const canViewUsers = portalOk || canManage;
  const canCreate = canManage;
  const canEdit = canManage;
  const canDelete = canManage;
  const canBan = canManage;
  const canViewRoles = portalOk || canManageActors(permissions);
  const canManageRoles = canManageActors(permissions);

  const roleMap = useMemo(() => {
    const m = new Map<string, AdminRole>();
    roles.forEach(r => m.set(r.id, r));
    return m;
  }, [roles]);

  const roleName = useCallback(
    (roleId: string) => roleMap.get(roleId)?.name ?? roleId,
    [roleMap],
  );

  const stats = useMemo(() => {
    const byStatus = {
      active: users.filter(u => u.status === 'active').length,
      inactive: users.filter(u => u.status === 'inactive').length,
      banned: users.filter(u => u.status === 'banned').length,
    };
    const byRole = roles.map(r => ({
      role: r,
      count: users.filter(u => u.roleId === r.id).length,
    }));
    return { byStatus, byRole, total: users.length };
  }, [users, roles]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [u, r, perms] = await Promise.all([
        listAdminUsers(),
        listAdminRoles(),
        getSessionPermissions(session),
      ]);
      setUsers(u);
      setRoles(r);
      setPermissions(perms);
      const draft: Record<string, Permission[]> = {};
      r.forEach(role => {
        draft[role.id] = [...role.permissions];
      });
      setRoleDraft(draft);
      if (!selectedRoleId && r.length) setSelectedRoleId(r[0].id);
    } catch {
      Toast.show({ type: 'error', text1: t('admin.loadError') });
    } finally {
      setLoading(false);
    }
  }, [session, t, selectedRoleId]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter(u => {
      if (filterRole !== 'all' && u.roleId !== filterRole) return false;
      if (filterStatus !== 'all' && u.status !== filterStatus) return false;
      if (!q) return true;
      return (
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.displayName.toLowerCase().includes(q) ||
        u.phone.toLowerCase().includes(q) ||
        roleName(u.roleId).toLowerCase().includes(q) ||
        u.notes.toLowerCase().includes(q)
      );
    });
  }, [users, search, filterRole, filterStatus, roleName]);

  const selectedRole = roles.find(r => r.id === selectedRoleId) ?? null;
  const selectedDraft = selectedRoleId ? roleDraft[selectedRoleId] ?? [] : [];

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm('user'));
    setFormOpen(true);
  };

  const openEdit = (user: AdminUser) => {
    setEditing(user);
    setDetailUser(null);
    setForm({
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      phone: user.phone,
      roleId: user.roleId,
      businessName: user.businessName,
      password: '',
      status: user.status,
      notes: user.notes,
    });
    setFormOpen(true);
  };

  const mapError = (code: string) => {
    const map: Record<string, string> = {
      VALIDATION: t('admin.validation'),
      BUSINESS_NAME_REQUIRED: t('admin.businessNameRequired'),
      USERNAME_EXISTS: t('admin.usernameExists'),
      EMAIL_EXISTS: t('admin.emailExists'),
      INVALID_ROLE: t('admin.invalidRole'),
      NOT_FOUND: t('admin.notFound'),
      CANNOT_DELETE_SELF: t('admin.cannotDeleteSelf'),
      CANNOT_DELETE_BOOTSTRAP: t('admin.cannotDeleteBootstrap'),
      ROLE_LOCKED: t('admin.roleLocked'),
    };
    return map[code] || t('admin.saveError');
  };

  const handleSaveUser = async () => {
    try {
      setSaving(true);
      if (editing) {
        await updateAdminUser({
          id: editing.id,
          username: form.username,
          email: form.email,
          displayName: form.displayName,
          phone: form.phone,
          roleId: form.roleId,
          businessName: form.businessName,
          status: form.status,
          notes: form.notes,
          password: form.password || undefined,
        });
        Toast.show({ type: 'success', text1: t('admin.userUpdated') });
      } else {
        await createAdminUser({
          username: form.username,
          email: form.email,
          displayName: form.displayName,
          phone: form.phone,
          roleId: form.roleId,
          businessName: form.businessName,
          password: form.password,
          status: form.status,
          notes: form.notes,
        });
        Toast.show({ type: 'success', text1: t('admin.userCreated') });
      }
      setFormOpen(false);
      await load();
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: mapError(err instanceof Error ? err.message : ''),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setSaving(true);
      await deleteAdminUser(deleteTarget.id, session);
      Toast.show({ type: 'success', text1: t('admin.userDeleted') });
      setDeleteTarget(null);
      setDetailUser(null);
      await load();
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: mapError(err instanceof Error ? err.message : '') || t('admin.deleteError'),
      });
    } finally {
      setSaving(false);
    }
  };

  const togglePerm = (roleId: string, perm: Permission) => {
    setRoleDraft(prev => {
      const current = prev[roleId] ?? [];
      const next = current.includes(perm)
        ? current.filter(p => p !== perm)
        : [...current, perm];
      return { ...prev, [roleId]: next };
    });
  };

  const setGroupPerms = (roleId: string, group: PermissionGroupId, enable: boolean) => {
    const groupPerms = permissionsByGroup(group).map(p => p.id);
    setRoleDraft(prev => {
      const current = new Set(prev[roleId] ?? []);
      groupPerms.forEach(p => {
        if (enable) current.add(p);
        else current.delete(p);
      });
      return { ...prev, [roleId]: [...current] };
    });
  };

  const saveRole = async (roleId: string) => {
    try {
      setSavingRoleId(roleId);
      await updateRolePermissions(roleId, roleDraft[roleId] ?? []);
      Toast.show({ type: 'success', text1: t('admin.roleSaved') });
      await load();
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: mapError(err instanceof Error ? err.message : ''),
      });
    } finally {
      setSavingRoleId(null);
    }
  };

  const handleLogout = async () => {
    await clearAdminSession();
    onLogout();
  };

  const statusLabel = (s: AdminUserStatus) => {
    if (s === 'active') return t('admin.active');
    if (s === 'inactive') return t('admin.inactive');
    return t('admin.banned');
  };

  const permLabel = (p: Permission) => t(`admin.perm.${p}`);
  const permDesc = (p: Permission) => t(`admin.permDesc.${p}`);
  const groupLabel = (g: PermissionGroupId) => t(`admin.group.${g}`);

  const tabs: { id: Tab; icon: React.ComponentProps<typeof Ionicons>['name']; label: string }[] = [
    { id: 'overview', icon: 'grid-outline', label: t('admin.tabOverview') },
    { id: 'users', icon: 'people-outline', label: t('admin.tabUsers') },
    { id: 'roles', icon: 'git-branch-outline', label: t('admin.tabActors') },
    { id: 'myperms', icon: 'shield-checkmark-outline', label: t('admin.tabMyPerms') },
  ];

  const segmentLabel = (segment: AdminRole['segment']) => t(`admin.segment.${segment}`);

  const renderStatusPill = (status: AdminUserStatus) => (
    <View
      style={[
        styles.statusPill,
        status === 'active' && styles.statusActive,
        status === 'inactive' && styles.statusInactive,
        status === 'banned' && styles.statusBanned,
      ]}
    >
      <Text
        style={[
          styles.statusText,
          status === 'active' && styles.statusTextActive,
          status === 'inactive' && styles.statusTextInactive,
          status === 'banned' && styles.statusTextBanned,
        ]}
      >
        {statusLabel(status)}
      </Text>
    </View>
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <LinearGradient colors={Gradients.primary} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
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

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
          {tabs.map(item => (
            <TouchableOpacity
              key={item.id}
              style={[styles.tabBtn, tab === item.id && styles.tabBtnActive]}
              onPress={() => setTab(item.id)}
              activeOpacity={0.85}
            >
              <Ionicons
                name={item.icon}
                size={15}
                color={tab === item.id ? Colors.primary : 'rgba(255,255,255,0.9)'}
              />
              <Text style={[styles.tabText, tab === item.id && styles.tabTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </LinearGradient>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {tab === 'overview' && (
            <>
              <Text style={styles.sectionTitle}>{t('admin.overviewStats')}</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{stats.total}</Text>
                  <Text style={styles.statLabel}>{t('admin.statTotalUsers')}</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={[styles.statValue, { color: Colors.activeGreen }]}>{stats.byStatus.active}</Text>
                  <Text style={styles.statLabel}>{t('admin.active')}</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={[styles.statValue, { color: Colors.textMuted }]}>{stats.byStatus.inactive}</Text>
                  <Text style={styles.statLabel}>{t('admin.inactive')}</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={[styles.statValue, { color: '#E11D48' }]}>{stats.byStatus.banned}</Text>
                  <Text style={styles.statLabel}>{t('admin.banned')}</Text>
                </View>
              </View>

              <Text style={styles.sectionTitle}>{t('admin.usersByActor')}</Text>
              {stats.byRole.map(({ role, count }) => (
                <View key={role.id} style={styles.roleStatRow}>
                  <View style={[styles.roleDot, { backgroundColor: role.color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.roleStatName}>{role.name}</Text>
                    <Text style={styles.roleStatDesc} numberOfLines={1}>
                      {segmentLabel(role.segment)} · {role.description}
                    </Text>
                  </View>
                  <View style={styles.roleStatCount}>
                    <Text style={styles.roleStatCountText}>{count}</Text>
                  </View>
                  <Text style={styles.roleStatPerms}>
                    {role.permissions.length}/{ALL_PERMISSIONS.length}
                  </Text>
                </View>
              ))}

              <Text style={styles.sectionTitle}>{t('admin.permissionModules')}</Text>
              <View style={styles.moduleGrid}>
                {PERMISSION_GROUPS.map(g => {
                  const items = permissionsByGroup(g);
                  const mine = items.filter(p => permissions.includes(p.id)).length;
                  return (
                    <View key={g} style={styles.moduleCard}>
                      <Text style={styles.moduleTitle}>{groupLabel(g)}</Text>
                      <Text style={styles.moduleCount}>
                        {mine}/{items.length} {t('admin.permsShort')}
                      </Text>
                      <View style={styles.moduleBar}>
                        <View
                          style={[
                            styles.moduleBarFill,
                            { width: `${items.length ? (mine / items.length) * 100 : 0}%` },
                          ]}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>

              <TouchableOpacity
                style={styles.quickLink}
                onPress={() => setTab('roles')}
                activeOpacity={0.85}
              >
                <Ionicons name="key-outline" size={18} color={Colors.primary} />
                <Text style={styles.quickLinkText}>{t('admin.openPermissionMatrix')}</Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
              </TouchableOpacity>
            </>
          )}

          {tab === 'users' && (
            <>
              {!canViewUsers ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="lock-closed-outline" size={28} color={Colors.textMuted} />
                  <Text style={styles.emptyTitle}>{t('admin.noPermission')}</Text>
                </View>
              ) : (
                <>
                  <View style={styles.toolbar}>
                    <View style={styles.searchRow}>
                      <Ionicons name="search-outline" size={16} color={Colors.primary} />
                      <TextInput
                        value={search}
                        onChangeText={setSearch}
                        placeholder={t('admin.searchUsers')}
                        placeholderTextColor={Colors.textMuted}
                        style={styles.searchInput}
                      />
                    </View>
                    {canCreate && (
                      <TouchableOpacity onPress={openCreate} style={styles.addBtn} activeOpacity={0.88}>
                        <LinearGradient colors={Gradients.primary} style={styles.addBtnGrad}>
                          <Ionicons name="add" size={18} color={Colors.white} />
                          <Text style={styles.addBtnText}>{t('admin.addUser')}</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    )}
                  </View>

                  <Text style={styles.filterLabel}>{t('admin.filterActor')}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                    <TouchableOpacity
                      style={[styles.chip, filterRole === 'all' && styles.chipActive]}
                      onPress={() => setFilterRole('all')}
                    >
                      <Text style={[styles.chipText, filterRole === 'all' && styles.chipTextActive]}>
                        {t('admin.filterAll')}
                      </Text>
                    </TouchableOpacity>
                    {roles.map(r => (
                      <TouchableOpacity
                        key={r.id}
                        style={[styles.chip, filterRole === r.id && styles.chipActive]}
                        onPress={() => setFilterRole(r.id)}
                      >
                        <View style={[styles.chipDot, { backgroundColor: r.color }]} />
                        <Text style={[styles.chipText, filterRole === r.id && styles.chipTextActive]}>
                          {r.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <Text style={styles.filterLabel}>{t('admin.filterStatus')}</Text>
                  <View style={styles.chipsRow}>
                    {(['all', 'active', 'inactive', 'banned'] as const).map(st => (
                      <TouchableOpacity
                        key={st}
                        style={[styles.chip, filterStatus === st && styles.chipActive]}
                        onPress={() => setFilterStatus(st)}
                      >
                        <Text style={[styles.chipText, filterStatus === st && styles.chipTextActive]}>
                          {st === 'all' ? t('admin.filterAll') : statusLabel(st)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.countText}>
                    {filteredUsers.length}/{users.length} {t('admin.usersCount')}
                  </Text>

                  {filteredUsers.map(user => {
                    const role = roleMap.get(user.roleId);
                    return (
                      <TouchableOpacity
                        key={user.id}
                        style={styles.userCard}
                        activeOpacity={0.9}
                        onPress={() => setDetailUser(user)}
                      >
                        <View style={styles.userTop}>
                          <View style={[styles.avatar, { backgroundColor: role?.color ? `${role.color}33` : Colors.primarySoft }]}>
                            <Text style={[styles.avatarText, { color: role?.color ?? Colors.primary }]}>
                              {user.displayName.slice(0, 1).toUpperCase()}
                            </Text>
                          </View>
                          <View style={styles.userMeta}>
                            <Text style={styles.userName}>{user.displayName}</Text>
                            <Text style={styles.userHandle}>@{user.username}</Text>
                            <Text style={styles.userEmail}>{user.email}</Text>
                            {user.roleId === 'business' && !!user.businessName && (
                              <Text style={styles.businessTag}>{user.businessName}</Text>
                            )}
                          </View>
                          {renderStatusPill(user.status)}
                        </View>

                        <View style={styles.userDetailRow}>
                          <View style={styles.detailItem}>
                            <Ionicons name="shield-outline" size={12} color={Colors.primary} />
                            <Text style={styles.detailItemText}>{roleName(user.roleId)}</Text>
                          </View>
                          <View style={styles.detailItem}>
                            <Ionicons name="time-outline" size={12} color={Colors.textMuted} />
                            <Text style={styles.detailItemText}>
                              {formatDate(user.lastLoginAt, lang)}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.userBottom}>
                          <Text style={styles.tapHint}>{t('admin.tapForDetail')}</Text>
                          <View style={styles.rowActions}>
                            {canEdit && (
                              <TouchableOpacity
                                style={styles.iconAction}
                                onPress={() => openEdit(user)}
                              >
                                <Ionicons name="create-outline" size={18} color={Colors.primary} />
                              </TouchableOpacity>
                            )}
                            {canDelete && user.username !== ADMIN_BOOTSTRAP.username && (
                              <TouchableOpacity
                                style={styles.iconAction}
                                onPress={() => setDeleteTarget(user)}
                              >
                                <Ionicons name="trash-outline" size={18} color="#E11D48" />
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </>
              )}
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
                  <Text style={styles.sectionTitle}>{t('admin.actorPicker')}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                    {roles.map(r => (
                      <TouchableOpacity
                        key={r.id}
                        style={[
                          styles.rolePickCard,
                          selectedRoleId === r.id && styles.rolePickCardActive,
                          { borderColor: selectedRoleId === r.id ? r.color : Colors.primarySoft },
                        ]}
                        onPress={() => setSelectedRoleId(r.id)}
                      >
                        <View style={[styles.roleDot, { backgroundColor: r.color }]} />
                        <Text style={styles.rolePickName}>{r.name}</Text>
                        <Text style={styles.rolePickCount}>{segmentLabel(r.segment)}</Text>
                        <Text style={styles.rolePickCount}>
                          {(roleDraft[r.id] ?? r.permissions).length}/{ALL_PERMISSIONS.length}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  {selectedRole && (
                    <View style={styles.matrixCard}>
                      <View style={styles.matrixHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.matrixTitle}>{selectedRole.name}</Text>
                          <Text style={styles.matrixDesc}>{selectedRole.description}</Text>
                        </View>
                        {selectedRole.locked && (
                          <View style={styles.lockedPill}>
                            <Ionicons name="lock-closed" size={12} color={Colors.textMuted} />
                            <Text style={styles.lockedText}>{t('admin.locked')}</Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.matrixSummary}>
                        <Text style={styles.matrixSummaryText}>
                          {t('admin.matrixEnabled')}: {selectedDraft.length}/{ALL_PERMISSIONS.length}
                        </Text>
                        {!selectedRole.locked && canManageRoles && (
                          <View style={styles.matrixQuick}>
                            <TouchableOpacity
                              onPress={() =>
                                setRoleDraft(prev => ({
                                  ...prev,
                                  [selectedRole.id]: [...ALL_PERMISSIONS],
                                }))
                              }
                            >
                              <Text style={styles.matrixQuickText}>{t('admin.selectAll')}</Text>
                            </TouchableOpacity>
                            <Text style={styles.matrixQuickSep}>·</Text>
                            <TouchableOpacity
                              onPress={() =>
                                setRoleDraft(prev => ({
                                  ...prev,
                                  [selectedRole.id]: [],
                                }))
                              }
                            >
                              <Text style={styles.matrixQuickText}>{t('admin.clearAll')}</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>

                      {PERMISSION_GROUPS.map(group => {
                        const items = permissionsByGroup(group);
                        const enabledCount = items.filter(p => selectedDraft.includes(p.id)).length;
                        const allOn = enabledCount === items.length;
                        const disabled = selectedRole.locked || !canManageRoles;

                        return (
                          <View key={group} style={styles.groupBlock}>
                            <View style={styles.groupHeader}>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.groupTitle}>{groupLabel(group)}</Text>
                                <Text style={styles.groupSub}>
                                  {enabledCount}/{items.length} · {t(`admin.groupDesc.${group}`)}
                                </Text>
                              </View>
                              {!disabled && (
                                <TouchableOpacity
                                  style={styles.groupToggle}
                                  onPress={() => setGroupPerms(selectedRole.id, group, !allOn)}
                                >
                                  <Text style={styles.groupToggleText}>
                                    {allOn ? t('admin.clearGroup') : t('admin.enableGroup')}
                                  </Text>
                                </TouchableOpacity>
                              )}
                            </View>

                            {items.map(meta => {
                              const checked = selectedDraft.includes(meta.id);
                              return (
                                <View key={meta.id} style={styles.permRow}>
                                  <View style={styles.permInfo}>
                                    <View style={styles.permTitleRow}>
                                      <Text style={styles.permName}>{permLabel(meta.id)}</Text>
                                      <View
                                        style={[
                                          styles.levelPill,
                                          meta.level === 'read' && styles.levelRead,
                                          meta.level === 'write' && styles.levelWrite,
                                          meta.level === 'danger' && styles.levelDanger,
                                        ]}
                                      >
                                        <Text
                                          style={[
                                            styles.levelText,
                                            meta.level === 'read' && styles.levelTextRead,
                                            meta.level === 'write' && styles.levelTextWrite,
                                            meta.level === 'danger' && styles.levelTextDanger,
                                          ]}
                                        >
                                          {t(`admin.level.${meta.level}`)}
                                        </Text>
                                      </View>
                                    </View>
                                    <Text style={styles.permDesc}>{permDesc(meta.id)}</Text>
                                    <Text style={styles.permCode}>{meta.id}</Text>
                                  </View>
                                  <Switch
                                    value={checked}
                                    onValueChange={() => togglePerm(selectedRole.id, meta.id)}
                                    disabled={disabled}
                                    trackColor={{ false: Colors.border, true: Colors.primarySoft }}
                                    thumbColor={checked ? Colors.primary : '#f4f3f4'}
                                  />
                                </View>
                              );
                            })}
                          </View>
                        );
                      })}

                      {canManageRoles && !selectedRole.locked && (
                        <TouchableOpacity
                          style={styles.saveRoleBtn}
                          onPress={() => saveRole(selectedRole.id)}
                          disabled={savingRoleId === selectedRole.id}
                          activeOpacity={0.88}
                        >
                          <LinearGradient colors={Gradients.primary} style={styles.saveRoleGrad}>
                            {savingRoleId === selectedRole.id ? (
                              <ActivityIndicator color={Colors.white} />
                            ) : (
                              <Text style={styles.saveRoleText}>{t('admin.savePermissions')}</Text>
                            )}
                          </LinearGradient>
                        </TouchableOpacity>
                      )}

                      {(!canManageRoles || selectedRole.locked) && (
                        <Text style={styles.readOnlyNote}>
                          {selectedRole.locked ? t('admin.roleLocked') : t('admin.rolesReadOnly')}
                        </Text>
                      )}
                    </View>
                  )}

                  <Text style={[styles.sectionTitle, { marginTop: 8 }]}>{t('admin.compareMatrix')}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.compareTable}>
                      <View style={styles.compareRow}>
                        <View style={[styles.compareCell, styles.compareCorner]}>
                          <Text style={styles.compareCornerText}>{t('admin.permission')}</Text>
                        </View>
                        {roles.map(r => (
                          <View key={r.id} style={[styles.compareCell, styles.compareHead]}>
                            <View style={[styles.roleDotSm, { backgroundColor: r.color }]} />
                            <Text style={styles.compareHeadText} numberOfLines={1}>{r.name}</Text>
                          </View>
                        ))}
                      </View>
                      {PERMISSION_CATALOG.map(meta => (
                        <View key={meta.id} style={styles.compareRow}>
                          <View style={[styles.compareCell, styles.compareLabel]}>
                            <Text style={styles.compareLabelText} numberOfLines={2}>
                              {permLabel(meta.id)}
                            </Text>
                          </View>
                          {roles.map(r => {
                            const on = (roleDraft[r.id] ?? r.permissions).includes(meta.id);
                            return (
                              <View key={r.id} style={styles.compareCell}>
                                <Ionicons
                                  name={on ? 'checkmark-circle' : 'ellipse-outline'}
                                  size={18}
                                  color={on ? Colors.activeGreen : Colors.border}
                                />
                              </View>
                            );
                          })}
                        </View>
                      ))}
                    </View>
                  </ScrollView>
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
                          <View style={{ flex: 1 }}>
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

      {/* User detail modal */}
      <Modal visible={!!detailUser} transparent animationType="fade" onRequestClose={() => setDetailUser(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {detailUser && (
              <>
                <Text style={styles.modalTitle}>{t('admin.userDetail')}</Text>
                <ScrollView style={styles.modalScroll}>
                  <View style={styles.detailBlock}>
                    {[
                      [t('admin.displayName'), detailUser.displayName],
                      [t('admin.username'), `@${detailUser.username}`],
                      [t('admin.email'), detailUser.email],
                      [t('admin.phone'), detailUser.phone || '—'],
                      [t('admin.actor'), roleName(detailUser.roleId)],
                      [t('admin.segmentLabel'), segmentLabel(roleMap.get(detailUser.roleId)?.segment ?? 'b2c')],
                      [t('admin.businessName'), detailUser.businessName || '—'],
                      [t('admin.status'), statusLabel(detailUser.status)],
                      [t('admin.createdAt'), formatDate(detailUser.createdAt, lang)],
                      [t('admin.lastLogin'), formatDate(detailUser.lastLoginAt, lang)],
                      [t('admin.notes'), detailUser.notes || '—'],
                    ].map(([label, value]) => (
                      <View key={String(label)} style={styles.detailField}>
                        <Text style={styles.detailLabel}>{label}</Text>
                        <Text style={styles.detailValue}>{value}</Text>
                      </View>
                    ))}
                  </View>

                      <Text style={styles.filterLabel}>{t('admin.actorPermissions')}</Text>
                  {(roleMap.get(detailUser.roleId)?.permissions ?? []).map(p => (
                    <View key={p} style={styles.miniPerm}>
                      <Ionicons name="checkmark" size={14} color={Colors.activeGreen} />
                      <Text style={styles.miniPermText}>{permLabel(p)}</Text>
                    </View>
                  ))}
                </ScrollView>

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.modalCancel} onPress={() => setDetailUser(null)}>
                    <Text style={styles.modalCancelText}>{t('common.done')}</Text>
                  </TouchableOpacity>
                  {canEdit && (
                    <TouchableOpacity
                      style={styles.modalSave}
                      onPress={() => openEdit(detailUser)}
                      activeOpacity={0.88}
                    >
                      <LinearGradient colors={Gradients.primary} style={styles.modalSaveGrad}>
                        <Text style={styles.modalSaveText}>{t('common.edit')}</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  )}
                </View>
                {canBan && detailUser.status !== 'banned' && detailUser.username !== ADMIN_BOOTSTRAP.username && (
                  <TouchableOpacity
                    style={styles.banBtn}
                    onPress={async () => {
                      try {
                        await updateAdminUser({ id: detailUser.id, status: 'banned' });
                        Toast.show({ type: 'success', text1: t('admin.userBanned') });
                        setDetailUser(null);
                        await load();
                      } catch (err) {
                        Toast.show({
                          type: 'error',
                          text1: mapError(err instanceof Error ? err.message : ''),
                        });
                      }
                    }}
                  >
                    <Text style={styles.banBtnText}>{t('admin.banUser')}</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Create / Edit modal */}
      <Modal visible={formOpen} transparent animationType="fade" onRequestClose={() => setFormOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {editing ? t('admin.editUser') : t('admin.addUser')}
            </Text>

            <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
              {(
                [
                  ['displayName', t('admin.displayName')],
                  ['username', t('admin.username')],
                  ['email', t('admin.email')],
                  ['phone', t('admin.phone')],
                  ['password', editing ? t('admin.passwordOptional') : t('admin.password')],
                  ['notes', t('admin.notes')],
                ] as const
              ).map(([key, label]) => (
                <View key={key} style={styles.formGroup}>
                  <Text style={styles.formLabel}>{label}</Text>
                  <TextInput
                    value={form[key]}
                    onChangeText={v => setForm(f => ({ ...f, [key]: v }))}
                    style={[styles.formInput, key === 'notes' && styles.formInputMulti]}
                    placeholderTextColor={Colors.textMuted}
                    autoCapitalize={key === 'displayName' || key === 'notes' ? 'sentences' : 'none'}
                    secureTextEntry={key === 'password'}
                    keyboardType={key === 'email' ? 'email-address' : key === 'phone' ? 'phone-pad' : 'default'}
                    multiline={key === 'notes'}
                  />
                </View>
              ))}

              <Text style={styles.formLabel}>{t('admin.actor')}</Text>
              <Text style={styles.formHint}>{t('admin.actorHint')}</Text>
              <View style={styles.roleOptions}>
                {roles.map(role => (
                  <TouchableOpacity
                    key={role.id}
                    style={[
                      styles.roleOption,
                      form.roleId === role.id && styles.roleOptionActive,
                      { borderColor: form.roleId === role.id ? role.color : Colors.primarySoft },
                    ]}
                    onPress={() =>
                      setForm(f => ({
                        ...f,
                        roleId: role.id,
                        businessName: role.id === 'business' ? f.businessName : '',
                      }))
                    }
                  >
                    <View style={[styles.chipDot, { backgroundColor: role.color }]} />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.roleOptionText,
                          form.roleId === role.id && styles.roleOptionTextActive,
                        ]}
                      >
                        {role.name}
                      </Text>
                      <Text style={styles.roleOptionDesc} numberOfLines={2}>
                        {segmentLabel(role.segment)} · {role.description}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              {form.roleId === 'business' && (
                <View style={[styles.formGroup, { marginTop: 12 }]}>
                  <Text style={styles.formLabel}>{t('admin.businessName')}</Text>
                  <TextInput
                    value={form.businessName}
                    onChangeText={v => setForm(f => ({ ...f, businessName: v }))}
                    style={styles.formInput}
                    placeholder={t('admin.businessNamePlaceholder')}
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
              )}

              <Text style={[styles.formLabel, { marginTop: 12 }]}>{t('admin.status')}</Text>
              <View style={styles.chipsRow}>
                {(['active', 'inactive', 'banned'] as const).map(st => (
                  <TouchableOpacity
                    key={st}
                    style={[styles.chip, form.status === st && styles.chipActive]}
                    onPress={() => setForm(f => ({ ...f, status: st }))}
                  >
                    <Text style={[styles.chipText, form.status === st && styles.chipTextActive]}>
                      {statusLabel(st)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setFormOpen(false)}
                disabled={saving}
              >
                <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSave}
                onPress={handleSaveUser}
                disabled={saving}
                activeOpacity={0.88}
              >
                <LinearGradient colors={Gradients.primary} style={styles.modalSaveGrad}>
                  {saving ? (
                    <ActivityIndicator color={Colors.white} />
                  ) : (
                    <Text style={styles.modalSaveText}>{t('common.done')}</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete confirm */}
      <Modal
        visible={!!deleteTarget}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteTarget(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('admin.deleteConfirmTitle')}</Text>
            <Text style={styles.deleteBody}>
              {t('admin.deleteConfirmBody').replace('{name}', deleteTarget?.displayName ?? '')}
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setDeleteTarget(null)}
                disabled={saving}
              >
                <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} disabled={saving}>
                {saving ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.deleteBtnText}>{t('admin.delete')}</Text>
                )}
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
        maxWidth: 980,
        width: '100%',
        marginHorizontal: 'auto',
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: '#EBE8F5',
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
  tabsRow: { gap: 8, paddingRight: 8 },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textDark,
    marginTop: 6,
    marginBottom: 2,
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
  toolbar: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  searchRow: {
    flex: 1,
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
  addBtn: { borderRadius: 14, overflow: 'hidden', ...Shadows.soft },
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
  userMeta: { flex: 1 },
  userName: { fontSize: 15, fontWeight: '800', color: Colors.textDark },
  userHandle: { fontSize: 12, color: Colors.primary, marginTop: 2, fontWeight: '600' },
  userEmail: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  businessTag: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1E8FF',
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
    borderBottomColor: '#F1E8FF',
  },
  permInfo: { flex: 1, paddingRight: 12 },
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
  compareRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F1E8FF' },
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
    borderBottomColor: '#F1E8FF',
  },
  accessTag: {
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
