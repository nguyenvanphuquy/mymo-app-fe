/**
 * ProfileScreen.tsx
 * Redesigned to look extremely modern, GenZ, and premium.
 * Includes interactive mood status selector, verified user badge, Unsplash banner and avatar,
 * web layout constraints, and sleek settings groups.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, Platform, Dimensions,
  Modal, TextInput, ActivityIndicator, KeyboardAvoidingView, DeviceEventEmitter,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Gradients, Shadows } from '../constants/colors';
import { useI18n } from '../i18n';
import type { Lang } from '../i18n';
import Toggle from '../components/Toggle';
import * as Haptics from 'expo-haptics';
import { changeUserPassword, getUserProfile, uploadUserAvatar, uploadUserCover, updateUserProfile, type UserProfile } from '../services/userApi';
import { getMyPosts, toPostView, type FeedPost, type PostView } from '../services/postApi';
import ProfileMomentsGrid from '../components/ProfileMomentsGrid';
import PostSheet from '../components/PostSheet';
import PremiumScreen from './PremiumScreen';
import Toast from 'react-native-toast-message';
import { getPremiumPlan, isPremiumActive, type PremiumPlanId } from '../utils/premiumStorage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SW } = Dimensions.get('window');

interface ProfileScreenProps {
  locationGranted: boolean;
  incognito: boolean;
  isActive?: boolean;
  onToggleLocation: () => void;
  onToggleIncognito: () => void;
  onLogout: () => void;
}

const MOODS = [
  { emoji: '⚡', label: 'Lively' },
  { emoji: '🌸', label: 'Soft' },
  { emoji: '🍵', label: 'Chill' },
  { emoji: '🦋', label: 'Free' },
  { emoji: '🍿', label: 'Fun' },
];

export default function ProfileScreen({
  locationGranted, incognito, isActive = true,
  onToggleLocation, onToggleIncognito, onLogout,
}: ProfileScreenProps) {
  const { t, lang, setLang } = useI18n();
  const insets = useSafeAreaInsets();
  const [currentMood, setCurrentMood] = useState('🍵');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState('');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editGender, setEditGender] = useState('');
  const [editDateOfBirth, setEditDateOfBirth] = useState('');
  const [editBio, setEditBio] = useState('');
  const [isGenderOpen, setIsGenderOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [currentPickerMonth, setCurrentPickerMonth] = useState(() => new Date());
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [myPosts, setMyPosts] = useState<FeedPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<PostView | null>(null);
  const [premiumOpen, setPremiumOpen] = useState(false);
  const [premiumPlan, setPremiumPlan] = useState<PremiumPlanId>('free');
  const settingsRef = useRef<ScrollView>(null);

  const profileLink = profile ? `mymo.app/u/${profile.id}` : '';

  const genderOptions = [
    { value: 'Male', label: t('auth.genderOptionMale') },
    { value: 'Female', label: t('auth.genderOptionFemale') },
    { value: 'Other', label: t('auth.genderOptionOther') },
  ];

  const editDateOfBirthDisplay = editDateOfBirth
    ? new Date(editDateOfBirth).toLocaleDateString(lang === 'vi' ? 'vi' : 'en-US', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : t('auth.dateOfBirth');

  const stats = [
    { n: String(myPosts.length || (profile ? profile.postCount : 0)), l: t('profile.moments'), icon: 'trail-sign-outline' },
    { n: profile ? String(profile.friendCount) : '0', l: t('profile.friends'), icon: 'people-outline' },
    { n: profile ? String(profile.placeCount) : '0', l: t('profile.places'), icon: 'location-outline' },
  ];

  const loadProfile = useCallback(async () => {
    try {
      const data = await getUserProfile();
      setProfile(data);
      setProfileError('');
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Unable to load profile');
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  const loadMyPosts = useCallback(async () => {
    try {
      const posts = await getMyPosts();
      setMyPosts(posts);
    } catch {
      setMyPosts([]);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadProfile(), loadMyPosts()]);
  }, [loadProfile, loadMyPosts]);

  useEffect(() => {
    refreshAll();
    const sub1 = DeviceEventEmitter.addListener('post:created', refreshAll);
    const sub2 = DeviceEventEmitter.addListener('friend:accepted', loadProfile);
    return () => {
      sub1.remove();
      sub2.remove();
    };
  }, [refreshAll, loadProfile]);

  useEffect(() => {
    if (!isActive) return;
    refreshAll();
  }, [isActive, refreshAll]);

  useEffect(() => {
    getPremiumPlan().then(setPremiumPlan).catch(() => {});
  }, [premiumOpen]);

  const copyProfileLink = async () => {
    if (!profileLink) return;
    await Clipboard.setStringAsync(`https://${profileLink}`);
    Toast.show({ type: 'success', text1: t('profile.linkCopied') });
  };

  const openEditModal = () => {
    if (!profile) return;
    setEditDisplayName(profile.displayName ?? '');
    setEditGender(profile.gender ?? '');
    setEditDateOfBirth(profile.dateOfBirth ?? '');
    setEditBio(profile.bio ?? '');
    setIsGenderOpen(false);
    setIsDatePickerOpen(false);
    setCurrentPickerMonth(profile.dateOfBirth ? new Date(profile.dateOfBirth) : new Date());
    setIsEditOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!editDisplayName.trim() || !editGender || !editDateOfBirth.trim()) {
      Toast.show({ type: 'error', text1: t('profile.fillAllFields') });
      return;
    }

    try {
      setIsSaving(true);
      const updated = await updateUserProfile({
        displayName: editDisplayName.trim(),
        gender: editGender,
        dateOfBirth: editDateOfBirth.trim(),
        bio: editBio.trim(),
      });
      setProfile(updated);
      setIsEditOpen(false);
      Toast.show({ type: 'success', text1: t('profile.profileSaved') });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: error instanceof Error ? error.message : t('profile.saveFailed'),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const requestImagePermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Toast.show({ type: 'error', text1: t('profile.imagePermissionRequired') });
      return false;
    }
    return true;
  };

  const pickImage = async (target: 'avatar' | 'cover') => {
    const hasPermission = await requestImagePermission();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: target === 'avatar' ? [1, 1] : [16, 9],
    });

    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    const uri = asset.uri;
    const fileName = uri.split('/').pop() ?? `${target}.jpg`;
    const fileTypeMatch = /\.(\w+)$/.exec(fileName);
    const fileType = fileTypeMatch ? `image/${fileTypeMatch[1]}` : 'image/jpeg';
    const formData = new FormData();
    const file: any = { uri, name: fileName, type: fileType };
    formData.append('file', file);

    try {
      if (target === 'avatar') setUploadingAvatar(true);
      else setUploadingCover(true);

      if (target === 'avatar') {
        await uploadUserAvatar(formData);
      } else {
        await uploadUserCover(formData);
      }

      const updatedProfile = await getUserProfile();
      setProfile(updatedProfile);
      Toast.show({ type: 'success', text1: t('profile.uploadSuccess') });
    } catch (error) {
      Toast.show({ type: 'error', text1: error instanceof Error ? error.message : t('profile.uploadFailed') });
    } finally {
      if (target === 'avatar') setUploadingAvatar(false);
      else setUploadingCover(false);
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      Toast.show({ type: 'error', text1: t('profile.passwordFill') });
      return;
    }

    if (newPassword !== confirmPassword) {
      Toast.show({ type: 'error', text1: t('profile.passwordMismatch') });
      return;
    }

    try {
      setIsChangingPassword(true);
      await changeUserPassword({
        oldPassword,
        newPassword,
        confirmPassword,
      });
      setIsPasswordOpen(false);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Toast.show({ type: 'success', text1: t('profile.passwordChanged') });
    } catch (error) {
      Toast.show({ type: 'error', text1: error instanceof Error ? error.message : t('profile.passwordFailed') });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <ScrollView
      ref={settingsRef}
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Cover / Hero image */}
      <View style={styles.heroWrap}>
        <TouchableOpacity activeOpacity={0.9} onPress={() => pickImage('cover')} style={styles.heroTouchable}>
          <Image
            source={{ uri: profile?.coverUrl || 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=600&fit=crop' }}
            style={styles.heroBg}
          />
          {uploadingCover && (
            <View style={styles.heroOverlay}>
              <ActivityIndicator color={Colors.white} />
            </View>
          )}
          <View style={styles.coverEditHint}>
            <Ionicons name="camera-outline" size={14} color="#FFF" />
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            settingsRef.current?.scrollToEnd({ animated: true });
          }}
          style={[styles.settingsBtn, { top: Math.max(16, insets.top) }]}
        >
          <Ionicons name="settings-sharp" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Profile Card Overlay */}
      <View style={styles.profileCard}>
        {loadingProfile && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={Colors.primary} size="small" />
            <Text style={styles.loadingText}>{t('profile.loading')}</Text>
          </View>
        )}
        {profileError ? (
          <View style={styles.errorRow}>
            <Text style={styles.errorText}>{profileError}</Text>
          </View>
        ) : null}
        {/* Avatar and main info */}
        <View style={styles.avatarRow}>
          <TouchableOpacity
            onPress={() => pickImage('avatar')}
            style={styles.avatarBorder}
            activeOpacity={0.9}
          >
            <Image
              source={{ uri: profile?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop' }}
              style={styles.avatarImg}
            />
            {uploadingAvatar ? (
              <View style={styles.avatarOverlay}>
                <ActivityIndicator color={Colors.white} size="small" />
              </View>
            ) : (
              <View style={styles.avatarEditBadge}>
                <Ionicons name="camera" size={11} color={Colors.primary} />
              </View>
            )}
            <View style={styles.moodBadge}>
              <Text style={styles.moodBadgeText}>{currentMood}</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.avatarInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.handle}>{profile?.displayName ?? t('profile.loading')}</Text>
              {profile && <Ionicons name="checkmark-circle" size={16} color="#3B82F6" />}
            </View>
            <Text style={styles.username}>@{profile?.username ?? '...'}</Text>
            {profile && (
              <View style={styles.metaRow}>
                <Text style={styles.metaText}>{profile.gender}</Text>
                <Text style={styles.metaDot}>•</Text>
                <Text style={styles.metaText}>{new Date(profile.dateOfBirth).toLocaleDateString(lang === 'vi' ? 'vi' : 'en-US', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                })}</Text>
              </View>
            )}
            {profile?.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
            {profile && (
              <Text style={styles.joined}>{t('profile.joinedPrefix')} {new Date(profile.createdAt).toLocaleDateString(lang === 'vi' ? 'vi' : 'en-US', {
                month: 'long',
                year: 'numeric',
              })}</Text>
            )}
          </View>
          <TouchableOpacity
              onPress={openEditModal}
              style={styles.editBtn}
            >
              <Text style={styles.editText}>{t('common.edit')}</Text>
            </TouchableOpacity>
          </View>

        {/* Profile invite link */}
        {profileLink ? (
          <TouchableOpacity onPress={copyProfileLink} style={styles.linkBox} activeOpacity={0.85}>
            <Ionicons name="link-outline" size={14} color={Colors.primary} />
            <Text style={styles.linkText} numberOfLines={1}>{profileLink}</Text>
            <Text style={styles.linkCopy}>{t('profile.copyLink')}</Text>
          </TouchableOpacity>
        ) : null}

        {/* GenZ Mood Selector Widget */}
        <View style={styles.moodWidget}>
          <Text style={styles.widgetLabel}>{t('profile.moodQuestion')}</Text>
          <View style={styles.moodRow}>
            {MOODS.map(m => (
              <TouchableOpacity
                key={m.emoji}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setCurrentMood(m.emoji);
                  Toast.show({ type: 'info', text1: `Tâm trạng: ${m.label} ${m.emoji}` });
                }}
                style={[
                  styles.moodTab,
                  currentMood === m.emoji && styles.moodTabActive
                ]}
              >
                <Text style={styles.moodEmoji}>{m.emoji}</Text>
                <Text style={styles.moodLabel}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Stats segment */}
        <View style={styles.stats}>
          {stats.map(({ n, l, icon }) => (
            <TouchableOpacity
              key={l}
              onPress={() => Toast.show({ type: 'info', text1: l, text2: `${n} ${l.toLowerCase()}` })}
              style={styles.statBox}
            >
              <View style={styles.statIconWrap}>
                <Ionicons name={icon as any} size={15} color={Colors.primary} />
              </View>
              <Text style={styles.statN}>{n}</Text>
              <Text style={styles.statL}>{l}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ProfileMomentsGrid
        posts={myPosts}
        onPostPress={(post) => {
          if (!profile) return;
          setSelectedPost(toPostView(post, profile.displayName, profile.avatarUrl));
        }}
      />

      {selectedPost && (
        <PostSheet post={selectedPost} onClose={() => setSelectedPost(null)} />
      )}

      <Modal
        visible={isEditOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsEditOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalWrapper}
          >
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>{t('profile.editProfile')}</Text>
                  <Text style={styles.modalSubtitle}>{t('profile.editProfileDesc')}</Text>
                </View>
                <TouchableOpacity onPress={() => setIsEditOpen(false)} style={styles.closeButton}>
                  <Ionicons name="close" size={20} color={Colors.textDark} />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
                <View style={styles.fieldBlock}>
                  <Text style={styles.fieldLabel}>{t('auth.displayName')}</Text>
                  <TextInput
                    value={editDisplayName}
                    onChangeText={setEditDisplayName}
                    placeholder={t('auth.displayName')}
                    placeholderTextColor={Colors.textMuted}
                    style={styles.fieldInput}
                    autoCapitalize="words"
                  />
                </View>

                <View style={styles.fieldBlock}>
                  <Text style={styles.fieldLabel}>{t('auth.gender')}</Text>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => setIsGenderOpen(v => !v)}
                    style={[styles.fieldInput, styles.pickerInput]}
                  >
                    <Text style={editGender ? styles.fieldText : styles.placeholderText}>
                      {editGender
                        ? genderOptions.find(option => option.value === editGender)?.label
                        : t('auth.gender')}
                    </Text>
                    <Ionicons
                      name={isGenderOpen ? 'chevron-up-outline' : 'chevron-down-outline'}
                      size={18}
                      color={Colors.textMid}
                    />
                  </TouchableOpacity>
                  {isGenderOpen && (
                    <View style={styles.pickerList}>
                      {genderOptions.map(option => (
                        <TouchableOpacity
                          key={option.value}
                          onPress={() => {
                            setEditGender(option.value);
                            setIsGenderOpen(false);
                          }}
                          style={[
                            styles.pickerOption,
                            editGender === option.value && styles.pickerOptionActive,
                          ]}
                        >
                          <Text style={[
                            styles.pickerOptionText,
                            editGender === option.value && styles.pickerOptionTextActive,
                          ]}
                          >
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                <View style={styles.fieldBlock}>
                  <Text style={styles.fieldLabel}>{t('auth.dateOfBirth')}</Text>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => setIsDatePickerOpen(true)}
                    style={[styles.fieldInput, styles.pickerInput]}
                  >
                    <Text style={editDateOfBirth ? styles.fieldText : styles.placeholderText}>
                      {editDateOfBirthDisplay}
                    </Text>
                    <Ionicons name="calendar-outline" size={18} color={Colors.textMid} />
                  </TouchableOpacity>
                </View>

                <View style={styles.fieldBlock}>
                  <Text style={styles.fieldLabel}>Bio</Text>
                  <TextInput
                    value={editBio}
                    onChangeText={setEditBio}
                    placeholder={t('profile.bioPlaceholder')}
                    placeholderTextColor={Colors.textMuted}
                    style={[styles.fieldInput, styles.textarea]}
                    multiline
                    numberOfLines={4}
                  />
                </View>

                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    onPress={() => setIsEditOpen(false)}
                    style={[styles.modalButton, styles.cancelBtn]}
                    disabled={isSaving}
                  >
                    <Text style={styles.cancelText}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSaveProfile}
                    style={[styles.modalButton, styles.saveBtn]}
                    activeOpacity={0.85}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <ActivityIndicator color={Colors.white} size="small" />
                    ) : (
                      <Text style={styles.saveText}>{t('profile.saveChanges')}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal transparent visible={isDatePickerOpen} animationType="fade" statusBarTranslucent onRequestClose={() => setIsDatePickerOpen(false)}>
        <TouchableOpacity style={styles.calendarOverlay} activeOpacity={1} onPress={() => setIsDatePickerOpen(false)}>
          <View style={styles.calendarCard}>
            <View style={styles.yearHeader}>
              <TouchableOpacity onPress={() => setCurrentPickerMonth(prev => new Date(prev.getFullYear() - 1, prev.getMonth(), 1))} style={styles.yearButton}>
                <Ionicons name="chevron-back-outline" size={18} color={Colors.textDark} />
              </TouchableOpacity>
              <Text style={styles.calendarYear}>{currentPickerMonth.getFullYear()}</Text>
              <TouchableOpacity onPress={() => setCurrentPickerMonth(prev => new Date(prev.getFullYear() + 1, prev.getMonth(), 1))} style={styles.yearButton}>
                <Ionicons name="chevron-forward-outline" size={18} color={Colors.textDark} />
              </TouchableOpacity>
            </View>
            <View style={styles.calendarHeader}>
              <TouchableOpacity onPress={() => setCurrentPickerMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}>
                <Ionicons name="chevron-back-outline" size={22} color={Colors.textDark} />
              </TouchableOpacity>
              <Text style={styles.calendarTitle}>{currentPickerMonth.toLocaleString(lang === 'vi' ? 'vi' : 'en-US', { month: 'long' })}</Text>
              <TouchableOpacity onPress={() => setCurrentPickerMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}>
                <Ionicons name="chevron-forward-outline" size={22} color={Colors.textDark} />
              </TouchableOpacity>
            </View>
            <View style={styles.weekHeader}>
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                <Text key={day} style={styles.weekDay}>{day}</Text>
              ))}
            </View>
            <View style={styles.daysGrid}>
              {(() => {
                const firstDay = new Date(currentPickerMonth.getFullYear(), currentPickerMonth.getMonth(), 1).getDay();
                const totalDays = new Date(currentPickerMonth.getFullYear(), currentPickerMonth.getMonth() + 1, 0).getDate();
                const cells = Array.from({ length: firstDay + totalDays }, (_, index) => {
                  if (index < firstDay) return null;
                  return index - firstDay + 1;
                });
                return cells.map((day, idx) => (
                  <TouchableOpacity
                    key={`${currentPickerMonth.getMonth()}-${idx}`}
                    style={[styles.dayCell, day ? styles.dayCellEnabled : undefined]}
                    activeOpacity={day ? 0.7 : 1}
                    disabled={!day}
                    onPress={() => {
                      if (!day) return;
                      const selected = new Date(currentPickerMonth.getFullYear(), currentPickerMonth.getMonth(), day);
                      const iso = selected.toISOString().slice(0, 10);
                      setEditDateOfBirth(iso);
                      setIsDatePickerOpen(false);
                    }}
                  >
                    <Text style={[styles.dayText, !day && styles.dayTextDisabled]}>{day || ''}</Text>
                  </TouchableOpacity>
                ));
              })()}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={isPasswordOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsPasswordOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalWrapper}
          >
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>{t('profile.changePassword')}</Text>
                  <Text style={styles.modalSubtitle}>{t('profile.changePasswordDesc')}</Text>
                </View>
                <TouchableOpacity onPress={() => setIsPasswordOpen(false)} style={styles.closeButton}>
                  <Ionicons name="close" size={20} color={Colors.textDark} />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
                <View style={styles.fieldBlock}>
                  <Text style={styles.fieldLabel}>{t('profile.oldPassword')}</Text>
                  <TextInput
                    value={oldPassword}
                    onChangeText={setOldPassword}
                    placeholder={t('profile.oldPasswordPlaceholder')}
                    placeholderTextColor={Colors.textMuted}
                    secureTextEntry
                    style={styles.fieldInput}
                  />
                </View>
                <View style={styles.fieldBlock}>
                  <Text style={styles.fieldLabel}>{t('profile.newPassword')}</Text>
                  <TextInput
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder={t('profile.newPasswordPlaceholder')}
                    placeholderTextColor={Colors.textMuted}
                    secureTextEntry
                    style={styles.fieldInput}
                  />
                </View>
                <View style={styles.fieldBlock}>
                  <Text style={styles.fieldLabel}>{t('auth.confirmPassword')}</Text>
                  <TextInput
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder={t('auth.confirmPassword')}
                    placeholderTextColor={Colors.textMuted}
                    secureTextEntry
                    style={styles.fieldInput}
                  />
                </View>
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    onPress={() => setIsPasswordOpen(false)}
                    style={[styles.modalButton, styles.cancelBtn]}
                    disabled={isChangingPassword}
                  >
                    <Text style={styles.cancelText}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleChangePassword}
                    style={[styles.modalButton, styles.saveBtn]}
                    activeOpacity={0.85}
                    disabled={isChangingPassword}
                  >
                    {isChangingPassword ? (
                      <ActivityIndicator color={Colors.white} size="small" />
                    ) : (
                      <Text style={styles.saveText}>{t('profile.changePassword')}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Privacy group */}
      <View style={styles.group}>
        <SettingRow
          icon="location"
          label={t('profile.shareLoc')}
          hint={t('profile.shareLocHint')}
          right={
            <Toggle
              on={locationGranted}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onToggleLocation();
              }}
            />
          }
        />
        <SettingRow
          icon="glasses"
          label={t('profile.incognito')}
          hint={t('profile.incognitoHint')}
          disabled={!locationGranted}
          right={
            <Toggle
              on={incognito && locationGranted}
              onPress={() => {
                if (!locationGranted) return;
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onToggleIncognito();
              }}
              disabled={!locationGranted}
            />
          }
        />
      </View>

      <View style={styles.group}>
        <SettingRow
          icon="image"
          label={t('profile.uploadAvatar')}
          right={uploadingAvatar ? <ActivityIndicator size="small" color={Colors.primary} /> : <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />}
          onPress={() => pickImage('avatar')}
        />
        <SettingRow
          icon="images"
          label={t('profile.uploadCover')}
          right={uploadingCover ? <ActivityIndicator size="small" color={Colors.primary} /> : <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />}
          onPress={() => pickImage('cover')}
        />
        <SettingRow
          icon="lock-closed"
          label={t('profile.changePassword')}
          right={<Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />}
          onPress={() => setIsPasswordOpen(true)}
        />
      </View>

      {/* Language Toggle pills */}
      <View style={styles.group}>
        <View style={styles.row}>
          <View style={styles.rowIcon}>
            <Ionicons name="globe" size={16} color={Colors.primary} />
          </View>
          <Text style={styles.rowLabel}>{t('profile.language')}</Text>
          <View style={styles.langTabs}>
            {(['vi', 'en'] as Lang[]).map(l => (
              <TouchableOpacity
                key={l}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setLang(l);
                }}
                style={[styles.langTab, lang === l && styles.langTabActive]}
              >
                {lang === l ? (
                  <LinearGradient colors={Gradients.primary as any} style={styles.langTabGrad}>
                    <Text style={styles.langTabActiveText}>{l === 'vi' ? 'VI' : 'EN'}</Text>
                  </LinearGradient>
                ) : (
                  <Text style={styles.langTabText}>{l === 'vi' ? 'VI' : 'EN'}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* General Settings */}
      <View style={styles.group}>
        <SettingRow
          icon="notifications"
          label={t('profile.notifications')}
          right={<Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />}
          onPress={() => Toast.show({ type: 'info', text1: t('profile.notifications'), text2: t('profile.notificationsDesc') })}
        />
        <SettingRow
          icon="shield-checkmark"
          label={t('profile.blocked')}
          right={<Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />}
          onPress={() => Toast.show({ type: 'info', text1: t('profile.blocked'), text2: t('profile.blockedDesc') })}
        />
        <SettingRow
          icon="sparkles"
          label={isPremiumActive(premiumPlan) ? t('profile.plusActive') : t('profile.getPlus')}
          right={
            isPremiumActive(premiumPlan) ? (
              <View style={styles.plusActiveBadge}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
              </View>
            ) : (
              <View style={styles.tryBadge}>
                <LinearGradient colors={Gradients.primary as any} style={styles.tryBadgeGrad}>
                  <Text style={styles.tryBadgeText}>{t('common.try')}</Text>
                </LinearGradient>
              </View>
            )
          }
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setPremiumOpen(true);
          }}
        />
      </View>

      {/* Logout button */}
      <TouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onLogout();
        }}
        style={styles.logoutBtn}
        activeOpacity={0.85}
      >
        <Text style={styles.logoutText}>{t('common.logout')}</Text>
      </TouchableOpacity>

      <View style={{ height: 60 }} />

      <Modal visible={premiumOpen} animationType="slide" statusBarTranslucent onRequestClose={() => setPremiumOpen(false)}>
        <PremiumScreen
          onClose={() => setPremiumOpen(false)}
          onPlanChanged={setPremiumPlan}
        />
      </Modal>
    </ScrollView>
  );
}

// ─── Component Helpers ────────────────────────────────────────────────────────
interface SettingRowProps {
  icon: string;
  label: string;
  hint?: string;
  right: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
}

function SettingRow({ icon, label, hint, right, onPress, disabled }: SettingRowProps) {
  const Comp = onPress ? TouchableOpacity : View;
  return (
    <Comp
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.row, disabled && styles.rowDisabled]}
    >
      <View style={styles.rowIcon}>
        <Ionicons name={icon as any} size={16} color={Colors.primary} />
      </View>
      <View style={styles.rowInfo}>
        <Text style={styles.rowLabel}>{label}</Text>
        {hint && <Text style={styles.rowHint}>{hint}</Text>}
      </View>
      {right}
    </Comp>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFF', // Light greyish lavender
    ...Platform.select({
      web: {
        maxWidth: 500,
        width: '100%',
        marginHorizontal: 'auto',
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: '#F2F2F2',
      },
      default: {},
    }),
  },
  content: {
    paddingBottom: 40,
  },
  heroWrap: {
    height: 180,
    overflow: 'hidden',
    position: 'relative',
  },
  heroTouchable: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  heroBg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverEditHint: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsBtn: {
    position: 'absolute',
    right: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Profile card ──
  profileCard: {
    marginHorizontal: 16,
    marginTop: -52,
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F2EEFF',
    ...Shadows.float,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarBorder: {
    position: 'relative',
    borderRadius: 36,
    borderWidth: 3,
    borderColor: Colors.white,
    backgroundColor: '#EEE',
    ...Shadows.glow,
  },
  avatarImg: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.soft,
  },
  moodBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.soft,
  },
  moodBadgeText: {
    fontSize: 13,
  },
  avatarInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  handle: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.textDark,
  },
  username: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 1,
  },
  joined: {
    fontSize: 10,
    color: Colors.primaryLight,
    fontWeight: '600',
    marginTop: 4,
  },
  bio: {
    marginTop: 10,
    fontSize: 12,
    color: Colors.textMid,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalWrapper: {
    width: '100%',
    justifyContent: 'flex-end',
    ...Platform.select({
      web: {
        maxWidth: 500,
      },
      default: {},
    }),
  },
  modalCard: {
    maxHeight: '88%',
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: 26,
    ...Shadows.float,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.textDark,
  },
  modalSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 18,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    paddingBottom: 20,
  },
  fieldBlock: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  fieldInput: {
    backgroundColor: '#F8F7FF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: Colors.textDark,
    fontSize: 13,
  },
  fieldText: {
    color: Colors.textDark,
  },
  placeholderText: {
    color: Colors.textMuted,
  },
  pickerInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerList: {
    marginTop: 10,
    borderRadius: 16,
    backgroundColor: '#F7F5FF',
    borderWidth: 1,
    borderColor: '#EFE9FF',
    overflow: 'hidden',
  },
  pickerOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  pickerOptionActive: {
    backgroundColor: '#EEE7FF',
  },
  pickerOptionText: {
    fontSize: 13,
    color: Colors.textDark,
  },
  pickerOptionTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  textarea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  calendarOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  calendarCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 18,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  calendarTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textDark,
  },
  yearHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  yearButton: {
    padding: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(124,91,255,0.08)',
  },
  calendarYear: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textDark,
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  weekDay: {
    width: 30,
    textAlign: 'center',
    color: Colors.textMid,
    fontSize: 12,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'flex-start',
  },
  dayCell: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  dayCellEnabled: {
    backgroundColor: 'rgba(124, 91, 255, 0.08)',
  },
  dayText: {
    color: Colors.textDark,
    fontSize: 13,
  },
  dayTextDisabled: {
    color: Colors.textMuted,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 4,
  },
  modalButton: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: '#F5F2FF',
  },
  cancelText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '800',
  },
  saveBtn: {
    backgroundColor: Colors.primary,
  },
  saveText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.white,
  },
  editBtn: {
    backgroundColor: '#F5F2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  editText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primary,
  },
  linkBox: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8F7FF',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#EFE9FF',
  },
  linkText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textDark,
  },
  linkCopy: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primary,
  },

  // ── Mood widget ──
  moodWidget: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F6F5FC',
  },
  widgetLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textDark,
    marginBottom: 8,
  },
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  moodTab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: '#FAF9FF',
    borderWidth: 1,
    borderColor: '#F0EEFC',
  },
  moodTabActive: {
    backgroundColor: '#EBE5FF',
    borderColor: '#7C5BFF',
  },
  moodEmoji: {
    fontSize: 16,
  },
  moodLabel: {
    fontSize: 9,
    color: Colors.textMuted,
    fontWeight: '600',
    marginTop: 2,
  },

  // ── Stats ──
  stats: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#FAF9FF',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F2EEFF',
  },
  statIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F2EEFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  statN: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.textDark,
  },
  statL: {
    fontSize: 8,
    fontWeight: '800',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 2,
  },

  // ── List groups ──
  group: {
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F6F5FC',
    ...Shadows.soft,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F2FF',
  },
  rowDisabled: {
    opacity: 0.5,
  },
  rowIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: Colors.primaryTint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowInfo: {
    flex: 1,
  },
  loadingRow: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  loadingText: {
    color: Colors.textMid,
    fontSize: 12,
  },
  rowLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textDark,
  },
  rowHint: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 1,
  },
  langTabs: {
    flexDirection: 'row',
    backgroundColor: Colors.primaryTint,
    borderRadius: 14,
    padding: 3,
  },
  langTab: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  langTabActive: {},
  langTabGrad: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  langTabActiveText: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: 11,
  },
  langTabText: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    color: Colors.primary,
    fontWeight: '800',
    fontSize: 11,
  },
  errorRow: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#FFEFF3',
    borderRadius: 16,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 12,
    color: '#D80035',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  metaText: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  metaDot: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  tryBadge: {
    borderRadius: 14,
    overflow: 'hidden',
    ...Shadows.glow,
  },
  uploadActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    flexWrap: 'wrap',
  },
  uploadButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadCoverButton: {
    backgroundColor: '#7B5BFF',
  },
  uploadButtonText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  tryBadgeGrad: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tryBadgeText: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: 9,
  },
  plusActiveBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primaryTint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutBtn: {
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#FFE3E8',
    backgroundColor: '#FFF5F6',
    alignItems: 'center',
  },
  logoutText: {
    color: '#FF3D6E',
    fontWeight: '800',
    fontSize: 13,
  },
});