import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet, Animated,
  StatusBar, Platform, DeviceEventEmitter, ActivityIndicator, TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Gradients, Shadows } from '../constants/colors';
import { useI18n } from '../i18n';
import Toast from 'react-native-toast-message';
import { uploadMedia } from '../services/mediaApi';
import { createPost } from '../services/postApi';
import { buildImageFormData } from '../utils/imageFormData';
import { getNearbyPlaces, pickClosestPlace, PlaceResult } from '../services/placeApi';
import { getBeautyFilter, type BeautyFilterId } from '../constants/beautyFilters';
import FilteredPhoto from './FilteredPhoto';
import FilterStrip from './FilterStrip';
import { bakeFilteredJpeg } from '../utils/bakeFilteredJpeg';
import { pickRandomAlias } from '../utils/anonymousAlias';
import { hasActivePremium } from '../utils/premiumStorage';
import ContentRejectedBanner from './ContentRejectedBanner';
import { isContentRejected } from '../utils/contentRejected';
import { ensureLocationForPosting } from '../utils/ensureLocation';

const CAPTION_MAX = 150;
const VIDEO_MAX_SECONDS = 15;

interface CameraSheetProps {
  locationGranted: boolean;
  onClose: () => void;
  /** Called when device location is successfully enabled from the camera flow. */
  onLocationEnabled: () => void;
}

export default function CameraSheet({ locationGranted, onClose, onLocationEnabled }: CameraSheetProps) {
  const { t } = useI18n();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>(Platform.OS === 'web' ? 'front' : 'back');
  const [cameraReady, setCameraReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [captured, setCaptured] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [mediaKind, setMediaKind] = useState<'image' | 'video'>('image');
  const [captureMode, setCaptureMode] = useState<'photo' | 'video'>('photo');
  const [canUploadLibrary, setCanUploadLibrary] = useState(false);
  const [picking, setPicking] = useState(false);
  const [uploadMeta, setUploadMeta] = useState<{ name: string; type: string } | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const recordTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [posting, setPosting] = useState(false);
  const [nearestPlace, setNearestPlace] = useState<PlaceResult | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [resolvingPlace, setResolvingPlace] = useState(false);
  const [visibility, setVisibility] = useState<'Public' | 'Friends' | 'Private' | 'Anonymous'>('Public');
  const [anonymousAlias, setAnonymousAlias] = useState(() => pickRandomAlias());
  const [caption, setCaption] = useState('');
  const [blockedNotice, setBlockedNotice] = useState<string | null>(null);
  const [beautyFilter, setBeautyFilter] = useState<BeautyFilterId>('soft');
  const [showBeautyPanel, setShowBeautyPanel] = useState(false);
  const slideAnim = useRef(new Animated.Value(800)).current;

  const useNativeDriver = Platform.OS !== 'web';

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver,
      tension: 50,
      friction: 10,
    }).start();
  }, [slideAnim, useNativeDriver]);

  useEffect(() => {
    if (!permission) return;
    if (!permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  useEffect(() => {
    void hasActivePremium().then(setCanUploadLibrary);
  }, []);

  useEffect(() => {
    if (!locationGranted) {
      setNearestPlace(null);
      return;
    }

    let isMounted = true;

    const resolvePlace = async () => {
      setResolvingPlace(true);
      try {
        const loc = await ensureLocationForPosting();
        if (!loc.ok) {
          if (isMounted) setResolvingPlace(false);
          return;
        }

        if (isMounted) {
          setCurrentLocation(loc.coords);
        }

        try {
          const places = await getNearbyPlaces(loc.coords.latitude, loc.coords.longitude);
          if (isMounted) setNearestPlace(pickClosestPlace(places));
        } catch {
          // Nearby places optional — coords are enough to post
        }
      } catch (error) {
        if (isMounted) {
          Toast.show({
            type: 'error',
            text1: t('cam.locationError') || 'Location error',
            text2: error instanceof Error ? error.message : 'Could not resolve nearby place.',
          });
        }
      } finally {
        if (isMounted) setResolvingPlace(false);
      }
    };

    resolvePlace();

    return () => {
      isMounted = false;
    };
  }, [locationGranted, t]);

  const enableLocationFromCamera = async () => {
    const loc = await ensureLocationForPosting();
    if (!loc.ok) {
      Toast.show({
        type: 'error',
        text1: t('cam.locationRequired') || 'Cần bật vị trí',
        text2:
          loc.reason === 'denied'
            ? (t('cam.locationDenied') || 'Hãy cho phép vị trí trong trình duyệt/cài đặt máy.')
            : (t('cam.locationRequiredDesc') || 'Không lấy được vị trí. Thử lại.'),
      });
      return;
    }
    setCurrentLocation(loc.coords);
    onLocationEnabled();
    try {
      const places = await getNearbyPlaces(loc.coords.latitude, loc.coords.longitude);
      setNearestPlace(pickClosestPlace(places));
    } catch {
      // optional
    }
    Toast.show({ type: 'success', text1: t('loc.enabled'), text2: t('loc.enabledDesc') });
  };

  const close = () => {
    Animated.timing(slideAnim, {
      toValue: 800,
      duration: 300,
      useNativeDriver,
    }).start(onClose);
  };

  const flipCamera = useCallback(() => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
    setCameraReady(false);
    Toast.show({
      type: 'info',
      text1: t('cam.flip'),
      text2: facing === 'back' ? t('cam.frontCamera') : t('cam.backCamera'),
    });
  }, [facing, t]);

  const takePhoto = async () => {
    if (!cameraRef.current || !cameraReady || capturing) return;

    try {
      setCapturing(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        skipProcessing: Platform.OS === 'android',
      });

      if (photo?.uri) {
        setUploadMeta(null);
        setMediaKind('image');
        setSelectedImageUri(photo.uri);
        setCaptured(true);
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t('cam.captureFailed'),
        text2: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setCapturing(false);
    }
  };

  const clearRecordTimer = () => {
    if (recordTimer.current) {
      clearInterval(recordTimer.current);
      recordTimer.current = null;
    }
  };

  const chooseMode = async (mode: 'photo' | 'video') => {
    if (mode === 'video' && !(await hasActivePremium())) {
      Toast.show({ type: 'info', text1: t('premium.benefitLocked'), text2: t('premium.feat.moments') });
      return;
    }
    setCaptureMode(mode);
  };

  const stopVideo = () => {
    clearRecordTimer();
    cameraRef.current?.stopRecording();
  };

  const startVideo = async () => {
    if (!cameraRef.current || !cameraReady || capturing || recording) return;
    if (!(await hasActivePremium())) {
      Toast.show({ type: 'info', text1: t('premium.benefitLocked'), text2: t('premium.feat.moments') });
      return;
    }
    try {
      setRecording(true);
      setRecordSeconds(0);
      let elapsed = 0;
      recordTimer.current = setInterval(() => {
        elapsed += 1;
        setRecordSeconds(elapsed);
        if (elapsed >= VIDEO_MAX_SECONDS) stopVideo();
      }, 1000);
      const video = await cameraRef.current.recordAsync({ maxDuration: VIDEO_MAX_SECONDS });
      clearRecordTimer();
      setRecording(false);
      if (video?.uri) {
        setUploadMeta(null);
        setMediaKind('video');
        setSelectedImageUri(video.uri);
        setCaptured(true);
      }
    } catch (error) {
      clearRecordTimer();
      setRecording(false);
      Toast.show({
        type: 'error',
        text1: t('cam.captureFailed'),
        text2: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const onShutter = () => {
    if (captureMode === 'video') {
      if (recording) stopVideo();
      else void startVideo();
      return;
    }
    void takePhoto();
  };

  const pickFromLibrary = async () => {
    if (recording || capturing || picking) return;
    if (!(await hasActivePremium())) {
      setCanUploadLibrary(false);
      Toast.show({ type: 'info', text1: t('premium.benefitLocked'), text2: t('premium.feat.library') });
      return;
    }
    if (Platform.OS !== 'web') {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') {
        Toast.show({ type: 'error', text1: t('cam.libraryDenied') });
        return;
      }
    }
    try {
      setPicking(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        quality: 0.85,
        videoMaxDuration: VIDEO_MAX_SECONDS,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      if (!asset.uri) return;
      const nameFromUri = asset.uri.split('/').pop()?.split('?')[0];
      const mime = asset.mimeType || '';
      const looksVideo = asset.type === 'video'
        || asset.type === 'pairedVideo'
        || mime.startsWith('video/')
        || /\.(mp4|mov|webm|m4v)$/i.test(asset.fileName || nameFromUri || '');
      const kind: 'image' | 'video' = looksVideo ? 'video' : 'image';
      if (kind === 'video' && asset.duration != null) {
        const seconds = asset.duration > 1000 ? asset.duration / 1000 : asset.duration;
        if (seconds > VIDEO_MAX_SECONDS + 0.4) {
          Toast.show({ type: 'info', text1: t('cam.libraryVideoLong') });
          return;
        }
      }
      const fallbackName = kind === 'video' ? 'moment.mp4' : 'photo.jpg';
      const name = asset.fileName || (nameFromUri && nameFromUri.includes('.') ? nameFromUri : fallbackName);
      const type = kind === 'video'
        ? (mime.startsWith('video/') ? mime : 'video/mp4')
        : (mime.startsWith('image/') ? mime : 'image/jpeg');
      setUploadMeta({ name, type });
      setMediaKind(kind);
      setSelectedImageUri(asset.uri);
      setCaptured(true);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t('cam.captureFailed'),
        text2: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setPicking(false);
    }
  };

  const retake = () => {
    clearRecordTimer();
    setRecording(false);
    setRecordSeconds(0);
    setCaptured(false);
    setSelectedImageUri(null);
    setUploadMeta(null);
    setMediaKind('image');
    setCaption('');
    setBlockedNotice(null);
    setCameraReady(false);
  };

  const handlePostNow = async () => {
    if (!selectedImageUri) {
      Toast.show({
        type: 'error',
        text1: t('cam.noImage') || 'Chưa chụp ảnh',
        text2: t('cam.chooseImageFirst') || 'Chụp ảnh trước khi đăng.',
      });
      return;
    }

    try {
      setPosting(true);

      let latitude = currentLocation?.latitude ?? nearestPlace?.latitude;
      let longitude = currentLocation?.longitude ?? nearestPlace?.longitude;

      if (latitude === undefined || longitude === undefined || !locationGranted) {
        const loc = await ensureLocationForPosting();
        if (!loc.ok) {
          Toast.show({
            type: 'error',
            text1: t('cam.locationRequired') || 'Cần bật vị trí để đăng bài',
            text2:
              loc.reason === 'denied'
                ? (t('cam.locationDenied') || 'Hãy cho phép vị trí trong trình duyệt/cài đặt máy.')
                : (t('cam.locationRequiredDesc') || 'Không lấy được tọa độ. Thử lại sau khi bật định vị.'),
          });
          setPosting(false);
          return;
        }
        latitude = loc.coords.latitude;
        longitude = loc.coords.longitude;
        setCurrentLocation(loc.coords);
        onLocationEnabled();
        try {
          const places = await getNearbyPlaces(latitude, longitude);
          setNearestPlace(pickClosestPlace(places));
        } catch {
          // coords alone are enough to post
        }
      }

      const imageUri = mediaKind === 'video' || beautyFilter === 'none'
        ? selectedImageUri
        : await bakeFilteredJpeg(selectedImageUri, getBeautyFilter(beautyFilter).matrix);
      const fileName = uploadMeta?.name
        || (mediaKind === 'video' ? 'moment.mp4' : (imageUri.split('/').pop() || 'photo.jpg'));
      const fileType = uploadMeta?.type
        || (mediaKind === 'video'
          ? 'video/mp4'
          : (fileName.includes('.') ? `image/${fileName.split('.').pop()}` : 'image/jpeg'));
      const formData = await buildImageFormData(imageUri, fileName, fileType);

      const uploadResult = await uploadMedia(formData);
      if (!uploadResult || !uploadResult.id) {
        throw new Error('Media upload returned invalid id');
      }
      const mediaId = uploadResult.id;
      const placeId = nearestPlace?.id;

      const payload: Record<string, unknown> = {
        caption: caption.trim(),
        postType: mediaKind === 'video' ? 'Video' : 'Image',
        visibility,
        mediaIds: [mediaId],
        latitude: Math.round(latitude * 1e6) / 1e6,
        longitude: Math.round(longitude * 1e6) / 1e6,
      };

      if (visibility === 'Anonymous') {
        payload.anonymousAlias = anonymousAlias.trim() || pickRandomAlias();
      }

      if (placeId) {
        payload.placeId = placeId;
      }

      await createPost(payload);
      DeviceEventEmitter.emit('post:created');

      Toast.show({ type: 'success', text1: t('cam.posted'), text2: t('cam.postedDesc') });
      setPosting(false);
      close();
    } catch (error) {
      setPosting(false);
      if (isContentRejected(error)) {
        const notice = t('moderation.body');
        setBlockedNotice(notice);
        Toast.show({ type: 'error', text1: t('moderation.title'), text2: notice, visibilityTime: 6500 });
        return;
      }
      Toast.show({ type: 'error', text1: String(error instanceof Error ? error.message : 'Upload failed') });
    }
  };

  const locationLabel = resolvingPlace
    ? (t('cam.locating') || 'Đang định vị...')
    : nearestPlace?.name || t('cam.live') || 'Vị trí trực tiếp đang bật';

  const permissionLoading = !permission;
  const permissionDenied = permission && !permission.granted;

  return (
    <Modal transparent={false} animationType="none" statusBarTranslucent>
      <KeyboardAvoidingView
        style={styles.keyboardRoot}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      <Animated.View style={[styles.container, { transform: [{ translateY: slideAnim }] }]}>
        <LinearGradient colors={['#F4C4F1', '#DA70D6', '#FFF7FD']} style={StyleSheet.absoluteFill} />
        <View pointerEvents="none" style={styles.blingLayer}>
          <View style={[styles.glowOrb, styles.glowOrbTop]} />
          <View style={[styles.glowOrb, styles.glowOrbBottom]} />
          <Text style={[styles.bling, styles.blingOne]}>✦</Text>
          <Text style={[styles.bling, styles.blingTwo]}>✧</Text>
          <Text style={[styles.bling, styles.blingThree]}>⋆</Text>
        </View>

        <View style={styles.topBar}>
          <TouchableOpacity onPress={close} style={styles.topBtn}>
            <Ionicons name="close" size={22} color={Colors.white} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={locationGranted ? undefined : enableLocationFromCamera}
            activeOpacity={locationGranted ? 1 : 0.85}
            style={styles.locationBadge}
            disabled={locationGranted}
          >
            <Ionicons name="location" size={12} color={Colors.primaryLight} />
            <Text style={styles.locationText}>
              {locationGranted ? locationLabel : t('cam.locOffTap') || t('cam.locOff')}
            </Text>
          </TouchableOpacity>
          {canUploadLibrary && !captured ? (
            <TouchableOpacity
              onPress={() => { void pickFromLibrary(); }}
              style={styles.topLibraryBtn}
              disabled={picking || recording}
              activeOpacity={0.85}
            >
              {picking ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Ionicons name="images-outline" size={16} color={Colors.white} />
              )}
              <Text style={styles.topLibraryText}>{t('cam.uploadLibrary')}</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.topBtnSpacer} />
          )}
        </View>

        <View style={styles.viewfinder}>
          {permissionLoading && (
            <View style={styles.permissionBox}>
              <ActivityIndicator color={Colors.primaryLight} size="large" />
              <Text style={styles.permissionText}>{t('cam.requestingPermission')}</Text>
            </View>
          )}

          {permissionDenied && (
            <View style={styles.permissionBox}>
              <Ionicons name="camera-outline" size={40} color={Colors.primaryLight} />
              <Text style={styles.permissionTitle}>{t('cam.cameraPermission')}</Text>
              <Text style={styles.permissionText}>{t('cam.cameraPermissionDesc')}</Text>
              <TouchableOpacity onPress={requestPermission} activeOpacity={0.88} style={styles.permissionBtn}>
                <LinearGradient colors={Gradients.primary} style={styles.permissionBtnGrad}>
                  <Text style={styles.permissionBtnText}>{t('cam.allowCamera')}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {permission?.granted && !captured && (
            <>
              <CameraView
                ref={cameraRef}
                style={StyleSheet.absoluteFill}
                facing={facing}
                mode={captureMode === 'video' ? 'video' : 'picture'}
                mirror={facing === 'front'}
                onCameraReady={() => setCameraReady(true)}
              />
              {beautyFilter !== 'none' && (
                <View
                  pointerEvents="none"
                  style={[styles.beautyOverlay, { backgroundColor: getBeautyFilter(beautyFilter).overlay }]}
                />
              )}
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
              <View style={styles.facingBadge}>
                <Ionicons
                  name={facing === 'front' ? 'person-outline' : 'phone-portrait-outline'}
                  size={12}
                  color={Colors.white}
                />
                <Text style={styles.facingBadgeText}>
                  {facing === 'front' ? t('cam.frontCamera') : t('cam.backCamera')}
                </Text>
              </View>
              {!cameraReady && (
                <View style={styles.readyOverlay}>
                  <ActivityIndicator color={Colors.white} />
                </View>
              )}
            </>
          )}

          {captured && selectedImageUri && (
            <>
              {mediaKind === 'video' ? (
                <View style={[StyleSheet.absoluteFill, styles.videoReady]}>
                  <Ionicons name="videocam" size={42} color={Colors.white} />
                  <Text style={styles.videoReadyText}>{t('cam.videoReady')}</Text>
                </View>
              ) : (
                <FilteredPhoto uri={selectedImageUri} filterId={beautyFilter} />
              )}
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.82)']}
                style={styles.captionGradient}
              />
              <View style={styles.captionComposer}>
                <TextInput
                  style={styles.captionInput}
                  value={caption}
                  onChangeText={text => {
                    setCaption(text.slice(0, CAPTION_MAX));
                    setBlockedNotice(null);
                  }}
                  placeholder={t('cam.captionPlaceholder')}
                  placeholderTextColor="rgba(255,255,255,0.55)"
                  multiline
                  maxLength={CAPTION_MAX}
                  autoFocus
                  returnKeyType="done"
                  blurOnSubmit
                />
                <Text style={styles.captionCounter}>
                  {caption.length}/{CAPTION_MAX}
                </Text>
              </View>
            </>
          )}

          {locationGranted && !captured && permission?.granted && (
            <View style={styles.geoTag}>
              <Ionicons name="location" size={13} color={Colors.primaryLight} />
              <Text style={styles.geoTagText}>
                {nearestPlace?.name || t('cam.live')} · {t('common.now')}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.controls}>
          {!captured ? (
            <>
              {showBeautyPanel && (
                <FilterStrip
                  selectedId={beautyFilter}
                  onSelect={id => {
                    setBeautyFilter(id);
                    Toast.show({
                      type: 'success',
                      text1: t('cam.filter'),
                      text2: t(getBeautyFilter(id).labelKey),
                    });
                  }}
                />
              )}
              <View style={styles.modeRow}>
                <TouchableOpacity
                  onPress={() => { void chooseMode('photo'); }}
                  style={[styles.modeChip, captureMode === 'photo' && styles.modeChipActive]}
                >
                  <Text style={styles.modeChipText}>{t('cam.photo')}</Text>
                </TouchableOpacity>
                {canUploadLibrary ? (
                  <TouchableOpacity
                    onPress={() => { void chooseMode('video'); }}
                    style={[styles.modeChip, captureMode === 'video' && styles.modeChipActive]}
                  >
                    <Text style={styles.modeChipText}>{t('cam.video')}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              {recording ? (
                <Text style={styles.recordLabel}>{t('cam.recording')} {recordSeconds}s</Text>
              ) : null}
              <View style={styles.captureRow}>
                <TouchableOpacity
                  onPress={() => setShowBeautyPanel(open => !open)}
                  style={[styles.controlBtn, showBeautyPanel && styles.controlBtnActive]}
                >
                  <Ionicons name="sparkles" size={22} color={Colors.white} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={onShutter}
                  style={[styles.shutterOuter, (!cameraReady || capturing || permissionDenied) && styles.shutterDisabled]}
                  activeOpacity={0.85}
                  disabled={!cameraReady || capturing || !!permissionDenied}
                >
                  {capturing ? (
                    <ActivityIndicator color={Colors.primary} size="large" />
                  ) : (
                    <LinearGradient
                      colors={captureMode === 'video' ? ['#F43F5E', '#E11D48'] : Gradients.primary}
                      style={[styles.shutterInner, recording && styles.shutterRecording]}
                    />
                  )}
                </TouchableOpacity>
                <TouchableOpacity onPress={flipCamera} style={styles.controlBtn} disabled={permissionDenied}>
                  <Ionicons name="camera-reverse-outline" size={22} color={Colors.white} />
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.postActions}>
              <View style={styles.visibilityRow}>
                <TouchableOpacity
                  onPress={() => setVisibility('Public')}
                  style={[styles.visibilityChip, visibility === 'Public' && styles.visibilityChipActive]}
                >
                  <Ionicons name="earth-outline" size={14} color={visibility === 'Public' ? Colors.white : Colors.primary} />
                  <Text style={[styles.visibilityText, visibility === 'Public' && styles.visibilityTextActive]}>
                    {t('cam.visibilityPublic')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setVisibility('Friends')}
                  style={[styles.visibilityChip, visibility === 'Friends' && styles.visibilityChipActive]}
                >
                  <Ionicons name="people-outline" size={14} color={visibility === 'Friends' ? Colors.white : Colors.primary} />
                  <Text style={[styles.visibilityText, visibility === 'Friends' && styles.visibilityTextActive]}>
                    {t('cam.visibilityFriends')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setVisibility('Private')}
                  style={[styles.visibilityChip, visibility === 'Private' && styles.visibilityChipActive]}
                >
                  <Ionicons name="lock-closed-outline" size={14} color={visibility === 'Private' ? Colors.white : Colors.primary} />
                  <Text style={[styles.visibilityText, visibility === 'Private' && styles.visibilityTextActive]}>
                    {t('cam.visibilityPrivate')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    void (async () => {
                      if (!(await hasActivePremium())) {
                        Toast.show({ type: 'info', text1: t('premium.benefitLocked'), text2: t('premium.feat.anonymous') });
                        return;
                      }
                      setVisibility('Anonymous');
                      setAnonymousAlias(pickRandomAlias());
                    })();
                  }}
                  style={[styles.visibilityChip, visibility === 'Anonymous' && styles.visibilityChipActive]}
                >
                  <Ionicons name="eye-off-outline" size={14} color={visibility === 'Anonymous' ? Colors.white : Colors.primary} />
                  <Text style={[styles.visibilityText, visibility === 'Anonymous' && styles.visibilityTextActive]}>
                    {t('cam.visibilityAnonymous')}
                  </Text>
                </TouchableOpacity>
              </View>
              {visibility === 'Anonymous' && (
                <View style={styles.aliasRow}>
                  <TextInput
                    style={styles.aliasInput}
                    value={anonymousAlias}
                    onChangeText={text => {
                      setAnonymousAlias(text);
                      setBlockedNotice(null);
                    }}
                    placeholder={t('cam.aliasPlaceholder')}
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    maxLength={32}
                  />
                  <TouchableOpacity
                    onPress={() => setAnonymousAlias(pickRandomAlias())}
                    style={styles.aliasShuffleBtn}
                  >
                    <Ionicons name="shuffle" size={18} color={Colors.white} />
                  </TouchableOpacity>
                </View>
              )}
              {blockedNotice ? <ContentRejectedBanner message={blockedNotice} onDark /> : null}
              <TouchableOpacity
                onPress={handlePostNow}
                activeOpacity={0.85}
                style={[styles.postBtn, posting && styles.postBtnDisabled]}
                disabled={posting}
              >
                <LinearGradient colors={Gradients.primary} style={styles.postBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Ionicons name="send" size={16} color={Colors.white} />
                  <Text style={styles.postBtnText}>{posting ? t('cam.uploading') || 'Uploading...' : t('cam.postNow')}</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity onPress={retake} style={styles.retakeBtn}>
                <Text style={styles.retakeBtnText}>{t('common.retake')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const CORNER_SIZE = 24;
const CORNER_THICKNESS = 3;

const styles = StyleSheet.create({
  keyboardRoot: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#F2D2F0',
  },
  blingLayer: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  glowOrb: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(255,255,255,0.2)',
    shadowColor: '#FFFFFF',
    shadowOpacity: 0.7,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 0 },
  },
  glowOrbTop: { top: -80, right: -55 },
  glowOrbBottom: { bottom: -70, left: -65 },
  bling: {
    position: 'absolute',
    color: 'rgba(255,255,255,0.94)',
    textShadowColor: 'rgba(255,255,255,0.95)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  blingOne: { top: 44, left: 78, fontSize: 20 },
  blingTwo: { top: 104, right: 42, fontSize: 15 },
  blingThree: { bottom: 72, left: 46, fontSize: 18 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: (StatusBar.currentHeight ?? 44) + 8,
    paddingBottom: 12,
  },
  topBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.28)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBtnSpacer: {
    width: 42,
    height: 42,
  },
  topLibraryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 42,
    paddingHorizontal: 12,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.28)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  topLibraryText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '800',
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.28)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    maxWidth: '55%',
  },
  locationText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: '600',
  },
  viewfinder: {
    flex: 1,
    marginHorizontal: 16,
    borderRadius: 36,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#4F2852',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.62)',
    shadowColor: '#C04BB8',
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
  },
  permissionBox: {
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 28,
  },
  permissionTitle: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  permissionText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 18,
  },
  permissionBtn: {
    marginTop: 6,
    borderRadius: 999,
    overflow: 'hidden',
    ...Shadows.glow,
  },
  permissionBtnGrad: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  permissionBtnText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '800',
  },
  readyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26,15,51,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  facingBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(30,15,60,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  facingBadgeText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  cornerTL: {
    top: 16, left: 16,
    borderTopWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS,
    borderTopLeftRadius: 8,
  },
  cornerTR: {
    top: 16, right: 16,
    borderTopWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS,
    borderTopRightRadius: 8,
  },
  cornerBL: {
    bottom: 16, left: 16,
    borderBottomWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS,
    borderBottomLeftRadius: 8,
  },
  cornerBR: {
    bottom: 16, right: 16,
    borderBottomWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS,
    borderBottomRightRadius: 8,
  },
  captionGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '48%',
  },
  captionComposer: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 56,
    alignItems: 'center',
    gap: 8,
  },
  captionInput: {
    width: '100%',
    minHeight: 48,
    maxHeight: 120,
    color: Colors.white,
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  captionCounter: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11,
    fontWeight: '600',
  },
  geoTag: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(30,15,60,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    maxWidth: '58%',
  },
  geoTagText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: '600',
  },
  controls: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    paddingTop: 16,
  },
  captureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  modeRow: {
    flexDirection: 'row',
    alignSelf: 'center',
    gap: 8,
    marginBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderRadius: 999,
    padding: 4,
  },
  modeChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  modeChipActive: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  modeChipText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '800',
  },
  recordLabel: {
    color: '#FBCFE8',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 8,
  },
  videoReady: {
    backgroundColor: '#2A1740',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  videoReadyText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '800',
  },
  shutterRecording: {
    borderRadius: 8,
    width: 28,
    height: 28,
  },
  controlBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlBtnActive: {
    backgroundColor: 'rgba(156,124,255,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  beautyRow: {
    gap: 8,
    paddingBottom: 14,
    paddingHorizontal: 4,
  },
  beautyChip: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minWidth: 64,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  beautyChipActive: {
    backgroundColor: 'rgba(122,88,218,0.7)',
    borderColor: 'rgba(255,255,255,0.82)',
  },
  beautySwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  beautyEmoji: {
    fontSize: 16,
  },
  beautyChipText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    fontWeight: '700',
  },
  beautyChipTextActive: {
    color: Colors.white,
  },
  beautyOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  shutterOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.glow,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  shutterDisabled: {
    opacity: 0.55,
  },
  shutterInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  postActions: {
    gap: 10,
  },
  visibilityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  visibilityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  visibilityChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  visibilityText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.white,
  },
  visibilityTextActive: {
    color: Colors.white,
  },
  aliasRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  aliasInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  aliasShuffleBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  postBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    ...Shadows.glow,
  },
  postBtnDisabled: {
    opacity: 0.5,
  },
  postBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  postBtnText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
  retakeBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  retakeBtnText: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    fontWeight: '600',
  },
});
