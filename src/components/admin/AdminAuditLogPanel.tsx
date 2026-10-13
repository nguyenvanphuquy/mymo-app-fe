import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Shadows } from '../../constants/colors';
import { useI18n } from '../../i18n';
import type { AdminAuditAction, AdminAuditLogItem, AdminAuditLogSummary } from '../../services/adminAuditLogApi';

const AUDIT_ACCENT = '#4F46E5';
const AUDIT_ACCENT_SOFT = '#EEF2FF';
const ACTION_COLORS: Record<AdminAuditAction, string> = {
  Create: '#059669',
  Update: '#D97706',
  Delete: '#DC2626',
};

function formatWhen(iso: string, lang: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function shortId(id: string): string {
  const t = id.trim();
  if (t.length <= 10) return t;
  return `${t.slice(0, 8)}…`;
}

function previewValue(raw: string | null, max = 120): string | null {
  if (!raw?.trim()) return null;
  const s = raw.trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}

function StatTile({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <View style={[styles.statTile, accent ? { borderColor: accent } : null]}>
      <Text style={styles.statTileLabel} numberOfLines={2}>{label}</Text>
      <Text style={[styles.statTileValue, accent ? { color: accent } : null]}>{value}</Text>
    </View>
  );
}

function ActionBadge({ action, label }: { action: AdminAuditAction; label: string }) {
  const color = ACTION_COLORS[action];
  return (
    <View style={[styles.actionBadge, { backgroundColor: `${color}18`, borderColor: `${color}55` }]}>
      <Text style={[styles.actionBadgeText, { color }]}>{label}</Text>
    </View>
  );
}

function HorizontalBars({
  items,
}: {
  items: { label: string; value: number; color: string }[];
}) {
  const max = Math.max(...items.map(i => i.value), 1);
  return (
    <View style={styles.barBlock}>
      {items.map(item => (
        <View key={item.label} style={styles.barRow}>
          <Text style={styles.barLabel} numberOfLines={1}>{item.label}</Text>
          <View style={styles.barTrack}>
            <View
              style={[
                styles.barFill,
                {
                  width: `${Math.max(item.value > 0 ? 8 : 0, (item.value / max) * 100)}%`,
                  backgroundColor: item.color,
                },
              ]}
            />
          </View>
          <Text style={styles.barValue}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

export type AdminAuditLogPanelProps = {
  items: AdminAuditLogItem[];
  summary: AdminAuditLogSummary;
  totalCount: number;
  actionFilter: AdminAuditAction | 'all';
  onActionFilter: (f: AdminAuditAction | 'all') => void;
  subTab: 'overview' | 'timeline';
  onSubTab: (t: 'overview' | 'timeline') => void;
  entityLabel: (entityName: string) => string;
  actionLabel: (action: AdminAuditAction) => string;
};

export default function AdminAuditLogPanel({
  items,
  summary,
  totalCount,
  actionFilter,
  onActionFilter,
  subTab,
  onSubTab,
  entityLabel,
  actionLabel,
}: AdminAuditLogPanelProps) {
  const { t, lang } = useI18n();

  const entityBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of items) {
      map.set(row.entityName, (map.get(row.entityName) ?? 0) + 1);
    }
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({
        label: entityLabel(name),
        value: count,
        color: AUDIT_ACCENT,
      }));
  }, [items, entityLabel]);

  const filterChips: { id: AdminAuditAction | 'all'; label: string }[] = [
    { id: 'all', label: t('admin.auditFilterAll') },
    { id: 'Create', label: t('admin.auditActionCreate') },
    { id: 'Update', label: t('admin.auditActionUpdate') },
    { id: 'Delete', label: t('admin.auditActionDelete') },
  ];

  return (
    <View style={styles.wrap}>
      <LinearGradient colors={['#312E81', '#4F46E5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="document-text-outline" size={22} color={Colors.white} />
        </View>
        <View style={styles.heroText}>
          <Text style={styles.heroTitle}>{t('admin.auditHeroTitle')}</Text>
          <Text style={styles.heroSub}>{t('admin.auditHeroSub')}</Text>
        </View>
        <View style={styles.heroStat}>
          <Text style={styles.heroStatValue}>{totalCount}</Text>
          <Text style={styles.heroStatLabel}>{t('admin.auditTotalEvents')}</Text>
        </View>
      </LinearGradient>

      <View style={styles.chipsRow}>
        <TouchableOpacity
          style={[styles.chip, subTab === 'overview' && styles.chipActive]}
          onPress={() => onSubTab('overview')}
        >
          <Text style={[styles.chipText, subTab === 'overview' && styles.chipTextActive]}>
            {t('admin.auditTabOverview')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.chip, subTab === 'timeline' && styles.chipActive]}
          onPress={() => onSubTab('timeline')}
        >
          <Text style={[styles.chipText, subTab === 'timeline' && styles.chipTextActive]}>
            {t('admin.auditTabTimeline')} ({items.length})
          </Text>
        </TouchableOpacity>
      </View>

      {subTab === 'overview' ? (
        <>
          <View style={styles.statGrid}>
            <StatTile
              label={t('admin.auditStat24h')}
              value={String(summary.last24Hours)}
              accent={AUDIT_ACCENT}
            />
            <StatTile label={t('admin.auditActionCreate')} value={String(summary.createCount)} accent={ACTION_COLORS.Create} />
            <StatTile label={t('admin.auditActionUpdate')} value={String(summary.updateCount)} accent={ACTION_COLORS.Update} />
            <StatTile label={t('admin.auditActionDelete')} value={String(summary.deleteCount)} accent={ACTION_COLORS.Delete} />
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('admin.auditChartActions')}</Text>
            <HorizontalBars
              items={[
                { label: t('admin.auditActionCreate'), value: summary.createCount, color: ACTION_COLORS.Create },
                { label: t('admin.auditActionUpdate'), value: summary.updateCount, color: ACTION_COLORS.Update },
                { label: t('admin.auditActionDelete'), value: summary.deleteCount, color: ACTION_COLORS.Delete },
              ]}
            />
            <Text style={styles.cardFoot}>{t('admin.auditChartActionsHint')}</Text>
          </View>
          {entityBreakdown.length > 0 ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t('admin.auditChartEntities')}</Text>
              <HorizontalBars items={entityBreakdown} />
            </View>
          ) : null}
        </>
      ) : null}

      {subTab === 'timeline' ? (
        <>
          <View style={[styles.chipsRow, { marginBottom: 4 }]}>
            {filterChips.map(chip => (
              <TouchableOpacity
                key={chip.id}
                style={[styles.chip, actionFilter === chip.id && styles.chipActive]}
                onPress={() => onActionFilter(chip.id)}
              >
                <Text style={[styles.chipText, actionFilter === chip.id && styles.chipTextActive]}>
                  {chip.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {items.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="file-tray-outline" size={28} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>{t('admin.auditEmpty')}</Text>
              <Text style={styles.emptySub}>{t('admin.auditEmptyHint')}</Text>
            </View>
          ) : (
            items.map(row => {
              const actor = row.actorDisplayName || row.actorEmail || shortId(row.userId);
              const oldP = previewValue(row.oldValue);
              const newP = previewValue(row.newValue);
              return (
                <View key={row.auditLogId} style={styles.timelineCard}>
                  <View style={styles.timelineRail}>
                    <View style={[styles.timelineDot, { backgroundColor: ACTION_COLORS[row.action] }]} />
                    <View style={styles.timelineLine} />
                  </View>
                  <View style={styles.timelineBody}>
                    <View style={styles.timelineTop}>
                      <ActionBadge action={row.action} label={actionLabel(row.action)} />
                      <Text style={styles.timelineWhen}>{formatWhen(row.createdAt, lang)}</Text>
                    </View>
                    <Text style={styles.timelineEntity}>
                      {entityLabel(row.entityName)} · {shortId(row.entityId)}
                    </Text>
                    <View style={styles.actorRow}>
                      <Ionicons name="person-circle-outline" size={16} color={AUDIT_ACCENT} />
                      <Text style={styles.actorText}>{actor}</Text>
                    </View>
                    {oldP || newP ? (
                      <View style={styles.diffBox}>
                        {oldP ? (
                          <Text style={styles.diffOld}>
                            {t('admin.auditBefore')}: {oldP}
                          </Text>
                        ) : null}
                        {newP ? (
                          <Text style={styles.diffNew}>
                            {t('admin.auditAfter')}: {newP}
                          </Text>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                </View>
              );
            })
          )}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16, gap: 12 },
  hero: {
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...Shadows.soft,
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: { flex: 1 },
  heroTitle: { fontSize: 16, fontWeight: '900', color: Colors.white },
  heroSub: { fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  heroStat: { alignItems: 'flex-end' },
  heroStatValue: { fontSize: 22, fontWeight: '900', color: Colors.white },
  heroStatLabel: { fontSize: 10, color: 'rgba(255,255,255,0.8)', fontWeight: '700' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: AUDIT_ACCENT_SOFT,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  chipActive: { backgroundColor: AUDIT_ACCENT, borderColor: AUDIT_ACCENT },
  chipText: { fontSize: 12, fontWeight: '700', color: AUDIT_ACCENT },
  chipTextActive: { color: Colors.white },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statTile: {
    width: '47%' as unknown as number,
    flexGrow: 1,
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    ...Shadows.soft,
  },
  statTileLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, marginBottom: 4 },
  statTileValue: { fontSize: 17, fontWeight: '900', color: Colors.textDark },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E0E7FF',
    ...Shadows.soft,
  },
  cardTitle: { fontSize: 13, fontWeight: '800', color: Colors.textDark, marginBottom: 10 },
  cardFoot: { fontSize: 10, color: Colors.textMuted, marginTop: 8 },
  barBlock: { gap: 8 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barLabel: { width: 72, fontSize: 11, fontWeight: '600', color: Colors.textMuted },
  barTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 4 },
  barValue: { width: 28, fontSize: 11, fontWeight: '800', color: Colors.textDark, textAlign: 'right' },
  emptyCard: {
    alignItems: 'center',
    padding: 28,
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E0E7FF',
    gap: 8,
  },
  emptyTitle: { fontSize: 14, fontWeight: '800', color: Colors.textDark, textAlign: 'center' },
  emptySub: { fontSize: 12, color: Colors.textMuted, textAlign: 'center' },
  timelineCard: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  timelineRail: { width: 14, alignItems: 'center' },
  timelineDot: { width: 10, height: 10, borderRadius: 5, marginTop: 6 },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#E0E7FF',
    marginTop: 4,
    minHeight: 24,
  },
  timelineBody: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E0E7FF',
    ...Shadows.soft,
  },
  timelineTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  timelineWhen: { fontSize: 10, color: Colors.textMuted, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  timelineEntity: { fontSize: 13, fontWeight: '800', color: Colors.textDark, marginTop: 6 },
  actorRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  actorText: { fontSize: 12, color: Colors.textMuted, fontWeight: '600' },
  actionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionBadgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  diffBox: {
    marginTop: 8,
    padding: 8,
    borderRadius: 10,
    backgroundColor: AUDIT_ACCENT_SOFT,
    gap: 4,
  },
  diffOld: { fontSize: 11, color: '#64748B' },
  diffNew: { fontSize: 11, color: '#334155' },
});
